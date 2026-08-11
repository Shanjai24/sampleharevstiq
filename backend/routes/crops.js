const express = require('express');
const router = express.Router();
const { recommendCrops, predictYield } = require('../services/mlService');
const { getWeather } = require('../services/weatherService');
const { getSoilData } = require('../services/soilService');
const { getElevation } = require('../services/elevationService');

// GET /api/crops/recommend?lat=&lng=&soilType=&temperature=&humidity=&rainfall=
router.get('/recommend', async (req, res) => {
  try {
    let { lat, lng, soilType, temperature, humidity, rainfall, month, elevation, state } = req.query;

    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      const [weather, soil, elevationData] = await Promise.all([
        getWeather(parsedLat, parsedLng),
        getSoilData(parsedLat, parsedLng),
        getElevation(parsedLat, parsedLng)
      ]);

      soilType = soilType || soil.soilType;
      temperature = temperature || weather.current.temperature;
      humidity = humidity || weather.current.humidity;
      rainfall = rainfall || weather.rainfall7day;
      elevation = elevation || elevationData.elevation;
    }

    const result = await recommendCrops({
      soil_type: soilType || 'loam',
      soil_ph: 6.5,
      avg_temperature: parseFloat(temperature) || 30,
      rainfall_7day: parseFloat(rainfall) || 20,
      humidity: parseFloat(humidity) || 65,
      month: parseInt(month) || new Date().getMonth() + 1,
      elevation: parseFloat(elevation) || 200,
      state: state || 'Tamil Nadu'
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Crop recommendation failed', message: error.message });
  }
});

// POST /api/crops/predict-yield
router.post('/predict-yield', async (req, res) => {
  try {
    const { crop, soilType, soilPh, temperature, rainfall, humidity, areaAcres, elevation, state, month } = req.body;

    const result = await predictYield({
      crop: crop || 'rice',
      soil_type: soilType || 'loam',
      soil_ph: parseFloat(soilPh) || 6.5,
      avg_temperature: parseFloat(temperature) || 30.0,
      rainfall_7day: parseFloat(rainfall) || 50.0,
      humidity: parseFloat(humidity) || 60.0,
      area_acres: parseFloat(areaAcres) || 1.0,
      elevation: parseFloat(elevation) || 200.0,
      state: state || 'Tamil Nadu',
      month: parseInt(month) || new Date().getMonth() + 1
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Yield prediction failed', message: error.message });
  }
});

module.exports = router;
