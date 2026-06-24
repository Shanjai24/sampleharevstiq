const express = require('express');
const router = express.Router();
const { getWeather } = require('../services/weatherService');
const { getSoilData } = require('../services/soilService');
const { getElevation } = require('../services/elevationService');
const { getMarketPrices } = require('../services/marketService');
const { recommendCrops, getBorewellRisk } = require('../services/mlService');
const axios = require('axios');

// POST /api/farm/analyse — Main analysis endpoint
router.post('/analyse', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    // Reverse geocode for district/state
    let district = 'Unknown', state = 'Unknown';
    try {
      const geoRes = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: { lat, lon: lng, format: 'json', 'accept-language': 'en' },
        headers: { 'User-Agent': 'FarmSense/1.0' },
        timeout: 8000
      });
      const addr = geoRes.data.address || {};
      district = addr.county || addr.state_district || addr.city || 'Unknown';
      state = addr.state || 'Unknown';
    } catch (e) {
      console.error('Geocoding error:', e.message);
    }

    // Fetch all data in parallel
    const [weather, soil, elevationData] = await Promise.all([
      getWeather(lat, lng),
      getSoilData(lat, lng),
      getElevation(lat, lng)
    ]);

    // Get ML predictions
    const month = new Date().getMonth() + 1;
    const [cropRecommendation, borewellRisk] = await Promise.all([
      recommendCrops({
        soil_type: soil.soilType,
        soil_ph: soil.ph,
        avg_temperature: weather.current.temperature,
        rainfall_7day: weather.rainfall7day,
        humidity: weather.current.humidity,
        month: month,
        elevation: elevationData.elevation,
        state: state
      }),
      getBorewellRisk({
        elevation: elevationData.elevation,
        soil_depth: soil.depth,
        clay_content: soil.clay,
        annual_rainfall: weather.rainfall7day * 52,
        distance_to_river: 5,
        ndvi_score: 0.4,
        month: month
      })
    ]);

    // Get market prices for top crops
    const topCrops = cropRecommendation.crops || [];
    const cropsWithPrices = await Promise.all(
      topCrops.slice(0, 5).map(async (c) => {
        const prices = await getMarketPrices(state, c.crop);
        const topPrice = prices[0];
        return {
          ...c,
          currentPrice: topPrice?.modalPrice || 0,
          market: topPrice?.market || 'N/A',
          prices: prices.slice(0, 5)
        };
      })
    );

    const result = {
      location: { lat, lng, district, state },
      weather: {
        current: weather.current,
        soilTemperature: weather.soilTemperature,
        evapotranspiration: weather.evapotranspiration,
        forecast: weather.forecast,
        rainfall7day: weather.rainfall7day
      },
      soil: {
        ...soil,
        soilType: soil.soilType
      },
      elevation: elevationData.elevation,
      borewell: borewellRisk,
      crops: cropsWithPrices,
      analyzedAt: new Date().toISOString()
    };

    res.json(result);
  } catch (error) {
    console.error('Farm analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
});

module.exports = router;
