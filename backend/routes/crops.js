const express = require('express');
const router = express.Router();
const { recommendCrops } = require('../services/mlService');

// GET /api/crops/recommend?lat=&lng=&soilType=&temperature=&humidity=&rainfall=
router.get('/recommend', async (req, res) => {
  try {
    const { lat, lng, soilType, temperature, humidity, rainfall, month, elevation, state } = req.query;

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

module.exports = router;
