const express = require('express');
const router = express.Router();
const { getWeather } = require('../services/weatherService');

// GET /api/weather/:lat/:lng
router.get('/:lat/:lng', async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const weather = await getWeather(parseFloat(lat), parseFloat(lng));

    // Calculate irrigation recommendation
    const et = weather.evapotranspiration;
    const rainfall = weather.current.precipitation;
    const waterNeeded = Math.max(0, (et * 10) - rainfall); // mm needed
    const litresPerAcre = Math.round(waterNeeded * 4047); // 1 acre = 4047 sq meters, 1mm = 1L/sqm

    const tomorrowRain = weather.forecast[1]?.precipitation || 0;

    let irrigationAdvice = '';
    if (litresPerAcre > 0 && tomorrowRain > 5) {
      irrigationAdvice = `Your field needs ${litresPerAcre.toLocaleString()} litres today, but rain is expected tomorrow (${tomorrowRain}mm) — consider skipping irrigation.`;
    } else if (litresPerAcre > 0) {
      irrigationAdvice = `Your field needs approximately ${litresPerAcre.toLocaleString()} litres per acre today.`;
    } else {
      irrigationAdvice = 'No irrigation needed today — sufficient rainfall.';
    }

    res.json({
      ...weather,
      irrigation: {
        waterNeededMM: Math.round(waterNeeded * 10) / 10,
        litresPerAcre,
        advice: irrigationAdvice,
        tomorrowRain
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Weather fetch failed', message: error.message });
  }
});

module.exports = router;
