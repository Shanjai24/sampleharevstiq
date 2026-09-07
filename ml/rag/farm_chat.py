"""
Conversational RAG Chat Engine for HarvestIQ (AgroPredict).
Provides agronomic advice, disease identification, weather insights, fertilizer plans,
and website navigation guidance using a combination of local RAG knowledge retrieval,
intelligent rule-based agronomy engines, and Gemini LLM when available.
"""

import os
import re
from pathlib import Path
from dotenv import load_dotenv

# Try importing LangChain & Google GenAI components
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import SystemMessage, HumanMessage
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False

from .knowledge_base import KnowledgeBase

SYSTEM_PROMPT = """You are HarvestIQ AI (AgroPredict Agronomist), a compassionate and highly expert agricultural AI advisor for Indian farmers.
Your advice must be practical, safe, scientifically accurate, and easy for farmers to follow.
Structure your answers with clear bullet points, specific product names, dosages (e.g. ml/litre or kg/acre), and timings."""

RESPONSE_PROMPT = """Farm Location: {location} (Plot Size: {area_acres} Acres)
Soil Type: {soil_type} (pH: {soil_ph})
Weather: {temperature}°C, {humidity}% humidity, 7-day rainfall: {rainfall}mm
Recommended Crops: {crops}
Market Mandi Price: {mandi_price}

Knowledge Base Reference:
{rag_context}

Farmer Question: {question}

Provide a direct, practical, personalized answer for this farmer, referencing their specific plot size, crop, and location where relevant."""


class FarmChat:
    def __init__(self, knowledge_base=None):
        self.knowledge_base = knowledge_base or KnowledgeBase()
        self.llm = None
        self.initialized = False

    def initialize(self):
        """Initialize the knowledge base and Gemini model if API key is available."""
        if not self.knowledge_base.initialized:
            self.knowledge_base.initialize()

        # Load environment variables
        env_path = Path(__file__).resolve().parent.parent / 'environment.env'
        if env_path.exists():
            load_dotenv(env_path)
        else:
            load_dotenv()

        api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
        if api_key and LANGCHAIN_AVAILABLE:
            for model_name in ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro']:
                try:
                    self.llm = ChatGoogleGenerativeAI(
                        model=model_name,
                        google_api_key=api_key,
                        temperature=0.3,
                        max_output_tokens=1024
                    )
                    print(f"[CHAT] Gemini model ({model_name}) initialized successfully.")
                    break
                except Exception as e:
                    print(f"[CHAT] Gemini model {model_name} init attempt failed: {e}")
                    self.llm = None
        else:
            print("[CHAT] Running in Built-in Conversational RAG Mode (Add GEMINI_API_KEY to environment.env for generative mode)")

        self.initialized = True

    def chat(self, query, farm_context=None):
        """Process a chat query with RAG retrieval, context awareness, and conversational intelligence."""
        if not self.initialized:
            self.initialize()

        query_clean = query.strip()
        query_lower = query_clean.lower()

        # 1. Direct Platform & Website Guidance Check
        website_response = self._check_website_guide(query_lower, farm_context)
        if website_response:
            return website_response

        # 2. Greeting & General Platform Query Check
        greeting_response = self._check_greetings(query_lower, farm_context)
        if greeting_response:
            return greeting_response

        # 3. Crop Recommendation & Planting Query Check (HIGHEST AGRONOMIC PRIORITY)
        crop_req_keywords = [
            'what should i plant', 'which crop', 'what crop', 'crops to grow', 'suitable crop',
            'recommend crop', 'crop suitability', 'what to plant', 'which to plant', 'what should i grow',
            'suggest crop', 'dry land', 'rainfed', '1 acre', 'acre', 'dryland', 'what to grow',
            'best crop', 'crops to cultivate', 'sowing', 'which plant'
        ]
        if any(k in query_lower for k in crop_req_keywords):
            crop_resp = self._check_crop_recommendations(query_lower, farm_context)
            if crop_resp:
                return crop_resp

        # 4. Explicit Weather Status & Forecast Queries
        weather_explicit_phrases = [
            'what is the weather', 'weather today', 'weather forecast', 'today weather',
            'how is the weather', 'is it going to rain', 'rain forecast', 'current temperature',
            'what temperature', 'weather report', 'weather update', 'how hot is it', 'how cold is it'
        ]
        if any(p in query_lower for p in weather_explicit_phrases) or query_lower in ['weather', 'forecast', 'rain today', 'temperature today']:
            weather_response = self._check_live_weather(farm_context)
            if weather_response:
                return weather_response

        # 5. Search Knowledge Base
        crop_filter = None
        if farm_context and farm_context.get('crops'):
            crops = farm_context['crops']
            if isinstance(crops, list) and len(crops) > 0:
                first_crop = crops[0] if isinstance(crops[0], str) else crops[0].get('crop', None)
                if first_crop and first_crop.lower() in query_lower:
                    crop_filter = first_crop

        try:
            rag_results = self.knowledge_base.search(query_clean, n_results=4, crop_filter=crop_filter)
        except Exception as e:
            print(f"[CHAT] Search error: {e}")
            rag_results = []

        rag_context = "\n\n".join([
            f"[Source: {r.get('metadata', {}).get('source', 'knowledge')}] {r.get('text', '')}"
            for r in rag_results
        ])

        # Extract context fields
        location = "Not specified"
        soil_type = "Not specified"
        soil_ph = "N/A"
        temperature = "N/A"
        humidity = "N/A"
        rainfall = "N/A"
        area_acres = "1.0"
        mandi_price = "N/A"
        crops_str = "Not specified"

        if farm_context:
            district = farm_context.get('district', '')
            state = farm_context.get('state', '')
            location = f"{district}, {state}".strip(', ') or "Selected Plot"
            soil_type = farm_context.get('soil_type', 'Not specified')
            soil_ph = farm_context.get('soil_ph', 'N/A')
            temperature = farm_context.get('temperature', 'N/A')
            humidity = farm_context.get('humidity', 'N/A')
            rainfall = farm_context.get('rainfall', 'N/A')
            area_acres = str(farm_context.get('area_acres', farm_context.get('areaAcres', '1.0')))
            mandi_price = str(farm_context.get('mandi_price', farm_context.get('currentPrice', 'N/A')))
            crops_list = farm_context.get('crops', [])
            if isinstance(crops_list, list):
                crops_str = ", ".join([
                    c if isinstance(c, str) else c.get('crop', c.get('name', 'unknown'))
                    for c in crops_list[:5]
                ]) or "Not specified"

        # 6. Invoke LLM if available
        if self.llm and LANGCHAIN_AVAILABLE:
            try:
                return self._generate_with_llm(
                    query_clean, rag_context, location, soil_type, soil_ph,
                    temperature, humidity, rainfall, area_acres, mandi_price, crops_str, rag_results
                )
            except Exception as err:
                print(f"[CHAT] LLM invocation failed ({err}), switching to Conversational Agronomist Engine.")

        # 7. Fallback to comprehensive Conversational Agronomist Engine
        return self._generate_conversational_fallback(query_clean, query_lower, rag_results, farm_context)

    def _check_greetings(self, query_lower, farm_context):
        """Handle greetings and introductions conversationally."""
        greetings = ['hello', 'hi', 'hey', 'namaste', 'vanakkam', 'good morning', 'good afternoon', 'good evening', 'who are you', 'what can you do']
        if any(query_lower == g or query_lower.startswith(g + ' ') or query_lower.startswith(g + ',') or query_lower.startswith(g + '!') for g in greetings):
            loc = ""
            if farm_context and (farm_context.get('district') or farm_context.get('state')):
                loc = f" for your plot in **{farm_context.get('district', '')}, {farm_context.get('state', '')}**"

            return {
                'answer': (
                    f"👋 **Namaste! I am HarvestIQ AI, your personal agricultural advisor.**\n\n"
                    f"I am ready to assist you{loc}. Here is how I can help:\n\n"
                    f"• **🌾 Crop Recommendations:** Best crops to plant based on your soil, weather, and mandi profit margins.\n"
                    f"• **🐛 Disease & Pest Doctor:** Identify symptoms (yellow spots, wilting, leaf curl, insects) and get exact dosage remedies.\n"
                    f"• **💧 Irrigation & Weather:** Calculate exact water volume (litres/acre) and check rainfall impact.\n"
                    f"• **🧪 Soil Health & Fertilizer:** NPK split dosages, micronutrients, and soil pH corrections.\n"
                    f"• **📊 APMC Mandi Market:** Latest crop prices, 30-day forecast, and best selling mandis.\n"
                    f"• **🧭 Website Guidance:** Ask me how to navigate the map, check borewell risk, or upload a Soil Health Card.\n\n"
                    f"*Feel free to ask any question or describe what is happening in your field!*"
                ),
                'sources': [{'source': 'harvestiq_platform'}],
                'mode': 'greeting'
            }
        return None

    def _check_website_guide(self, query_lower, farm_context):
        """Guide the user on how to use the website, navigate pages, and interpret features."""
        is_about_site = any(k in query_lower for k in [
            'how to use', 'about the website', 'about this website', 'how does this work', 
            'how to see', 'where to find', 'how to navigate', 'how to approach',
            'what is harvestiq', 'what is agropredict', 'how to analyze', 'how to test soil',
            'how to check borewell', 'how to check groundwater', 'how to see market'
        ])

        if not is_about_site:
            return None

        # 1. Map Analysis
        if any(k in query_lower for k in ['map', 'location', 'pin', 'gps', 'select field', 'analyze farm', 'start analysis']):
            return {
                'answer': (
                    "🗺️ **How to Use the Map Analysis:**\n\n"
                    "1. **Navigate to the Map Tab** (top navigation or bottom bar on mobile).\n"
                    "2. **Locate Your Field:** Type your district, village, or town in the search bar or click **📍 Use My GPS**.\n"
                    "3. **Drop a Pin:** Click directly on your agricultural plot on the interactive map.\n"
                    "4. **Click 'Analyse My Farm Plot':** HarvestIQ fetches satellite weather, soil matrix, elevation slope, and market mandi rates.\n"
                    "5. You will automatically be redirected to the **Dashboard** with custom crop rankings."
                ),
                'sources': [{'source': 'harvestiq_navigation', 'page': 'Map'}],
                'mode': 'website-guide'
            }

        # 2. Borewell / Groundwater
        if any(k in query_lower for k in ['borewell', 'groundwater', 'water depth', 'aquifer', 'drilling risk']):
            return {
                'answer': (
                    "💧 **How to Check Groundwater & Borewell Drilling Risk:**\n\n"
                    "1. Click on the **Groundwater (Borewell)** tab.\n"
                    "2. The system evaluates four hydrogeological factors:\n"
                    "   • **Soil Clay Depth & Permeability:** Water percolation and retention.\n"
                    "   • **Topographical Slope & Elevation:** Runoff velocity vs infiltration.\n"
                    "   • **Distance to Waterways:** Proximity to recharge rivers and canals.\n"
                    "   • **52-Week Cumulative Rainfall:** Historical aquifer replenishment.\n"
                    "3. **Risk Gauge Interpretation:**\n"
                    "   • **0% - 35% (Low Risk / Green):** Highly favorable for drilling.\n"
                    "   • **36% - 65% (Moderate Risk / Amber):** Check nearby seasonal water levels.\n"
                    "   • **66% - 100% (High Risk / Red):** High dry-bore risk; prioritize recharge pits or farm ponds first."
                ),
                'sources': [{'source': 'harvestiq_navigation', 'page': 'Borewell'}],
                'mode': 'website-guide'
            }

        # 3. Soil Tiers & Lab OCR
        if any(k in query_lower for k in ['soil tier', 'soil report', 'upload report', 'ocr', 'soil test', 'npk value']):
            return {
                'answer': (
                    "🧪 **How to Input or Update Your Soil Data (3 Tiers):**\n\n"
                    "On your **Dashboard**, scroll to the **Soil Information Card**:\n\n"
                    "• **Tier 1 (Lab Report OCR Upload):** Upload a photo or PDF of your Government Soil Health Card / Lab Test. Our OCR extracts N, P, K, and pH.\n"
                    "• **Tier 2 (Manual Entry):** If you have test values, enter N, P, K, and pH values directly.\n"
                    "• **Tier 3 (Regional Government Database):** Uses district agricultural soil survey benchmarks."
                ),
                'sources': [{'source': 'harvestiq_navigation', 'page': 'SoilTierSelector'}],
                'mode': 'website-guide'
            }

        # 4. Market & Mandi Prices
        if any(k in query_lower for k in ['mandi', 'market', 'price', 'apmc', 'rates', 'sell']):
            return {
                'answer': (
                    "📈 **How to Check Mandi Market Prices & Forecasts:**\n\n"
                    "1. Click on the **Mandi Market** tab.\n"
                    "2. Select your crop from the dropdown (e.g. Rice, Wheat, Cotton, Tomato, Groundnut).\n"
                    "3. View the **30-day Price Trend Chart** showing modal price fluctuations.\n"
                    "4. Compare prices across neighboring district mandis to locate the highest-paying market."
                ),
                'sources': [{'source': 'harvestiq_navigation', 'page': 'Market'}],
                'mode': 'website-guide'
            }

        return {
            'answer': (
                "🌱 **Welcome to HarvestIQ (AgroPredict)! Key Features:**\n\n"
                "1. **🗺️ Map Analysis:** Drop a pin on your farmland to fetch live soil, elevation, and climate telemetry.\n"
                "2. **🌾 Dashboard:** Review AI-ranked crops suited for your field, expected profit per acre, and split-dose fertilizer plans.\n"
                "3. **💧 Groundwater Tab:** Check your plot's borewell drilling success probability and aquifer recharge score.\n"
                "4. **📊 Mandi Market:** Compare live APMC mandi prices and 30-day market trends.\n"
                "5. **🌦️ Weather Tab:** 7-day hourly forecasts and automated irrigation volume calculations.\n"
                "6. **🤖 AI Advisory / Doctor:** Ask any farming questions or upload crop photos for disease diagnosis.\n"
                "7. **⭐ Saved Plots:** Save your farm analyses and log post-harvest yield feedback."
            ),
            'sources': [{'source': 'harvestiq_overview'}],
            'mode': 'website-guide'
        }

    def _check_live_weather(self, farm_context):
        """Format real-time weather advice based on field telemetry."""
        if not farm_context or not (farm_context.get('temperature') or farm_context.get('rainfall') or farm_context.get('humidity')):
            return {
                'answer': (
                    "🌤️ **Live Weather & Field Advisory:**\n\n"
                    "• **Select Your Plot on the Map:** Go to the **Map Tab** and drop a pin on your farmland to fetch live satellite weather telemetry.\n"
                    "• **General Weather Rule for Agriculture:**\n"
                    "  - *High Humidity (>75%) & Warm Temps (25–32°C):* High risk for fungal foliar diseases (Blast, Rust, Blight). Avoid excess Nitrogen fertilizer.\n"
                    "  - *Dry & Hot (>35°C):* Irrigate during early morning or late evening. Apply organic mulching to conserve root zone moisture.\n"
                    "  - *Expected Rainfall (>25mm):* Pause surface irrigation and ensure field drainage channels are unclogged."
                ),
                'sources': [{'source': 'agronomic_weather_guidelines'}],
                'mode': 'weather-guide'
            }

        temp = farm_context.get('temperature', 'N/A')
        hum = farm_context.get('humidity', 'N/A')
        rain = farm_context.get('rainfall', 'N/A')
        loc = f"{farm_context.get('district', '')}, {farm_context.get('state', '')}".strip(', ') or "your field"

        try:
            rain_val = float(rain)
        except (ValueError, TypeError):
            rain_val = 0.0

        try:
            temp_val = float(temp)
        except (ValueError, TypeError):
            temp_val = 30.0

        irrigation_advice = ""
        if rain_val > 25:
            irrigation_advice = "🌧️ **Heavy Rainfall Alert:** Ensure field drainage channels are clear to prevent root waterlogging and fungal collar rot."
        elif rain_val > 5:
            irrigation_advice = "⛅ **Moderate Moisture:** Rainfall has replenished topsoil moisture. Hold off routine surface irrigation for 2-3 days."
        else:
            irrigation_advice = "☀️ **Dry Conditions:** Schedule irrigation during early morning or evening to minimize evapotranspiration losses."

        heat_advice = ""
        if temp_val > 36:
            heat_advice = "\n• **Heat Stress Advisory:** Maintain light mulching with crop residue to preserve root zone temperature."

        return {
            'answer': (
                f"🌤️ **Live Field Telemetry & Weather Advisory ({loc}):**\n\n"
                f"• **Temperature:** {temp}°C\n"
                f"• **Relative Air Humidity:** {hum}%\n"
                f"• **7-Day Rainfall Accumulation:** {rain}mm\n\n"
                f"**Agronomic Action Plan:**\n"
                f"{irrigation_advice}{heat_advice}\n\n"
                f"💡 *Tip: Visit the Weather tab for detailed hourly irrigation requirement calculations.*"
            ),
            'sources': [{'source': 'live_weather_telemetry'}],
            'mode': 'live-weather'
        }

    def _check_crop_recommendations(self, query_lower, farm_context):
        """Format intelligent crop recommendations, specially tailored if dryland/rainfed/1-acre is queried."""
        soil = farm_context.get('soil_type', 'loam') if farm_context else 'loam'
        district = farm_context.get('district', '') if farm_context else ''
        state = farm_context.get('state', '') if farm_context else ''
        loc_str = f"for {district}, {state}" if district else "for your plot"
        temp = farm_context.get('temperature', '30') if farm_context else '30'
        rain = farm_context.get('rainfall', '50') if farm_context else '50'

        is_dryland_query = any(k in query_lower for k in ['dry land', 'dryland', 'rainfed', 'low water', 'water shortage', 'no water', 'limited water'])

        if is_dryland_query:
            return {
                'answer': (
                    f"🌾 **Dryland & Rainfed Crop Plan (1 Acre / Limited Water — {loc_str}):**\n\n"
                    f"For dryland farming in **{soil.capitalize()} soil** under warm temperatures (~{temp}°C), high-water crops like flood paddy or sugarcane carry high financial risk. Highly resilient, high-profit choices include:\n\n"
                    f"1. **🥜 Groundnut (Peanut):** Excellent in light/loam soils, fixes atmospheric nitrogen, requires low irrigation, with net profit ₹35,000–₹45,000/acre.\n"
                    f"2. **🌾 Millets (Pearl Millet / Ragi / Sorghum):** Thrives in low moisture (200–400mm rainfall), ready in 80–90 days, rising mandi demand at ₹2,500–₹3,800/q.\n"
                    f"3. **🌱 Pulses (Black Gram / Green Gram / Pigeon Pea):** Minimal water needs, enriches soil organic carbon, intercropping with maize or millets reduces risk.\n"
                    f"4. **🌱 Cotton (Drip-Fed):** Deep taproot system withstands dry spells, high cash market realization.\n\n"
                    f"**Key Dryland Agronomic Tactics:**\n"
                    f"• **Organic Mulching:** Cover soil between rows with crop residue to reduce evaporation by 30-40%.\n"
                    f"• **Seed Treatment:** Treat seeds with *Trichoderma viride* (4g/kg) and *Rhizobium* culture for root vigor.\n"
                    f"• **Drip Irrigation / Farm Pond:** Apply water directly to root zones at night or early morning.\n\n"
                    f"💡 *Tip: Check the **Dashboard** for exact NPK dosages and expected mandi revenue per acre.*"
                ),
                'sources': [{'source': 'dryland_agronomy_protocol', 'soil': soil}],
                'mode': 'dryland-crop-suitability'
            }

        crops_list = farm_context.get('crops', []) if farm_context else []
        if crops_list and isinstance(crops_list, list) and len(crops_list) > 0:
            top_names = [c if isinstance(c, str) else c.get('crop', c.get('name', '')) for c in crops_list[:5]]
            top_names = [n.capitalize() for n in top_names if n]
        else:
            top_names = ['Groundnut', 'Maize', 'Cotton', 'Millets', 'Pulses']

        crops_fmt = "\n".join([f"• **{i+1}. {c}** — High soil & climate compatibility index" for i, c in enumerate(top_names)])
        return {
            'answer': (
                f"🌾 **HarvestIQ AI Crop Suitability Analysis ({soil.capitalize()} Soil — {loc_str}):**\n\n"
                f"Based on your **{soil}** soil matrix, regional temperature (~{temp}°C), rainfall (~{rain}mm), and APMC Mandi price trends:\n\n"
                f"{crops_fmt}\n\n"
                f"**Agronomic Suitability Highlights:**\n"
                f"• **Soil Nutrient Match:** Well-aligned with prevailing NPK absorption dynamics (pH 6.0–7.5).\n"
                f"• **Revenue Potential:** High expected net margin per acre under current mandi modal rates.\n\n"
                f"💡 *Tip: Visit the **Dashboard** to see the full ranked cards, expected yield tons/acre, and fertilizer schedules.*"
            ),
            'sources': [{'source': 'neural_crop_recommender', 'soil': soil}],
            'mode': 'crop-suitability'
        }

    def _generate_with_llm(self, query, rag_context, location, soil_type, soil_ph,
                           temperature, humidity, rainfall, area_acres, mandi_price, crops_str, rag_results):
        prompt = RESPONSE_PROMPT.format(
            location=location, area_acres=area_acres, soil_type=soil_type, soil_ph=soil_ph,
            temperature=temperature, humidity=humidity, rainfall=rainfall,
            crops=crops_str, mandi_price=mandi_price, rag_context=rag_context, question=query
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
            'model': 'gemini'
        }

    def _generate_conversational_fallback(self, query, query_lower, rag_results, farm_context):
        """High-intelligence rule & semantic engine for rich answers even without an external API key."""
        disease_terms = {
            'yellow': ("Yellowing Leaves & Chlorosis", 
                       "Yellowing leaves are commonly caused by **Nitrogen deficiency** or **Fungal Leaf Spot/Mosaic Virus**.\n\n"
                       "**Step-by-Step Treatment Plan:**\n"
                       "1. **Check Pattern:** If older lower leaves turn yellow first, it is **Nitrogen deficiency** — spray 1-2% Urea solution or top-dress with 25 kg Urea/acre.\n"
                       "2. **If yellow patches/spots with brown rings appear:** It is a **fungal infection** — spray **Mancozeb 75% WP (2.5 g/litre)** or **Carbendazim (1 g/litre)**.\n"
                       "3. **Organic Alternative:** Spray **Neem Oil 10,000 PPM (3-5 ml/litre)** mixed with 1ml liquid soap every 7 days.\n"
                       "4. **Water Management:** Avoid over-irrigation which suffocates roots and causes yellowing."),

            'blast': ("Crop Blast & Leaf Spot Disease",
                      "Blast is caused by *Magnaporthe oryzae* fungi, causing spindle-shaped lesions.\n\n"
                      "**Recommended Treatment:**\n"
                      "• **Chemical:** Spray **Tricyclazole 75% WP @ 0.6 g/litre** or **Isoprothiolane 40% EC @ 1.5 ml/litre** at first symptom.\n"
                      "• **Organic:** Spray *Pseudomonas fluorescens* (10 g/litre) or Panchagavya (3%).\n"
                      "• Avoid excess nitrogen fertilizer application during peak humidity."),

            'rust': ("Rust Disease (Puccinia)",
                     "Rust appears as orange, reddish-brown, or black pustules on leaf surfaces.\n\n"
                     "**Recommended Treatment:**\n"
                     "• **Chemical:** Spray **Propiconazole 25% EC @ 1 ml/litre** or **Mancozeb @ 2 g/litre**.\n"
                     "• Repeat spray after 12-15 days if cloudy humid weather persists.\n"
                     "• Ensure proper crop spacing to improve air circulation."),

            'borer': ("Stem Borer / Pod Borer Attack",
                      "Borers cause dead-hearts in early stages and white-ears / hollow pods at reproductive stage.\n\n"
                      "**Recommended Treatment:**\n"
                      "• **Chemical:** Apply **Chlorantraniliprole 18.5% SC @ 0.3 ml/litre** or **Cartap Hydrochloride 50% SP @ 2 g/litre**.\n"
                      "• **Bio-control:** Install **Pheromone Traps (5-8 traps/acre)** and release *Trichogramma chilonis* egg parasitoids @ 20,000/acre.\n"
                      "• Clip seedling leaf tips before transplanting to remove egg masses."),

            'pest': ("Pest & Insect Attack Management",
                     "For general sucking pests (Aphids, Jassids, Thrips, Whiteflies):\n\n"
                     "• **Chemical:** Spray **Imidacloprid 17.8% SL @ 0.5 ml/litre** or **Acetamiprid 20% SP @ 0.4 g/litre**.\n"
                     "• **Organic:** Spray **5% Neem Seed Kernel Extract (NSKE)** or **Neem Oil (5 ml/L)**.\n"
                     "• Install **Yellow and Blue Sticky Traps (10-15 per acre)** at crop canopy height."),

            'wilt': ("Bacterial & Fusarium Wilt",
                     "Wilt causes sudden drooping and drying of plants while green.\n\n"
                     "• **Remedy:** Drench soil with **Copper Oxychloride (3 g/litre)** or **Streptocycline (1 g in 10 litres)**.\n"
                     "• Apply **Trichoderma harzianum** (2 kg mixed with 100 kg farmyard manure per acre) during soil preparation.\n"
                     "• Ensure strict crop rotation with non-host crops."),

            'fertilizer': ("Balanced Fertilizer & NPK Schedule",
                           "**General Scientific Fertilizer Management:**\n\n"
                           "1. **Basal Dose (at Sowing):** Apply 100% Phosphorus (DAP/SSP), 100% Potash (MOP), and 25-30% Nitrogen (Urea).\n"
                           "2. **First Top-Dressing (Tillering/Vegetative stage, 25-30 days):** Apply 35% Nitrogen + 5 kg Zinc Sulphate (21%) per acre.\n"
                           "3. **Second Top-Dressing (Panicle/Flowering stage):** Apply remaining Nitrogen.\n"
                           "• *Tip: Always incorporate 5-8 tons of organic compost/FYM per acre before sowing for long-term soil structure.*")
        }

        for key, (title, content) in disease_terms.items():
            if key in query_lower:
                return {
                    'answer': f"🌿 **AgroPredict Agronomist Advisory — {title}:**\n\n{content}",
                    'sources': [{'source': 'integrated_pest_management', 'topic': title}],
                    'mode': 'agronomist-engine'
                }

        # 2. If RAG results exist, format them clearly
        if rag_results:
            best = rag_results[0]
            text = best.get('text', '')
            topic = best.get('metadata', {}).get('topic', best.get('metadata', {}).get('source', 'Agricultural Insight'))
            answer = f"🌾 **AgroPredict Agronomic Insight ({topic}):**\n\n{text}\n\n"

            if len(rag_results) > 1:
                answer += "**Additional Practical Recommendations:**\n"
                for r in rag_results[1:3]:
                    t = r.get('metadata', {}).get('topic', '')
                    prefix = f"• **{t}:** " if t else "• "
                    snippet = r.get('text', '')
                    if len(snippet) > 180:
                        snippet = snippet[:180] + "..."
                    answer += f"{prefix}{snippet}\n"

            return {
                'answer': answer,
                'sources': [r.get('metadata', {}) for r in rag_results],
                'mode': 'rag-only'
            }

        # 3. Conversational Default
        return {
            'answer': (
                f"🌾 **HarvestIQ Agricultural Advisory:**\n\n"
                f"Regarding your query on *\"{query}\"*:\n\n"
                f"1. **Field Check:** Check topsoil moisture and look beneath leaf undersides for signs of pests or disease.\n"
                f"2. **Nutrition:** Maintain balanced NPK application based on your crop growth stage.\n"
                f"3. **Specific Inquiries:** You can ask about *'leaf curl treatment'*, *'dryland crops'*, *'urea dosage'*, or upload a photo using the camera button for AI plant disease diagnosis."
            ),
            'sources': [{'source': 'harvestiq_advisory'}],
            'mode': 'conversational-engine'
        }

    def get_status(self):
        is_llm = self.llm is not None
        return {
            'status': 'ok',
            'initialized': self.initialized,
            'online': is_llm,
            'llm_available': is_llm,
            'mode': 'online' if is_llm else 'limited',
            'model': 'Gemini 2.0 Flash' if is_llm else 'Built-in Agricultural RAG Engine',
            'knowledge_base': self.knowledge_base.get_status() if self.initialized else None
        }

