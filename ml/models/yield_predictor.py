import json
import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'trained_models', 'yield_predictor.pkl')

class YieldPredictor:
    def __init__(self):
        self.model = None
        self.soil_types = ['sandy', 'loam', 'clay', 'silt']
        self.states = ['Tamil Nadu', 'Maharashtra', 'Madhya Pradesh', 'Gujarat', 'Uttar Pradesh',
                       'Karnataka', 'Andhra Pradesh', 'Rajasthan', 'Punjab', 'Telangana']
        self.state_encoding = {s: i for i, s in enumerate(self.states)}

        with open(os.path.join(BASE_DIR, 'data', 'crop_database.json'), 'r', encoding='utf-8') as f:
            self.crop_db = json.load(f)
        self.crop_names = list(self.crop_db.keys())

        with open(os.path.join(BASE_DIR, 'data', 'soil_crop_matrix.json'), 'r', encoding='utf-8') as f:
            self.soil_matrix = json.load(f)

        # Try to load pre-trained model
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)

    def train(self):
        data_path = os.path.join(BASE_DIR, 'data', 'yield_training_data.csv')
        if not os.path.exists(data_path):
            from train.generate_training_data import generate_yield_training_data
            generate_yield_training_data()

        df = pd.read_csv(data_path)
        X = df.drop('yield_per_acre', axis=1)
        y = df['yield_per_acre']

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        self.model = RandomForestRegressor(
            n_estimators=150, max_depth=12, random_state=42, n_jobs=-1
        )
        self.model.fit(X_train, y_train)

        y_pred = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        print(f"[OK] Yield Predictor trained - MAE: {mae:.4f}, R²: {r2:.4f}")

        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        return {'mae': mae, 'r2': r2}

    def predict(self, crop, soil_type, soil_ph, avg_temperature, rainfall_7day, humidity, area_acres, elevation, state, month):
        if self.model is None:
            self.train()

        # Encoding
        crop_enc = self.crop_names.index(crop) if crop in self.crop_names else 0
        soil_enc = self.soil_types.index(soil_type) if soil_type in self.soil_types else 1
        state_enc = self.state_encoding.get(state, 0)

        # Build feature vector matching training columns order exactly
        features = pd.DataFrame([[
            crop_enc, soil_enc, soil_ph, avg_temperature, rainfall_7day,
            humidity, area_acres, elevation, state_enc, month
        ]], columns=['crop', 'soil_type', 'soil_ph', 'avg_temperature', 'rainfall_7day', 'humidity', 'area_acres', 'elevation', 'state', 'month'])

        predicted_yield_per_acre = float(self.model.predict(features)[0])
        predicted_yield_per_acre = max(0.05, round(predicted_yield_per_acre, 2))
        total_yield = round(predicted_yield_per_acre * area_acres, 2)

        # Calculate confidence level & explanations based on ideal conditions
        crop_info = self.crop_db.get(crop, {})
        reasons_good = []
        reasons_bad = []
        matches_count = 0

        # Soil type match
        best_soils = crop_info.get('bestSoil', [])
        soil_score = self.soil_matrix.get(soil_type, {}).get(crop, 0.5)
        if soil_type in best_soils or soil_score >= 0.7:
            matches_count += 1
            reasons_good.append(f"Highly compatible {soil_type} soil")
        elif soil_score < 0.5:
            reasons_bad.append(f"Low soil compatibility ({soil_type})")

        # pH match
        ph_min, ph_max = crop_info.get('phRange', [6.0, 7.5])
        if ph_min <= soil_ph <= ph_max:
            matches_count += 1
            reasons_good.append("Soil pH is in the optimal range")
        else:
            reasons_bad.append(f"Ideal pH range is {ph_min}-{ph_max} (currently {soil_ph})")

        # Temperature match
        t_min, t_max = crop_info.get('minTemp', 15), crop_info.get('maxTemp', 35)
        if t_min <= avg_temperature <= t_max:
            matches_count += 1
            reasons_good.append("Temperature is suitable for growth")
        else:
            reasons_bad.append(f"Ideal temperature is {t_min}-{t_max}°C (currently {avg_temperature}°C)")

        # Rainfall match
        water_need_7d = crop_info.get('waterPerDay', 5) * 7
        if 0.7 * water_need_7d <= rainfall_7day <= 1.5 * water_need_7d:
            matches_count += 1
            reasons_good.append("Water/rainfall levels are optimal")
        elif rainfall_7day < 0.7 * water_need_7d:
            reasons_bad.append(f"Insufficient moisture (needs ~{round(water_need_7d)}mm weekly, got {rainfall_7day}mm)")
        else:
            reasons_bad.append(f"Excessive rainfall (needs ~{round(water_need_7d)}mm weekly, got {rainfall_7day}mm)")

        # Season match
        plant_months = crop_info.get('plantMonths', [])
        if month in plant_months:
            matches_count += 1
            reasons_good.append("Planted during the ideal seasonal window")
        else:
            reasons_bad.append("Out-of-season planting may lower yield")

        # Confidence rating
        if matches_count >= 4:
            confidence = 'HIGH'
        elif matches_count >= 2:
            confidence = 'MEDIUM'
        else:
            confidence = 'LOW'

        explanation = {
            'helps': reasons_good,
            'hurts': reasons_bad
        }

        return {
            'predictedYieldPerAcre': predicted_yield_per_acre,
            'totalYield': total_yield,
            'confidence': confidence,
            'explanation': explanation
        }
