import json
import os
import random
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def generate_crop_training_data(n_samples=8000):
    """Generate synthetic training data for crop recommendation model."""
    with open(os.path.join(BASE_DIR, 'data', 'crop_database.json'), 'r') as f:
        crops = json.load(f)
    with open(os.path.join(BASE_DIR, 'data', 'soil_crop_matrix.json'), 'r') as f:
        soil_matrix = json.load(f)

    soil_types = ['sandy', 'loam', 'clay', 'silt']
    soil_encoding = {s: i for i, s in enumerate(soil_types)}
    crop_names = list(crops.keys())
    states = ['Tamil Nadu', 'Maharashtra', 'Madhya Pradesh', 'Gujarat', 'Uttar Pradesh',
              'Karnataka', 'Andhra Pradesh', 'Rajasthan', 'Punjab', 'Telangana']
    state_encoding = {s: i for i, s in enumerate(states)}

    data = []
    for _ in range(n_samples):
        soil_type = random.choice(soil_types)
        soil_ph = round(random.uniform(4.5, 8.5), 1)
        avg_temp = round(random.uniform(10, 42), 1)
        rainfall = round(random.uniform(0, 200), 1)
        humidity = round(random.uniform(20, 95), 1)
        month = random.randint(1, 12)
        elevation = round(random.uniform(0, 1500), 0)
        state = random.choice(states)

        # Score each crop based on features
        best_crop = None
        best_score = -1

        for crop_name, crop_info in crops.items():
            score = 0.0

            # Soil compatibility
            soil_score = soil_matrix.get(soil_type, {}).get(crop_name, 0.5)
            score += soil_score * 0.25

            # pH compatibility
            ph_min, ph_max = crop_info['phRange']
            if ph_min <= soil_ph <= ph_max:
                score += 0.15
            elif abs(soil_ph - ph_min) < 1 or abs(soil_ph - ph_max) < 1:
                score += 0.07

            # Temperature compatibility
            if crop_info['minTemp'] <= avg_temp <= crop_info['maxTemp']:
                score += 0.20
            elif abs(avg_temp - crop_info['minTemp']) < 5 or abs(avg_temp - crop_info['maxTemp']) < 5:
                score += 0.08

            # Season/month match
            if month in crop_info.get('plantMonths', []):
                score += 0.15
            elif any(abs(month - m) <= 1 or abs(month - m) >= 11 for m in crop_info.get('plantMonths', [])):
                score += 0.07

            # Rainfall (water-loving crops need more rain)
            water_need = crop_info['waterPerDay']
            if water_need > 7 and rainfall > 50:
                score += 0.10
            elif water_need <= 5 and rainfall < 80:
                score += 0.10
            elif 5 < water_need <= 7 and 30 < rainfall < 120:
                score += 0.10

            # Elevation factor
            if elevation < 500 and crop_name in ['rice', 'sugarcane', 'banana']:
                score += 0.05
            elif elevation > 500 and crop_name in ['wheat', 'chickpea', 'mustard']:
                score += 0.05

            # Add some noise
            score += random.uniform(-0.05, 0.05)
            score = max(0, min(1, score))

            if score > best_score:
                best_score = score
                best_crop = crop_name

        data.append({
            'soil_type': soil_encoding[soil_type],
            'soil_ph': soil_ph,
            'avg_temperature': avg_temp,
            'rainfall_7day': rainfall,
            'humidity': humidity,
            'month': month,
            'elevation': elevation,
            'state': state_encoding[state],
            'best_crop': crop_names.index(best_crop)
        })

    df = pd.DataFrame(data)
    output_path = os.path.join(BASE_DIR, 'data', 'crop_training_data.csv')
    df.to_csv(output_path, index=False)
    print(f"[OK] Generated {len(df)} crop training samples -> {output_path}")
    return df


def generate_borewell_training_data(n_samples=6000):
    """Generate synthetic training data for borewell risk model."""
    data = []
    for _ in range(n_samples):
        elevation = round(random.uniform(0, 1200), 0)
        soil_depth = round(random.uniform(10, 300), 0)
        clay_content = round(random.uniform(5, 70), 1)
        annual_rainfall = round(random.uniform(200, 2500), 0)
        distance_to_river = round(random.uniform(0.5, 50), 1)
        ndvi = round(random.uniform(0.1, 0.8), 2)
        month = random.randint(1, 12)

        # Calculate risk score based on agronomic rules
        risk = 50.0  # base

        # Higher elevation = higher risk
        if elevation > 800:
            risk += 20
        elif elevation > 500:
            risk += 10
        elif elevation < 200:
            risk -= 15

        # Shallow soil = higher risk
        if soil_depth < 50:
            risk += 25
        elif soil_depth < 100:
            risk += 10
        elif soil_depth > 200:
            risk -= 15

        # Low clay = higher risk (clay retains water)
        if clay_content < 15:
            risk += 15
        elif clay_content > 40:
            risk -= 10

        # Low rainfall = higher risk
        if annual_rainfall < 500:
            risk += 20
        elif annual_rainfall < 800:
            risk += 10
        elif annual_rainfall > 1500:
            risk -= 15

        # Far from water body = higher risk
        if distance_to_river > 20:
            risk += 15
        elif distance_to_river < 5:
            risk -= 10

        # Low vegetation = higher risk
        if ndvi < 0.2:
            risk += 10
        elif ndvi > 0.5:
            risk -= 5

        # Seasonal: post-monsoon = lower risk
        if month in [9, 10, 11]:
            risk -= 10
        elif month in [3, 4, 5]:
            risk += 10

        # Add noise and clamp
        risk += random.uniform(-8, 8)
        risk = max(0, min(100, risk))

        data.append({
            'elevation': elevation,
            'soil_depth': soil_depth,
            'clay_content': clay_content,
            'annual_rainfall': annual_rainfall,
            'distance_to_river': distance_to_river,
            'ndvi_score': ndvi,
            'month': month,
            'risk_score': round(risk, 1)
        })

    df = pd.DataFrame(data)
    output_path = os.path.join(BASE_DIR, 'data', 'borewell_training_data.csv')
    df.to_csv(output_path, index=False)
    print(f"[OK] Generated {len(df)} borewell training samples -> {output_path}")
    return df


if __name__ == '__main__':
    print("Generating training data for FarmSense ML models...")
    generate_crop_training_data()
    generate_borewell_training_data()
    print("All training data generated!")
