import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS
from models.crop_recommender import CropRecommender
from models.borewell_risk import BorewellRiskScorer
from models.price_predictor import PricePredictor
from rag.farm_chat import FarmChat

app = Flask(__name__)
CORS(app)

# Initialize models
print("Loading ML models...")
crop_model = CropRecommender()
borewell_model = BorewellRiskScorer()
price_model = PricePredictor()
farm_chat = FarmChat()
print("Models loaded!")

# Initialize chat/RAG in background (lazy load on first request)
import threading
def init_chat_bg():
    try:
        farm_chat.initialize()
    except Exception as e:
        print(f"[WARN] Chat init deferred: {e}")
threading.Thread(target=init_chat_bg, daemon=True).start()


@app.route('/ml/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'farmsense-ml',
        'models': {
            'crop_recommender': crop_model.model is not None,
            'borewell_risk': borewell_model.model is not None,
            'price_predictor': True
        }
    })


@app.route('/ml/recommend-crops', methods=['POST'])
def recommend_crops():
    try:
        data = request.json
        crops = crop_model.predict(
            soil_type=data.get('soil_type', 'loam'),
            soil_ph=float(data.get('soil_ph', 6.5)),
            avg_temperature=float(data.get('avg_temperature', 30)),
            rainfall_7day=float(data.get('rainfall_7day', 20)),
            humidity=float(data.get('humidity', 65)),
            month=int(data.get('month', 6)),
            elevation=float(data.get('elevation', 200)),
            state=data.get('state', 'Tamil Nadu')
        )
        return jsonify({'crops': crops})
    except Exception as e:
        print(f"Error in recommend-crops: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/ml/borewell-risk', methods=['POST'])
def borewell_risk():
    try:
        data = request.json
        result = borewell_model.predict(
            elevation=float(data.get('elevation', 200)),
            soil_depth=float(data.get('soil_depth', 100)),
            clay_content=float(data.get('clay_content', 30)),
            annual_rainfall=float(data.get('annual_rainfall', 800)),
            distance_to_river=float(data.get('distance_to_river', 5)),
            ndvi_score=float(data.get('ndvi_score', 0.4)),
            month=int(data.get('month', 6))
        )
        return jsonify(result)
    except Exception as e:
        print(f"Error in borewell-risk: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/ml/price-trend', methods=['POST'])
def price_trend():
    try:
        data = request.json
        prices = data.get('prices', [])
        result = price_model.predict(prices)
        return jsonify(result)
    except Exception as e:
        print(f"Error in price-trend: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/ml/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        query = data.get('query', data.get('message', ''))
        farm_context = data.get('farm_context', {})

        if not query:
            return jsonify({'error': 'query is required'}), 400

        result = farm_chat.chat(query, farm_context)
        return jsonify(result)
    except Exception as e:
        print(f"Error in chat: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/ml/chat/init', methods=['POST'])
def chat_init():
    try:
        farm_chat.initialize()
        return jsonify({'status': 'ok', 'message': 'Knowledge base initialized'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/ml/chat/health', methods=['GET'])
def chat_health():
    return jsonify(farm_chat.get_status())


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
