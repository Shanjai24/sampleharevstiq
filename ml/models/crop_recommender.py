import json
import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'trained_models', 'crop_recommender.pkl')

class CropRecommender:
    def __init__(self):
        self.model = None
        self.crop_names = []
        self.soil_types = ['sandy', 'loam', 'clay', 'silt']
        self.states = ['Tamil Nadu', 'Maharashtra', 'Madhya Pradesh', 'Gujarat', 'Uttar Pradesh',
                       'Karnataka', 'Andhra Pradesh', 'Rajasthan', 'Punjab', 'Telangana']
        self.state_encoding = {s: i for i, s in enumerate(self.states)}

        with open(os.path.join(BASE_DIR, 'data', 'crop_database.json'), 'r') as f:
            self.crop_db = json.load(f)
        self.crop_names = list(self.crop_db.keys())

        with open(os.path.join(BASE_DIR, 'data', 'soil_crop_matrix.json'), 'r') as f:
            self.soil_matrix = json.load(f)

        # Try to load pre-trained model
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)

    def train(self):
        data_path = os.path.join(BASE_DIR, 'data', 'crop_training_data.csv')
        if not os.path.exists(data_path):
            from train.generate_training_data import generate_crop_training_data
            generate_crop_training_data()

        df = pd.read_csv(data_path)
        X = df.drop('best_crop', axis=1)
        y = df['best_crop']

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        self.model = RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
        self.model.fit(X_train, y_train)

        accuracy = accuracy_score(y_test, self.model.predict(X_test))
        print(f"[OK] Crop Recommender trained - Accuracy: {accuracy:.2%}")

        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        return accuracy

    def predict(self, soil_type, soil_ph, avg_temperature, rainfall_7day, humidity, month, elevation, state):
        if self.model is None:
            self.train()

        soil_enc = self.soil_types.index(soil_type) if soil_type in self.soil_types else 1
        state_enc = self.state_encoding.get(state, 0)

        features = np.array([[soil_enc, soil_ph, avg_temperature, rainfall_7day,
                              humidity, month, elevation, state_enc]])

        probabilities = self.model.predict_proba(features)[0]
        top_indices = np.argsort(probabilities)[-5:][::-1]

        results = []
        for idx in top_indices:
            if idx < len(self.crop_names):
                crop_name = self.crop_names[idx]
                crop_info = self.crop_db.get(crop_name, {})
                soil_score = self.soil_matrix.get(soil_type, {}).get(crop_name, 0.5)

                # Calculate weather match
                temp_match = 1.0 if crop_info.get('minTemp', 0) <= avg_temperature <= crop_info.get('maxTemp', 40) else 0.5
                season_match = 1.0 if month in crop_info.get('plantMonths', []) else 0.6

                results.append({
                    'crop': crop_name,
                    'name': crop_info.get('name', crop_name),
                    'score': round(float(probabilities[idx]), 2),
                    'soilMatch': round(soil_score * 100),
                    'weatherMatch': round(temp_match * season_match * 100),
                    'harvestDays': crop_info.get('harvestDays', 100),
                    'waterPerDay': crop_info.get('waterPerDay', 5),
                    'plantMonths': crop_info.get('plantMonths', []),
                    'tips': crop_info.get('tips', []),
                    'confidence': 'high' if probabilities[idx] > 0.2 else 'medium' if probabilities[idx] > 0.1 else 'low'
                })

        return results[:5]
