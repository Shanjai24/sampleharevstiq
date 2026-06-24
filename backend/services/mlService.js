const axios = require('axios');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

async function recommendCrops(data) {
  try {
    const response = await axios.post(`${ML_URL}/ml/recommend-crops`, data, { timeout: 15000 });
    return response.data;
  } catch (error) {
    console.error('ML Crop Recommendation error:', error.message);
    // Return fallback recommendations
    return {
      crops: [
        { crop: 'rice', score: 0.85, confidence: 'high' },
        { crop: 'groundnut', score: 0.78, confidence: 'medium' },
        { crop: 'cotton', score: 0.72, confidence: 'medium' }
      ]
    };
  }
}

async function getBorewellRisk(data) {
  try {
    const response = await axios.post(`${ML_URL}/ml/borewell-risk`, data, { timeout: 15000 });
    return response.data;
  } catch (error) {
    console.error('ML Borewell Risk error:', error.message);
    return {
      riskScore: 55,
      riskLevel: 'MODERATE',
      breakdown: {
        soilDepth: 60,
        elevation: 50,
        rainfall: 55,
        waterDistance: 45
      },
      explanation: 'Unable to connect to ML service. Showing estimated risk.'
    };
  }
}

async function getPriceTrend(data) {
  try {
    const response = await axios.post(`${ML_URL}/ml/price-trend`, data, { timeout: 15000 });
    return response.data;
  } catch (error) {
    console.error('ML Price Trend error:', error.message);
    return {
      predictedPrices: [],
      trend: 'STABLE',
      changePercent: 0
    };
  }
}

module.exports = { recommendCrops, getBorewellRisk, getPriceTrend };
