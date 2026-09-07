"""
AgroPredict RAG Knowledge Base
Uses ChromaDB for vector storage and HuggingFace embeddings for semantic search.
Includes robust fallback for keyword-based search.
"""
import json
import os
import hashlib

try:
    import chromadb
    CHROMADB_AVAILABLE = True
except Exception:
    CHROMADB_AVAILABLE = False
    print("[WARN] chromadb not available, using fallback search")

try:
    from sentence_transformers import SentenceTransformer
    EMBEDDINGS_AVAILABLE = True
except Exception:
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
        """Load knowledge documents and build vector store."""
        print("[RAG] Initializing knowledge base...")
        self._load_documents()
        print(f"[RAG] Loaded {len(self.documents)} knowledge chunks")

        if CHROMADB_AVAILABLE and EMBEDDINGS_AVAILABLE:
            try:
                self._build_vector_store()
            except Exception as e:
                print(f"[WARN] ChromaDB initialization failed ({e}), using keyword fallback")
                self.collection = None
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
                    f"Crop: {d.get('crop', '')}. Disease: {d.get('disease', '')}. "
                    f"Symptoms: {d.get('symptoms', '')} "
                    f"Cause: {d.get('cause', '')} "
                    f"Treatment: {d.get('treatment', '')} "
                    f"Prevention: {d.get('prevention', '')}"
                )
                self.documents.append({
                    'text': text,
                    'metadata': {'source': 'crop_diseases', 'crop': d.get('crop', ''), 'disease': d.get('disease', '')},
                    'id': hashlib.md5(text[:100].encode()).hexdigest()
                })

        # Farming practices
        practices_path = os.path.join(KNOWLEDGE_DIR, 'farming_practices.json')
        if os.path.exists(practices_path):
            with open(practices_path, 'r', encoding='utf-8') as f:
                practices = json.load(f)
            for p in practices:
                text = f"Topic: {p.get('topic', '')}. {p.get('content', '')}"
                self.documents.append({
                    'text': text,
                    'metadata': {'source': 'farming_practices', 'topic': p.get('topic', '')},
                    'id': hashlib.md5(text[:100].encode()).hexdigest()
                })

        # Government schemes
        schemes_path = os.path.join(KNOWLEDGE_DIR, 'government_schemes.json')
        if os.path.exists(schemes_path):
            with open(schemes_path, 'r', encoding='utf-8') as f:
                schemes = json.load(f)
            for s in schemes:
                text = (
                    f"Government Scheme: {s.get('scheme', '')}. "
                    f"Benefit: {s.get('benefit', '')} "
                    f"Eligibility: {s.get('eligibility', '')} "
                    f"How to apply: {s.get('howToApply', '')} "
                    f"Coverage: {s.get('coverage', '')}"
                )
                self.documents.append({
                    'text': text,
                    'metadata': {'source': 'government_schemes', 'scheme': s.get('scheme', '')},
                    'id': hashlib.md5(text[:100].encode()).hexdigest()
                })

        # Irrigation guide
        irrigation_path = os.path.join(KNOWLEDGE_DIR, 'irrigation_guide.json')
        if os.path.exists(irrigation_path):
            with open(irrigation_path, 'r', encoding='utf-8') as f:
                guides = json.load(f)
            for g in guides:
                text = f"Topic: {g.get('topic', '')}. {g.get('content', '')}"
                self.documents.append({
                    'text': text,
                    'metadata': {'source': 'irrigation_guide', 'topic': g.get('topic', '')},
                    'id': hashlib.md5(text[:100].encode()).hexdigest()
                })

        # App help / how-to-use content
        app_help_path = os.path.join(KNOWLEDGE_DIR, 'app_help.json')
        if os.path.exists(app_help_path):
            with open(app_help_path, 'r', encoding='utf-8') as f:
                help_items = json.load(f)
            for h in help_items:
                text = f"Topic: {h.get('topic', '')}. {h.get('content', '')}"
                self.documents.append({
                    'text': text,
                    'metadata': {'source': 'app_help', 'topic': h.get('topic', '')},
                    'id': hashlib.md5(text[:100].encode()).hexdigest()
                })

        # Buyer Directory & Contract Linkage (Phase 4.3)
        buyer_dir_path = os.path.join(BASE_DIR, 'data', 'buyer_directory.json')
        if os.path.exists(buyer_dir_path):
            with open(buyer_dir_path, 'r', encoding='utf-8') as f:
                buyers_by_crop = json.load(f)
            for crop_name, states in buyers_by_crop.items():
                for state_name, buyer_list in states.items():
                    for b in buyer_list:
                        text = (
                            f"Crop: {crop_name}. State: {state_name}. Buyer Name: {b.get('buyerName', '')}. "
                            f"Type: {b.get('buyerType', '')}. Price per quintal: ₹{b.get('pricePerQuintal', 0)}. "
                            f"Min Quantity: {b.get('minimumQuantityQuintal', 0)} quintals. Location: {b.get('location', '')}. "
                            f"Contact: {b.get('contactInfo', '')}. Benefit: {b.get('benefits', '')}"
                        )
                        self.documents.append({
                            'text': text,
                            'metadata': {'source': 'buyer_directory', 'crop': crop_name, 'state': state_name, 'buyer': b.get('buyerName', '')},
                            'id': hashlib.md5(text[:100].encode()).hexdigest()
                        })

    def _build_vector_store(self):
        """Build ChromaDB collection with HuggingFace embeddings."""
        print("[RAG] Loading embedding model...")
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

        os.makedirs(CHROMA_DIR, exist_ok=True)
        try:
            client = chromadb.PersistentClient(path=CHROMA_DIR)
        except Exception:
            client = chromadb.Client()

        self.collection = client.get_or_create_collection(
            name="farm_knowledge",
            metadata={"description": "AgroPredict agricultural knowledge base"}
        )

        existing = self.collection.count()
        if existing >= len(self.documents):
            print(f"[RAG] ChromaDB has {existing} documents, ready.")
            return

        print(f"[RAG] Embedding {len(self.documents)} documents...")
        texts = [doc['text'] for doc in self.documents]
        embeddings = self.embedding_model.encode(texts, show_progress_bar=False).tolist()

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
        """Search knowledge base for relevant documents with soft filtering and distance thresholding."""
        if not self.initialized:
            self.initialize()

        if self.collection is not None and self.embedding_model is not None:
            try:
                query_embedding = self.embedding_model.encode([query]).tolist()
                
                # Only apply hard where filter if crop_filter is explicitly mentioned in the query
                query_lower = query.lower()
                where_filter = None
                if crop_filter and crop_filter.lower() in query_lower:
                    where_filter = {"crop": crop_filter.lower()}

                results = self.collection.query(
                    query_embeddings=query_embedding,
                    n_results=min(n_results, max(1, self.collection.count())),
                    where=where_filter
                )

                documents = []
                if results and results.get('documents') and len(results['documents']) > 0:
                    for i, doc in enumerate(results['documents'][0]):
                        distance = results['distances'][0][i] if results.get('distances') and len(results['distances'][0]) > i else 0
                        # Distance threshold for relevance (filter out low-relevance matches > 1.25)
                        if distance > 1.25:
                            continue
                        documents.append({
                            'text': doc,
                            'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                            'distance': distance
                        })
                    if documents:
                        return documents
            except Exception as e:
                print(f"[RAG] ChromaDB search exception ({e}), using keyword fallback")

        return self._keyword_search(query, n_results, crop_filter)

    def _keyword_search(self, query, n_results=5, crop_filter=None):
        """Enhanced keyword-based search with stopword filtering and intent boosting."""
        import re
        stopwords = {'what', 'should', 'i', 'need', 'to', 'do', 'before', 'my', 'a', 'the', 'for', 'in', 'on', 'of', 'is', 'are', 'can', 'how', 'which', 'will', 'about', 'get', 'give'}
        raw_words = [w.strip('?,.!') for w in query.lower().split()]
        meaningful_words = [w for w in raw_words if w and w not in stopwords and len(w) > 2]
        if not meaningful_words:
            meaningful_words = raw_words

        query_lower = query.lower()
        scored = []

        for doc in self.documents:
            if crop_filter and doc['metadata'].get('crop', '').lower() != crop_filter.lower():
                continue

            text_lower = doc['text'].lower()
            score = 0.0

            # Base keyword occurrences - whole-word match only (avoids false positives like
            # "use" matching inside "cause", or "app" matching inside "happy")
            for word in meaningful_words:
                if re.search(r'\b' + re.escape(word) + r'\b', text_lower):
                    score += 1.5

            # Intent phrase boosting
            if 'before planting' in query_lower or 'land prep' in query_lower or 'field prep' in query_lower or 'sowing prep' in query_lower:
                if 'pre-planting' in text_lower or 'land preparation' in text_lower or 'seed treatment' in text_lower:
                    score += 5.0
            if 'crops suit' in query_lower or 'which crop' in query_lower or 'best crops' in query_lower:
                if 'crop:' in text_lower or 'soil health' in text_lower or 'nutrient management' in text_lower:
                    score += 4.0
            if any(p in query_lower for p in ['use this app', 'how does this app', 'what can you do', 'what is this app', 'about this app', 'help me use', 'how to use', 'how do i use']):
                if doc['metadata'].get('source') == 'app_help':
                    score += 6.0
            if any(p in query_lower for p in ['disease', 'photo', 'picture', 'image', 'camera', 'scan', 'diagnos']) and 'diagnose a plant disease from a photo' in text_lower:
                score += 3.0
            if any(p in query_lower for p in ['sell', 'buyer', 'company', 'contract farming', 'best price', 'msp', 'purchaser', 'trader']):
                if doc['metadata'].get('source') == 'buyer_directory':
                    score += 8.0
            if any(p in query_lower for p in ['loan', 'credit', 'subsidy', 'scheme', 'eligible', 'pm-kisan', 'kisan credit', 'pmfby', 'insurance', 'government', 'drip subsidy']):
                if doc['metadata'].get('source') == 'government_schemes':
                    score += 8.0

            if score > 0:
                scored.append({
                    'text': doc['text'],
                    'metadata': doc['metadata'],
                    'distance': 1.0 / (score + 1.0)
                })

        scored.sort(key=lambda x: x['distance'])
        if not scored and self.documents:
            # No keyword match at all - fall back to general app-overview content
            # (NEVER fall back to disease/crop-specific docs here, since that falsely implies relevance)
            overview = [d for d in self.documents if d['metadata'].get('source') == 'app_help']
            if overview:
                return [{'text': d['text'], 'metadata': d['metadata'], 'distance': 0.9} for d in overview[:n_results]]
            return []

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
