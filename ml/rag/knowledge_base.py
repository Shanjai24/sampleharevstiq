"""
FarmSense RAG Knowledge Base
Uses ChromaDB for vector storage and HuggingFace embeddings for semantic search.
"""
import json
import os
import hashlib

try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    print("[WARN] chromadb not available, using fallback search")

try:
    from sentence_transformers import SentenceTransformer
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    print("[WARN] sentence-transformers not available, using fallback search")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KNOWLEDGE_DIR = os.path.join(BASE_DIR, 'data', 'knowledge')
CHROMA_DIR = os.path.join(BASE_DIR, 'chroma_db')


class KnowledgeBase:
    def __init__(self):
        self.documents = []
        self.collection = None
        self.embedding_model = None
        self.initialized = False

    def initialize(self):
        """Load knowledge documents and build ChromaDB vector store."""
        print("[RAG] Initializing knowledge base...")

        # Load all knowledge documents
        self._load_documents()
        print(f"[RAG] Loaded {len(self.documents)} knowledge chunks")

        if CHROMADB_AVAILABLE and EMBEDDINGS_AVAILABLE:
            self._build_vector_store()
        else:
            print("[RAG] Running in fallback mode (keyword search)")

        self.initialized = True
        print("[RAG] Knowledge base ready!")

    def _load_documents(self):
        """Load all JSON knowledge files into document chunks."""
        self.documents = []

        # Crop diseases
        diseases_path = os.path.join(KNOWLEDGE_DIR, 'crop_diseases.json')
        if os.path.exists(diseases_path):
            with open(diseases_path, 'r', encoding='utf-8') as f:
                diseases = json.load(f)
            for d in diseases:
                text = (
                    f"Crop: {d['crop']}. Disease: {d['disease']}. "
                    f"Symptoms: {d['symptoms']} "
                    f"Cause: {d['cause']} "
                    f"Treatment: {d['treatment']} "
                    f"Prevention: {d['prevention']}"
                )
                self.documents.append({
                    'text': text,
                    'metadata': {'source': 'crop_diseases', 'crop': d['crop'], 'disease': d['disease']},
                    'id': hashlib.md5(text[:100].encode()).hexdigest()
                })

        # Farming practices
        practices_path = os.path.join(KNOWLEDGE_DIR, 'farming_practices.json')
        if os.path.exists(practices_path):
            with open(practices_path, 'r', encoding='utf-8') as f:
                practices = json.load(f)
            for p in practices:
                text = f"Topic: {p['topic']}. {p['content']}"
                self.documents.append({
                    'text': text,
                    'metadata': {'source': 'farming_practices', 'topic': p['topic']},
                    'id': hashlib.md5(text[:100].encode()).hexdigest()
                })

        # Government schemes
        schemes_path = os.path.join(KNOWLEDGE_DIR, 'government_schemes.json')
        if os.path.exists(schemes_path):
            with open(schemes_path, 'r', encoding='utf-8') as f:
                schemes = json.load(f)
            for s in schemes:
                text = (
                    f"Government Scheme: {s['scheme']}. "
                    f"Benefit: {s['benefit']} "
                    f"Eligibility: {s['eligibility']} "
                    f"How to apply: {s['howToApply']} "
                    f"Coverage: {s['coverage']}"
                )
                self.documents.append({
                    'text': text,
                    'metadata': {'source': 'government_schemes', 'scheme': s['scheme']},
                    'id': hashlib.md5(text[:100].encode()).hexdigest()
                })

        # Irrigation guide
        irrigation_path = os.path.join(KNOWLEDGE_DIR, 'irrigation_guide.json')
        if os.path.exists(irrigation_path):
            with open(irrigation_path, 'r', encoding='utf-8') as f:
                guides = json.load(f)
            for g in guides:
                text = f"Topic: {g['topic']}. {g['content']}"
                self.documents.append({
                    'text': text,
                    'metadata': {'source': 'irrigation_guide', 'topic': g['topic']},
                    'id': hashlib.md5(text[:100].encode()).hexdigest()
                })

    def _build_vector_store(self):
        """Build ChromaDB collection with HuggingFace embeddings."""
        print("[RAG] Loading embedding model (this may take a minute first time)...")
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

        # Create/open ChromaDB
        os.makedirs(CHROMA_DIR, exist_ok=True)
        client = chromadb.Client(Settings(
            persist_directory=CHROMA_DIR,
            anonymized_telemetry=False
        ))

        # Create or get collection
        self.collection = client.get_or_create_collection(
            name="farm_knowledge",
            metadata={"description": "FarmSense agricultural knowledge base"}
        )

        # Check if we need to add documents
        existing = self.collection.count()
        if existing >= len(self.documents):
            print(f"[RAG] ChromaDB already has {existing} documents, skipping ingestion")
            return

        # Embed and add all documents
        print(f"[RAG] Embedding {len(self.documents)} documents...")
        texts = [doc['text'] for doc in self.documents]
        embeddings = self.embedding_model.encode(texts, show_progress_bar=True).tolist()

        # Add in batches
        batch_size = 50
        for i in range(0, len(self.documents), batch_size):
            batch = self.documents[i:i + batch_size]
            batch_embeddings = embeddings[i:i + batch_size]
            self.collection.add(
                documents=[d['text'] for d in batch],
                embeddings=batch_embeddings,
                metadatas=[d['metadata'] for d in batch],
                ids=[d['id'] for d in batch]
            )

        print(f"[RAG] ChromaDB populated with {self.collection.count()} documents")

    def search(self, query, n_results=5, crop_filter=None):
        """Search knowledge base for relevant documents."""
        if not self.initialized:
            self.initialize()

        # ChromaDB semantic search
        if self.collection is not None and self.embedding_model is not None:
            query_embedding = self.embedding_model.encode([query]).tolist()

            where_filter = None
            if crop_filter:
                where_filter = {"crop": crop_filter.lower()}

            try:
                results = self.collection.query(
                    query_embeddings=query_embedding,
                    n_results=min(n_results, self.collection.count()),
                    where=where_filter if where_filter else None
                )

                documents = []
                for i, doc in enumerate(results['documents'][0]):
                    documents.append({
                        'text': doc,
                        'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                        'distance': results['distances'][0][i] if results['distances'] else 0
                    })
                return documents
            except Exception as e:
                print(f"[RAG] ChromaDB search error: {e}, falling back to keyword search")

        # Fallback: keyword search
        return self._keyword_search(query, n_results, crop_filter)

    def _keyword_search(self, query, n_results=5, crop_filter=None):
        """Simple keyword-based search fallback."""
        query_words = set(query.lower().split())
        scored = []

        for doc in self.documents:
            if crop_filter and doc['metadata'].get('crop', '').lower() != crop_filter.lower():
                continue

            text_lower = doc['text'].lower()
            score = sum(1 for word in query_words if word in text_lower)

            if score > 0:
                scored.append({
                    'text': doc['text'],
                    'metadata': doc['metadata'],
                    'distance': 1.0 / (score + 1)
                })

        scored.sort(key=lambda x: x['distance'])
        return scored[:n_results]

    def get_status(self):
        """Return knowledge base status."""
        return {
            'initialized': self.initialized,
            'total_documents': len(self.documents),
            'vector_store': self.collection is not None,
            'embedding_model': self.embedding_model is not None,
            'chromadb_count': self.collection.count() if self.collection else 0
        }
