"""
FarmSense AI Chat — LangChain + Gemini + RAG
Provides context-aware farming advice using RAG retrieval and LLM generation.
"""
import os
import json

# Try to import LangChain + Gemini
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain.prompts import ChatPromptTemplate
    from langchain.schema import HumanMessage, SystemMessage
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    print("[CHAT] LangChain/Gemini not fully available")

from rag.knowledge_base import KnowledgeBase

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# System prompt engineered for Indian farming context
SYSTEM_PROMPT = """You are FarmSense AI, an expert agricultural advisor for Indian farmers.
You provide practical, actionable farming advice based on the farmer's specific conditions.

IMPORTANT RULES:
1. Always give advice specific to the farmer's location, soil, and weather conditions when available.
2. Use simple language that a farmer can understand. Avoid complex scientific jargon.
3. Include specific product names, dosages, and application methods when recommending treatments.
4. Mention costs in Indian Rupees and quantities in local units (kg/acre, litres/acre).
5. Always suggest both chemical AND organic/natural alternatives.
6. Mention relevant government schemes if applicable.
7. If asked about crops, consider the current season and local growing conditions.
8. Be encouraging and supportive — farming is hard work.
9. Keep responses concise but complete — aim for 3-5 key points.
10. If you don't know something specific, say so rather than guessing.

You have access to a knowledge base of crop diseases, farming practices, government schemes, 
and irrigation guides. Use the retrieved context to give accurate advice."""

RESPONSE_PROMPT = """Based on the farmer's question and the relevant agricultural knowledge below, 
provide helpful farming advice.

FARMER'S CONTEXT:
- Location: {location}
- Soil Type: {soil_type}, pH: {soil_ph}
- Current Temperature: {temperature}C, Humidity: {humidity}%
- Recent Rainfall (7 days): {rainfall}mm
- Crops Growing: {crops}

RELEVANT KNOWLEDGE FROM DATABASE:
{rag_context}

FARMER'S QUESTION: {question}

Provide a helpful, practical response. Include specific recommendations with dosages where relevant.
If the question is about a disease, describe symptoms to confirm, then give treatment AND prevention.
If the question is about what to plant, consider soil type, season, and location.
Respond in the same language the farmer used (English, Hindi, or Tamil)."""


class FarmChat:
    def __init__(self):
        self.knowledge_base = KnowledgeBase()
        self.llm = None
        self.initialized = False

    def initialize(self):
        """Initialize knowledge base and LLM."""
        # Initialize knowledge base (ChromaDB + embeddings)
        self.knowledge_base.initialize()

        # Initialize LLM
        gemini_key = os.environ.get('GEMINI_API_KEY', '')
        if gemini_key and LANGCHAIN_AVAILABLE:
            try:
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-2.0-flash",
                    google_api_key=gemini_key,
                    temperature=0.7,
                    max_output_tokens=1024
                )
                print("[CHAT] Gemini LLM initialized")
            except Exception as e:
                print(f"[CHAT] Gemini init failed: {e}")
                self.llm = None
        else:
            print("[CHAT] No GEMINI_API_KEY found - using RAG-only mode (retrieval without generation)")

        self.initialized = True

    def chat(self, query, farm_context=None):
        """Process a chat query with RAG retrieval and LLM generation."""
        if not self.initialized:
            self.initialize()

        # Extract crop filter from context or query
        crop_filter = None
        if farm_context and farm_context.get('crops'):
            crops = farm_context['crops']
            if isinstance(crops, list) and len(crops) > 0:
                crop_filter = crops[0] if isinstance(crops[0], str) else crops[0].get('crop', None)

        # RAG: Retrieve relevant documents
        rag_results = self.knowledge_base.search(query, n_results=4, crop_filter=crop_filter)
        rag_context = "\n\n".join([
            f"[Source: {r['metadata'].get('source', 'unknown')}] {r['text']}"
            for r in rag_results
        ])

        # Build context from farm data
        location = "Not specified"
        soil_type = "Not specified"
        soil_ph = "N/A"
        temperature = "N/A"
        humidity = "N/A"
        rainfall = "N/A"
        crops_str = "Not specified"

        if farm_context:
            location = f"{farm_context.get('district', '')}, {farm_context.get('state', '')}".strip(', ')
            soil_type = farm_context.get('soil_type', 'Not specified')
            soil_ph = farm_context.get('soil_ph', 'N/A')
            temperature = farm_context.get('temperature', 'N/A')
            humidity = farm_context.get('humidity', 'N/A')
            rainfall = farm_context.get('rainfall', 'N/A')
            crops_list = farm_context.get('crops', [])
            if isinstance(crops_list, list):
                crops_str = ", ".join([
                    c if isinstance(c, str) else c.get('crop', c.get('name', 'unknown'))
                    for c in crops_list[:5]
                ]) or "Not specified"

        # Generate response
        if self.llm and LANGCHAIN_AVAILABLE:
            return self._generate_with_llm(
                query, rag_context, location, soil_type, soil_ph,
                temperature, humidity, rainfall, crops_str, rag_results
            )
        else:
            return self._generate_without_llm(query, rag_results, farm_context)

    def _generate_with_llm(self, query, rag_context, location, soil_type, soil_ph,
                           temperature, humidity, rainfall, crops_str, rag_results):
        """Generate response using Gemini LLM with RAG context."""
        try:
            prompt = RESPONSE_PROMPT.format(
                location=location, soil_type=soil_type, soil_ph=soil_ph,
                temperature=temperature, humidity=humidity, rainfall=rainfall,
                crops=crops_str, rag_context=rag_context, question=query
            )

            messages = [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=prompt)
            ]

            response = self.llm.invoke(messages)
            answer = response.content

            return {
                'answer': answer,
                'sources': [r['metadata'] for r in rag_results],
                'mode': 'llm+rag',
                'model': 'gemini-2.0-flash'
            }
        except Exception as e:
            print(f"[CHAT] LLM generation error: {e}")
            return self._generate_without_llm(query, rag_results, None)

    def _generate_without_llm(self, query, rag_results, farm_context):
        """Generate response from RAG results without LLM (fallback mode)."""
        if not rag_results:
            return {
                'answer': "I couldn't find specific information about that in my knowledge base. "
                         "Please try asking about crop diseases, farming practices, irrigation, "
                         "or government schemes for farmers.",
                'sources': [],
                'mode': 'fallback'
            }

        # Format the best matching results into a readable answer
        best = rag_results[0]
        source = best['metadata'].get('source', 'unknown')

        if source == 'crop_diseases':
            # Parse disease info from the text
            text = best['text']
            answer = f"Based on my knowledge base:\n\n{text}\n\n"
            if len(rag_results) > 1:
                answer += "Related information:\n"
                for r in rag_results[1:3]:
                    answer += f"- {r['text'][:200]}...\n"
        elif source == 'government_schemes':
            answer = f"Here's information about a relevant scheme:\n\n{best['text']}"
        else:
            answer = f"Here's what I found:\n\n{best['text']}"

        if farm_context:
            answer += f"\n\n(Based on your {farm_context.get('soil_type', 'soil')} soil conditions)"

        return {
            'answer': answer,
            'sources': [r['metadata'] for r in rag_results],
            'mode': 'rag-only'
        }

    def get_status(self):
        """Return chat system status."""
        return {
            'initialized': self.initialized,
            'llm_available': self.llm is not None,
            'llm_model': 'gemini-2.0-flash' if self.llm else None,
            'knowledge_base': self.knowledge_base.get_status() if self.initialized else None
        }
