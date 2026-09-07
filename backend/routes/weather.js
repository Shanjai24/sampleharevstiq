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
    const waterNeeded = Math.max(0, et - rainfall); // mm needed
    const litresPerAcre = Math.round(waterNeeded * 4047); // 1 acre = 4047 sq meters, 1mm = 1L/sqm

    const tomorrowRain = weather.forecast[1]?.precipitation || 0;
    const next24hRain = (weather.current.precipitation || 0) + (weather.forecast[0]?.precipitation || 0);

    let irrigationAdvice = '';
    if (litresPerAcre > 0 && tomorrowRain > 5) {
      irrigationAdvice = `Your field needs ${litresPerAcre.toLocaleString()} litres today, but rain is expected tomorrow (${tomorrowRain}mm) — consider skipping irrigation.`;
    } else if (litresPerAcre > 0) {
      irrigationAdvice = `Your field needs approximately ${litresPerAcre.toLocaleString()} litres per acre today.`;
    } else {
      irrigationAdvice = 'No irrigation needed today — sufficient rainfall.';
    }

    // Actionable Weather Alerts (Phase 2.2)
    const alerts = [];

    // 1. Spray window advisory
    if (next24hRain > 5.0) {
      alerts.push({
        id: 'spray-warning',
        severity: 'warning',
        type: 'spray_window',
        title: '⚠️ Unfavourable Spraying Window',
        message: `Heavy rain forecast in next 24h (${next24hRain.toFixed(1)}mm). Avoid applying pesticides or fertilizers today to prevent chemical wash-off and wasted input costs.`
      });
    } else {
      alerts.push({
        id: 'spray-good',
        severity: 'info',
        type: 'spray_window',
        title: '✅ Optimal Spraying Window',
        message: 'Clear weather conditions expected over the next 24h — suitable for pesticide and foliar fertilizer application.'
      });
    }

    // 2. Cold stress / frost warning
    const minTempWeek = Math.min(...weather.forecast.map(f => f.minTemp || 25));
    if (minTempWeek < 14) {
      alerts.push({
        id: 'frost-warning',
        severity: 'danger',
        type: 'cold_stress',
        title: '🥶 Cold Stress / Frost Warning',
        message: `Temperatures dropping to ${minTempWeek}°C this week. Sensitive crops (tomato, chilli, banana) may experience growth stagnation. Protect nursery beds.`
      });
    }

    // 3. Heavy rain crop damage risk
    const maxRainSingleDay = Math.max(...weather.forecast.map(f => f.precipitation || 0));
    if (maxRainSingleDay > 35) {
      alerts.push({
        id: 'heavy-rain-warning',
        severity: 'danger',
        type: 'heavy_rain',
        title: '🌧️ Torrential Rain Alert',
        message: `Single-day rainfall expected up to ${maxRainSingleDay}mm. Ensure field drainage channels are cleared to prevent waterlogging and root rot.`
      });
    }

    res.json({
      ...weather,
      irrigation: {
        waterNeededMM: Math.round(waterNeeded * 10) / 10,
        litresPerAcre,
        advice: irrigationAdvice,
        tomorrowRain
      },
      alerts
    });
  } catch (error) {
    res.status(500).json({ error: 'Weather fetch failed', message: error.message });
  }
});

module.exports = router;
