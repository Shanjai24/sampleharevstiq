import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'trained_models', 'borewell_risk.pkl')

class BorewellRiskScorer:
    def __init__(self):
        self.model = None
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)

    def train(self):
        data_path = os.path.join(BASE_DIR, 'data', 'borewell_training_data.csv')
        if not os.path.exists(data_path):
            from train.generate_training_data import generate_borewell_training_data
            generate_borewell_training_data()

        df = pd.read_csv(data_path)
        X = df.drop('risk_score', axis=1)
        y = df['risk_score']

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        self.model = GradientBoostingRegressor(
            n_estimators=200, max_depth=6, learning_rate=0.1, random_state=42
        )
        self.model.fit(X_train, y_train)

        mae = mean_absolute_error(y_test, self.model.predict(X_test))
        print(f"[OK] Borewell Risk Scorer trained - MAE: {mae:.2f}")

        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        return mae

    def predict(self, elevation, soil_depth, clay_content, annual_rainfall, distance_to_river, ndvi_score, month):
        if self.model is None:
            self.train()

        features = np.array([[elevation, soil_depth, clay_content, annual_rainfall,
                              distance_to_river, ndvi_score, month]])
        risk_score = float(self.model.predict(features)[0])
        risk_score = max(0, min(100, round(risk_score)))

        if risk_score >= 65:
            risk_level = 'HIGH'
        elif risk_score >= 35:
            risk_level = 'MODERATE'
        else:
            risk_level = 'LOW'

        # Feature importance breakdown
        importances = self.model.feature_importances_
        feature_names = ['elevation', 'soil_depth', 'clay_content', 'annual_rainfall',
                         'distance_to_river', 'ndvi_score', 'month']
        breakdown = {}
        for name, imp in zip(feature_names, importances):
            breakdown[name] = round(imp * 100, 1)

        # More detailed breakdown for UI
        breakdown_ui = {
            'soilDepth': min(100, max(0, round(100 - (soil_depth / 3)))),
            'elevation': min(100, max(0, round(elevation / 12))),
            'rainfall': min(100, max(0, round(100 - (annual_rainfall / 25)))),
            'waterDistance': min(100, max(0, round(distance_to_river * 4)))
        }

        return {
            'riskScore': risk_score,
            'riskLevel': risk_level,
            'breakdown': breakdown_ui,
            'featureImportance': breakdown
        }
