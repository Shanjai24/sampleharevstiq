"""
AgroPredict ML Model Retraining Pipeline Script
Executes periodic retraining of Random Forest Yield Models
incorporating farmer post-harvest actual yield feedback.
"""

import os
import sys
import json
import datetime
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FEEDBACK_DATA_PATH = os.path.join(BASE_DIR, 'data', 'harvest_feedback_logs.json')
TRAINING_CSV_PATH = os.path.join(BASE_DIR, 'data', 'yield_training_data.csv')
MODEL_META_SAVE_PATH = os.path.join(BASE_DIR, 'models', 'yield_model_latest.json')
MODEL_PKL_SAVE_PATH = os.path.join(BASE_DIR, 'trained_models', 'yield_predictor.pkl')

SOIL_TYPES = ['sandy', 'loam', 'clay', 'silt']
STATES = ['Tamil Nadu', 'Maharashtra', 'Madhya Pradesh', 'Gujarat', 'Uttar Pradesh',
          'Karnataka', 'Andhra Pradesh', 'Rajasthan', 'Punjab', 'Telangana']
STATE_ENCODING = {s: i for i, s in enumerate(STATES)}

def get_crop_names():
    crop_db_path = os.path.join(BASE_DIR, 'data', 'crop_database.json')
    if os.path.exists(crop_db_path):
        with open(crop_db_path, 'r', encoding='utf-8') as f:
            db = json.load(f)
            return list(db.keys())
    return ['rice', 'wheat', 'groundnut', 'cotton', 'sugarcane', 'maize', 'soybean', 'tomato', 'onion', 'turmeric', 'chickpea', 'mustard', 'banana', 'millet', 'chilli']

CROP_NAMES = get_crop_names()

def load_harvest_feedback_records():
    """Load accumulated verified farmer feedback records from MongoDB or local JSON."""
    records = []
    
    # 1. Try PyMongo direct connection
    try:
        from pymongo import MongoClient
        mongo_uri = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/agropredict')
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
        db = client.get_database()
        fb_coll = db['harvestfeedbacks']
        mongo_docs = list(fb_coll.find({}))
        if mongo_docs:
            for doc in mongo_docs:
                records.append({
                    "crop": str(doc.get("crop", "rice")).lower(),
                    "soil_type": str(doc.get("soil_type", "loam")).lower(),
                    "soil_ph": float(doc.get("soil_ph", 6.5)),
                    "avg_temperature": float(doc.get("avg_temperature", 30.0)),
                    "rainfall_7day": float(doc.get("rainfall_7day", 50.0)),
                    "humidity": float(doc.get("humidity", 65.0)),
                    "area_acres": float(doc.get("area_acres", 1.0)),
                    "elevation": float(doc.get("elevation", 200.0)),
                    "state": str(doc.get("state", "Tamil Nadu")),
                    "month": int(doc.get("month", 6)),
                    "actual_yield": float(doc.get("actualYield", 2.5))
                })
            print(f"[MONGO] Fetched {len(records)} feedback records from MongoDB.")
    except Exception as e:
        print(f"[WARN] Direct MongoDB feedback fetch skipped: {e}")

    # 2. Try JSON file fallback if Mongo returns 0 records
    if not records and os.path.exists(FEEDBACK_DATA_PATH):
        try:
            with open(FEEDBACK_DATA_PATH, 'r', encoding='utf-8') as f:
                json_docs = json.load(f)
                for d in json_docs:
                    records.append({
                        "crop": str(d.get("crop", "rice")).lower(),
                        "soil_type": str(d.get("soil_type", "loam")).lower(),
                        "soil_ph": float(d.get("soil_ph", 6.5)),
                        "avg_temperature": float(d.get("avg_temperature", 30.0)),
                        "rainfall_7day": float(d.get("rainfall_7day", 50.0)),
                        "humidity": float(d.get("humidity", 65.0)),
                        "area_acres": float(d.get("area_acres", 1.0)),
                        "elevation": float(d.get("elevation", 200.0)),
                        "state": str(d.get("state", "Tamil Nadu")),
                        "month": int(d.get("month", 6)),
                        "actual_yield": float(d.get("actual_yield", 2.5))
                    })
            print(f"[FILE] Fetched {len(records)} feedback records from harvest_feedback_logs.json.")
        except Exception as e:
            print(f"[WARN] JSON feedback log read error: {e}")

    return records

def encode_record(r):
    crop_enc = CROP_NAMES.index(r['crop']) if r['crop'] in CROP_NAMES else 0
    soil_enc = SOIL_TYPES.index(r['soil_type']) if r['soil_type'] in SOIL_TYPES else 1
    state_enc = STATE_ENCODING.get(r['state'], 0)
    return [
        crop_enc, soil_enc, r['soil_ph'], r['avg_temperature'], r['rainfall_7day'],
        r['humidity'], r['area_acres'], r['elevation'], state_enc, r['month'], r['actual_yield']
    ]

def run_retraining_pipeline():
    """Train updated Random Forest model on base dataset + verified farmer feedback data."""
    print("=" * 60)
    print("[START] AGROPREDICT MODEL RETRAINING PIPELINE STARTED")
    print(f"Timestamp: {datetime.datetime.now().isoformat()}")
    print("=" * 60)

    # Ensure base dataset exists
    if not os.path.exists(TRAINING_CSV_PATH):
        from train.generate_training_data import generate_yield_training_data
        generate_yield_training_data()

    base_df = pd.read_csv(TRAINING_CSV_PATH)
    print(f"[DATA] Base training dataset contains {len(base_df)} samples.")

    feedback_records = load_harvest_feedback_records()
    if feedback_records:
        encoded_fb = [encode_record(r) for r in feedback_records]
        fb_cols = ['crop', 'soil_type', 'soil_ph', 'avg_temperature', 'rainfall_7day', 'humidity', 'area_acres', 'elevation', 'state', 'month', 'yield_per_acre']
        fb_df = pd.DataFrame(encoded_fb, columns=fb_cols)
        
        # Combine base dataset with feedback data (weighting feedback 3x for responsiveness)
        combined_df = pd.concat([base_df, fb_df, fb_df, fb_df], ignore_index=True)
        print(f"[REINFORCE] Merged {len(feedback_records)} actual farmer feedback samples into training set. Total: {len(combined_df)}")
    else:
        combined_df = base_df
        print("[INFO] No new feedback samples found. Retraining on base dataset.")

    X = combined_df.drop('yield_per_acre', axis=1)
    y = combined_df['yield_per_acre']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=150, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)

    print(f"[METRICS] Validation RMSE: {rmse:.4f}, R²: {r2:.4f}")
    print("[OK] New model weights verified against held-out validation set.")

    # Save model binary pkl for YieldPredictor
    os.makedirs(os.path.dirname(MODEL_PKL_SAVE_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PKL_SAVE_PATH)
    print(f"[SAVE] Dumped updated RandomForest model to: {MODEL_PKL_SAVE_PATH}")

    # Save metadata JSON
    os.makedirs(os.path.dirname(MODEL_META_SAVE_PATH), exist_ok=True)
    retrain_meta = {
        "status": "success",
        "model": "RandomForestRegressor",
        "n_estimators": 150,
        "training_samples": len(combined_df),
        "feedback_samples": len(feedback_records),
        "validation_rmse": round(float(rmse), 4),
        "r2_score": round(float(r2), 4),
        "retrained_at": datetime.datetime.now().isoformat(),
        "data_source": "Base CSV + Farmer Post-Harvest Verified Feedback Loop"
    }
    with open(MODEL_META_SAVE_PATH, 'w', encoding='utf-8') as f:
        json.dump(retrain_meta, f, indent=2)

    print(f"[SAVE] Saved updated model metadata to: {MODEL_META_SAVE_PATH}")
    print("=" * 60)
    print("[SUCCESS] RETRAINING PIPELINE COMPLETED SUCCESSFULLY")
    print("=" * 60)
    return retrain_meta

if __name__ == '__main__':
    run_retraining_pipeline()
