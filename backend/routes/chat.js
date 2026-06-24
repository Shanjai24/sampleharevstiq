const express = require('express');
const router = express.Router();
const { recommendCrops, getBorewellRisk } = require('../services/mlService');
const axios = require('axios');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { message, farmData } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Build farm context from stored farm data
    const farmContext = {};
    if (farmData) {
      farmContext.district = farmData.location?.district || '';
      farmContext.state = farmData.location?.state || '';
      farmContext.soil_type = farmData.soil?.soilType || '';
      farmContext.soil_ph = farmData.soil?.ph || '';
      farmContext.temperature = farmData.weather?.current?.temperature || '';
      farmContext.humidity = farmData.weather?.current?.humidity || '';
      farmContext.rainfall = farmData.weather?.rainfall7day || '';
      farmContext.crops = farmData.crops?.map(c => ({
        crop: c.crop || c.name,
        score: c.score
      })) || [];
    }

    // Forward to ML chat service
    const response = await axios.post(`${ML_URL}/ml/chat`, {
      query: message,
      farm_context: farmContext
    }, { timeout: 30000 });

    res.json({
      message: response.data.answer || response.data.message || 'No response from AI.',
      sources: response.data.sources || [],
      mode: response.data.mode || 'unknown'
    });
  } catch (error) {
    console.error('Chat error:', error.message);

    // Fallback response
    res.json({
      message: "I'm having trouble connecting to the AI service. Please make sure the ML service is running (python app.py in the ml/ directory) and try again.",
      sources: [],
      mode: 'error'
    });
  }
});

module.exports = router;
