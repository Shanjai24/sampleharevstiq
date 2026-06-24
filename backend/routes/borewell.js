const express = require('express');
const router = express.Router();
const { getElevation } = require('../services/elevationService');
const { getSoilData } = require('../services/soilService');
const { getWeather } = require('../services/weatherService');
const { getBorewellRisk } = require('../services/mlService');

// GET /api/borewell/:lat/:lng
router.get('/:lat/:lng', async (req, res) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);

    const [elevation, soil, weather] = await Promise.all([
      getElevation(lat, lng),
      getSoilData(lat, lng),
      getWeather(lat, lng)
    ]);

    const month = new Date().getMonth() + 1;
    const riskResult = await getBorewellRisk({
      elevation: elevation.elevation,
      soil_depth: soil.depth,
      clay_content: soil.clay,
      annual_rainfall: weather.rainfall7day * 52,
      distance_to_river: 5,
      ndvi_score: 0.4,
      month
    });

    // Detailed breakdown with explanations
    const breakdown = riskResult.breakdown || {};
    const riskScore = riskResult.riskScore || 50;
    const riskLevel = riskResult.riskLevel || 'MODERATE';

    // Generate recommendation based on risk
    let recommendation = '';
    let explanation = '';
    const estimatedCost = riskScore > 70 ? '₹80,000–₹1,50,000' : riskScore > 40 ? '₹50,000–₹80,000' : '₹30,000–₹50,000';

    if (riskLevel === 'HIGH') {
      recommendation = `⚠️ Borewell drilling is NOT recommended. Success probability is only ${100 - riskScore}%. Consider drip irrigation from nearby water sources instead.`;
      explanation = `Your area has shallow soil (${soil.depth}cm depth), elevation of ${elevation.elevation}m, and low annual rainfall estimates. These factors significantly reduce groundwater availability.`;
    } else if (riskLevel === 'MODERATE') {
      recommendation = `Borewell drilling may succeed, but consider getting a hydro-geological survey first. Success probability: ${100 - riskScore}%.`;
      explanation = `Your area has moderate groundwater potential. Soil depth of ${soil.depth}cm and clay content of ${soil.clay}% suggest some water retention capacity.`;
    } else {
      recommendation = `✅ Borewell drilling is feasible in your area. Success probability: ${100 - riskScore}%. Recommended depth: ${Math.round(soil.depth * 1.5)}ft.`;
      explanation = `Good groundwater potential due to adequate soil depth (${soil.depth}cm), favorable clay content (${soil.clay}%), and sufficient rainfall patterns.`;
    }

    res.json({
      riskScore,
      riskLevel,
      breakdown: {
        soilDepth: { score: breakdown.soilDepth || 50, value: `${soil.depth}cm`, label: 'Soil Depth' },
        elevation: { score: breakdown.elevation || 50, value: `${elevation.elevation}m`, label: 'Elevation' },
        rainfall: { score: breakdown.rainfall || 50, value: `${Math.round(weather.rainfall7day * 52)}mm/year`, label: 'Annual Rainfall' },
        waterDistance: { score: breakdown.waterDistance || 50, value: '~5km', label: 'Distance to Water Body' }
      },
      recommendation,
      explanation,
      estimatedCost,
      soil,
      elevation: elevation.elevation
    });
  } catch (error) {
    res.status(500).json({ error: 'Borewell risk assessment failed', message: error.message });
  }
});

module.exports = router;
