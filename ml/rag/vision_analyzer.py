"""
AgroPredict AI Plant Vision Engine — Crop & Disease Identification from Photo
Uses Gemini 2.0 Vision API with structured agronomic fallback.
"""
import os
import json
import base64
import requests

SYSTEM_VISION_PROMPT = """You are AgroPredict AI Plant Pathologist, an expert agricultural vision model for plant species and disease diagnosis.
Examine the uploaded plant or leaf image carefully and provide a structured JSON response.

CRITICAL RULES:
1. If the image is NOT a plant, leaf, crop, or agricultural specimen, or if the photo is too blurry/dark to diagnose confidently, set "type": "unclear_photo" and "confidence": 0.3.
2. If the image shows a healthy crop, set "type": "crop_identification", identify the crop name, growth stage, and ideal growing conditions.
3. If the image shows a diseased crop/leaf, set "type": "disease_diagnosis", identify the disease/pest, cause, organic treatments, chemical options, and future prevention.

RETURN ONLY VALID RAW JSON IN THE FOLLOWING EXACT FORMAT (NO MARKDOWN WRAPPERS):
{
  "type": "disease_diagnosis" | "crop_identification" | "unclear_photo",
  "confidence": 0.92,
  "title": "Early Blight (Alternaria solani)",
  "crop": "Tomato",
  "growthStage": "Flowering / Early Fruiting Stage",
  "description": "Plain language summary of symptoms visible in the photo.",
  "cause": "High humidity, prolonged leaf wetness, and wind-borne fungal spores.",
  "idealConditions": "Full sun, well-draining loam, pH 6.0-6.8, 20-30°C temperature.",
  "steps": {
    "immediate_organic": [
      "Spray Neem Oil (5ml/L water) or Copper Hydroxide every 7-10 days.",
      "Prune infected lower leaves and burn or dispose away from the field."
    ],
    "chemical_options": [
      "Apply Mancozeb 75% WP @ 2g/L water at first symptom onset.",
      "Spray Difenoconazole 25% EC @ 0.5ml/L water if infection spreads."
    ],
    "future_prevention": [
      "Practice 3-year crop rotation with non-solanaceous crops (maize, pulses).",
      "Install drip irrigation instead of overhead sprinklers to keep foliage dry."
    ]
  }
}"""


class VisionAnalyzer:
    def __init__(self):
        self.gemini_key = os.environ.get('GEMINI_API_KEY', '').strip() or os.environ.get('GOOGLE_API_KEY', '').strip()

    def analyze_image(self, image_b64, crop_hint=None):
        """Analyze Base64 image using Gemini Vision API or fallback rules."""
        gemini_key = (
            os.environ.get('GEMINI_API_KEY', '').strip() or
            os.environ.get('GOOGLE_API_KEY', '').strip()
        )

        if not image_b64:
            return {
                'type': 'unclear_photo',
                'confidence': 0.0,
                'message': 'No image data provided. Please upload a clear photo of your plant or leaf.'
            }

        # Clean Base64 string if data URL prefix exists
        if ',' in image_b64:
            image_b64 = image_b64.split(',', 1)[1]

        # Check if any valid API key is present
        if gemini_key and len(gemini_key) > 5:
            # Try Gemini 2.0 Flash then 1.5 Flash models
            models_to_try = ['gemini-2.0-flash', 'gemini-1.5-flash']
            for model_name in models_to_try:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
                    prompt_text = SYSTEM_VISION_PROMPT + (f"\nFarmer note/crop hint: {crop_hint}" if crop_hint else "")
                    payload = {
                        "contents": [{
                            "parts": [
                                {"text": prompt_text},
                                {
                                    "inline_data": {
                                        "mime_type": "image/jpeg",
                                        "data": image_b64
                                    }
                                }
                            ]
                        }],
                        "generationConfig": {
                            "temperature": 0.2,
                            "maxOutputTokens": 1024
                        }
                    }
                    res = requests.post(url, json=payload, timeout=25)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get('candidates', [])
                        if candidates and len(candidates) > 0:
                            text_resp = candidates[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                            # Strip ```json markdown blocks if present
                            clean_text = text_resp.strip()
                            if '```json' in clean_text:
                                clean_text = clean_text.split('```json', 1)[1].split('```', 1)[0].strip()
                            elif clean_text.startswith('```'):
                                clean_text = clean_text.split('```', 2)[1].strip()
                            parsed = json.loads(clean_text)
                            if 'confidence' not in parsed:
                                parsed['confidence'] = 0.90
                            parsed['ai_mode'] = 'gemini-vision'
                            return parsed
                    else:
                        print(f"[VISION API] Model {model_name} HTTP {res.status_code}: {res.text[:200]}")
                except Exception as e:
                    print(f"[VISION API ERROR with {model_name}]: {e}")

        # Fallback when Gemini Vision API is unavailable or misconfigured.
        # NOTE: No image analysis has been performed at this point.
        # Returning a hardcoded diagnosis would be medically/agronomically misleading,
        # so we return a clear "unavailable" response with zero confidence.
        crop_title = crop_hint.capitalize() if crop_hint else 'your crop'
        return {
            'type': 'unclear_photo',
            'confidence': 0.0,
            'title': 'AI Vision Unavailable — Please Retry',
            'crop': crop_title,
            'growthStage': 'Unknown',
            'description': (
                'The AI vision analysis service is currently unavailable (API not configured or offline). '
                'Your photo could not be analyzed. Please try again later, or describe the symptoms '
                'in the chat for text-based advisory.'
            ),
            'cause': 'N/A — image not analyzed.',
            'idealConditions': 'N/A',
            'ai_mode': 'fallback-expert-rules',
            'steps': {
                'immediate_organic': [
                    'Describe the visible symptoms in the Advisory Chat for text-based expert guidance.',
                    'Check for common signs: yellowing, spots, wilting, or unusual growths.'
                ],
                'chemical_options': [
                    'Do not apply any treatment without a confirmed diagnosis.',
                    'Retry photo upload when connectivity is restored.'
                ],
                'future_prevention': [
                    'Ensure good lighting and a clear, close-up photo for best diagnosis results.',
                    'Use the Advisory Chat tab to describe symptoms for immediate guidance.'
                ]
            }
        }

