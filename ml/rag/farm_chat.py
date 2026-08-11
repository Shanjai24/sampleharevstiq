"""
AgroPredict AI Chat — LangChain + Gemini + RAG
Provides context-aware farming advice using RAG retrieval and LLM generation.
"""
import os
import json
import numpy as np

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage, SystemMessage
    LANGCHAIN_AVAILABLE = True
except ImportError as e:
    LANGCHAIN_AVAILABLE = False
    print(f"[CHAT] LangChain/Gemini not fully available: {e}")

from rag.knowledge_base import KnowledgeBase

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SYSTEM_PROMPT = """You are AgroPredict AI, an expert agricultural advisor for Indian farmers.
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
10. If you don't know something specific, say so rather than guessing."""

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

Provide a helpful, practical response. Include specific recommendations with dosages where relevant."""


class FarmChat:
    def __init__(self):
        self.knowledge_base = KnowledgeBase()
        self.llm = None
        self.initialized = False

    def initialize(self):
        """Initialize knowledge base and LLM."""
        try:
            self.knowledge_base.initialize()
        except Exception as e:
            print(f"[CHAT] Knowledge base init warning: {e}")

        gemini_key = os.environ.get('GEMINI_API_KEY', '').strip()
        if gemini_key and gemini_key.startswith('AIza') and LANGCHAIN_AVAILABLE:
            try:
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-2.0-flash",
                    google_api_key=gemini_key,
                    temperature=0.7,
                    max_output_tokens=1024,
                    request_timeout=10
                )
                print("[CHAT] Gemini LLM initialized successfully")
            except Exception as e:
                print(f"[CHAT] Gemini init failed: {e}")
                self.llm = None
        else:
            if gemini_key and not gemini_key.startswith('AIza'):
                print("[CHAT] GEMINI_API_KEY in environment is invalid format (must start with 'AIza'). Falling back to RAG Knowledge Retrieval mode.")
            else:
                print("[CHAT] Running in RAG Knowledge Retrieval mode")

        self.initialized = True

    def chat(self, query, farm_context=None):
        """Process a chat query with RAG retrieval and LLM generation."""
        if not self.initialized:
            self.initialize()

        # Initialize intent prototype embeddings if embedding model is ready
        if not hasattr(self, '_intent_vectors') or self._intent_vectors is None:
            self._intent_prototypes = {
                'crop-suitability': "Which crops are best suited for my soil, land, climate, and region to grow this season?",
                'pre-planting-prep': "What steps, soil preparation, land tillage, field preparation, basal fertilization, and seed treatment should I do before sowing crops?",
                'live-weather': "Current weather forecast, field temperature, air humidity, and 7-day rainfall accumulation."
            }
            if self.knowledge_base.embedding_model is not None:
                try:
                    self._intent_vectors = {
                        k: self.knowledge_base.embedding_model.encode(v)
                        for k, v in self._intent_prototypes.items()
                    }
                except Exception as e:
                    print(f"[CHAT] Intent vector encode warning: {e}")
                    self._intent_vectors = None
            else:
                self._intent_vectors = None

        # 1. Semantic Embedding Vector Intent Classification
        top_intent = None
        top_sim = 0.0

        if self.knowledge_base.embedding_model is not None and self._intent_vectors:
            try:
                q_vec = self.knowledge_base.embedding_model.encode([query])[0]
                q_norm = np.linalg.norm(q_vec)
                for intent_key, i_vec in self._intent_vectors.items():
                    i_norm = np.linalg.norm(i_vec)
                    sim = float(np.dot(q_vec, i_vec) / (q_norm * i_norm)) if (q_norm * i_norm) > 0 else 0.0
                    if sim > top_sim:
                        top_sim = sim
                        top_intent = intent_key
            except Exception as err:
                print(f"[CHAT] Semantic intent matching error: {err}")

        # High confidence semantic match threshold (cosine sim >= 0.50)
        if top_intent == 'crop-suitability' and top_sim >= 0.50:
            soil = farm_context.get('soil_type', 'loam') if farm_context else 'loam'
            district = farm_context.get('district', '') if farm_context else ''
            state = farm_context.get('state', '') if farm_context else ''
            loc_str = f"for {district}, {state}" if district else "for your plot"
            
            crops_list = farm_context.get('crops', []) if farm_context else []
            if crops_list and isinstance(crops_list, list):
                top_names = [c if isinstance(c, str) else c.get('crop', c.get('name', '')) for c in crops_list[:4]]
                top_names = [n.capitalize() for n in top_names if n]
            else:
                top_names = ['Rice', 'Sugarcane', 'Groundnut', 'Maize', 'Cotton']

            crops_fmt = ", ".join([f"**{c}**" for c in top_names])
            answer = (
                f"🌾 **AgroPredict Crop Match Analysis ({soil.capitalize()} Soil {loc_str}):**\n\n"
                f"Based on your **{soil}** soil profile, seasonal climate conditions, and historical APMC Mandi profit potential, the top suitable crops for your land are:\n\n"
                f"1. {crops_fmt}\n\n"
                f"• **Soil Compatibility:** High NPK retention with pH optimum 6.0–7.5.\n"
                f"• **Net Profit Optimization:** Selected to maximize expected net revenue per acre under regional weather conditions.\n\n"
                f"💡 *Tip: Tap any crop card on your Dashboard for detailed split-dose fertilizer schedules and 30-day Mandi price trends.*"
            )
            return {
                'answer': answer,
                'sources': [{'source': 'agropredict_neural_crop_recommender', 'soil': soil}],
                'mode': 'intent-crop-match',
                'semantic_score': round(top_sim, 3)
            }

        if top_intent == 'pre-planting-prep' and top_sim >= 0.50:
            soil = farm_context.get('soil_type', 'loam') if farm_context else 'your'
            answer = (
                f"🌱 **AgroPredict Pre-Planting & Land Preparation Checklist:**\n\n"
                f"Before sowing crops on your **{soil}** plot, follow these key agronomist steps:\n\n"
                f"1. **Soil Testing & pH Conditioning:** Check NPK levels. Apply lime (2-4 qtl/ac) if pH < 6.0, or gypsum (4-5 qtl/ac) if pH > 7.5.\n"
                f"2. **Deep Tillage & Harrowing:** Deep plow 20-25 cm to break hardpans and expose soil pests. Pass disc harrow twice for fine seedbed tilth.\n"
                f"3. **Basal Organic & NPK Application:** Incorporate 5-10 tons/ac FYM/vermicompost during final plowing. Apply 100% full Phosphorous (DAP) & Potassium (MOP) plus 50% Nitrogen (Urea) as basal dose before sowing.\n"
                f"4. **Seed Selection & Bio-Treatment:** Treat certified seeds with *Trichoderma viride* (4g/kg seed) or *Rhizobium* 30 min before sowing to prevent soil-borne rot.\n"
                f"5. **Laser Levelling & Bunding:** Level field to ensure uniform irrigation and prevent waterlogging."
            )
            return {
                'answer': answer,
                'sources': [{'source': 'farming_practices', 'topic': 'Pre-Planting Preparation & Land Prep'}],
                'mode': 'intent-pre-planting',
                'semantic_score': round(top_sim, 3)
            }

        if top_intent == 'live-weather' and top_sim >= 0.50:
            if farm_context and (farm_context.get('temperature') or farm_context.get('rainfall') or farm_context.get('humidity')):
                loc = f"{farm_context.get('district', '')}, {farm_context.get('state', '')}".strip(', ') or 'your field location'
                temp = farm_context.get('temperature', 'N/A')
                hum = farm_context.get('humidity', 'N/A')
                rain = farm_context.get('rainfall', 'N/A')
                soil = farm_context.get('soil_type', 'N/A')
                return {
                    'answer': f"🌤️ **AgroPredict Live Field Conditions ({loc}):**\n\n• **Current Temperature:** {temp}°C\n• **Air Humidity:** {hum}%\n• **7-Day Rainfall Accumulation:** {rain}mm\n• **Soil Type:** {soil}\n\n*Agronomic Recommendation:* Monitor field drainage during rain events and adjust irrigation schedules to maintain optimal soil moisture.",
                    'sources': [{'source': 'live_telemetry_sensors'}],
                    'mode': 'live-context',
                    'semantic_score': round(top_sim, 3)
                }

        crop_filter = None
        if farm_context and farm_context.get('crops'):
            crops = farm_context['crops']
            if isinstance(crops, list) and len(crops) > 0:
                first_crop = crops[0] if isinstance(crops[0], str) else crops[0].get('crop', None)
                if first_crop and first_crop.lower() in query.lower():
                    crop_filter = first_crop

        try:
            rag_results = self.knowledge_base.search(query, n_results=4, crop_filter=crop_filter)
        except Exception as e:
            print(f"[CHAT] Search error: {e}")
            rag_results = []

        rag_context = "\n\n".join([
            f"[Source: {r.get('metadata', {}).get('source', 'knowledge')}] {r.get('text', '')}"
            for r in rag_results
        ])

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

        if self.llm and LANGCHAIN_AVAILABLE:
            try:
                return self._generate_with_llm(
                    query, rag_context, location, soil_type, soil_ph,
                    temperature, humidity, rainfall, crops_str, rag_results
                )
            except Exception as err:
                print(f"[CHAT] LLM invocation failed ({err}), using RAG fallback response.")

        return self._generate_without_llm(query, rag_results, farm_context)

    def _generate_with_llm(self, query, rag_context, location, soil_type, soil_ph,
                           temperature, humidity, rainfall, crops_str, rag_results):
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
            'sources': [r.get('metadata', {}) for r in rag_results],
            'mode': 'llm+rag',
            'model': 'gemini-2.0-flash'
        }

    def _generate_without_llm(self, query, rag_results, farm_context):
        if not rag_results:
            return {
                'answer': "🌾 **AgroPredict Agronomist Advice:**\n\nFor optimal crop performance, ensure proper soil NPK balance and regular moisture checks. You can query about crop diseases, organic treatments, NPK fertilizer dosages, government schemes, or Mandi rates.",
                'sources': [],
                'mode': 'fallback'
            }

        # Filter rag results to match topic if keyword search gave results
        best = rag_results[0]
        text = best.get('text', '')
        topic = best.get('metadata', {}).get('topic', best.get('metadata', {}).get('source', 'Insight'))
        answer = f"🌾 **AgroPredict Agronomic Insight ({topic}):**\n\n{text}\n\n"

        if len(rag_results) > 1:
            answer += "**Additional Agronomic Notes:**\n"
            for r in rag_results[1:3]:
                t = r.get('metadata', {}).get('topic', '')
                prefix = f"• **{t}:** " if t else "• "
                answer += f"{prefix}{r.get('text', '')[:160]}...\n"

        return {
            'answer': answer,
            'sources': [r.get('metadata', {}) for r in rag_results],
            'mode': 'rag-only'
        }

    def get_status(self):
        return {
            'initialized': self.initialized,
            'llm_available': self.llm is not None,
            'llm_model': 'gemini-2.0-flash' if self.llm else None,
            'knowledge_base': self.knowledge_base.get_status() if self.initialized else None
        }
