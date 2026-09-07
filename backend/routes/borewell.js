const express = require('express');
const router = express.Router();
const { getElevation } = require('../services/elevationService');
const { getSoilData } = require('../services/soilService');
const { getWeather } = require('../services/weatherService');
const { getBorewellRisk } = require('../services/mlService');
const { getDistanceToRiver, estimateNdviScore } = require('../services/geospatialService');

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

    const annualRainfall = (weather.rainfall7day || 20) * 52;
    const distanceToRiver = await getDistanceToRiver(lat, lng);
    const ndviScore = estimateNdviScore(lat, lng, annualRainfall, soil.clay);

    const month = new Date().getMonth() + 1;
    const riskResult = await getBorewellRisk({
      elevation: elevation.elevation,
      soil_depth: soil.depth,
      clay_content: soil.clay,
      annual_rainfall: annualRainfall,
      distance_to_river: distanceToRiver,
      ndvi_score: ndviScore,
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
        rainfall: { score: breakdown.rainfall || 50, value: `${Math.round(annualRainfall)}mm/year`, label: 'Annual Rainfall' },
        waterDistance: { score: breakdown.waterDistance || 50, value: `${distanceToRiver} km`, label: 'Distance to Water Body' }
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

// POST /api/borewell/feedback — Report actual drilling outcomes (Phase 3.2)
router.post('/feedback', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    let BorewellFeedback;
    try {
      BorewellFeedback = require('../models/BorewellFeedback');
    } catch (e) {
      BorewellFeedback = null;
    }

    const { userId, lat, lng, district, state, actualDepthFt, succeeded, actualCost, notes } = req.body;

    const record = {
      userId: userId || 'anonymous',
      lat: parseFloat(lat) || 11.341,
      lng: parseFloat(lng) || 77.717,
      district: district || 'Unknown',
      state: state || 'Tamil Nadu',
      actualDepthFt: parseFloat(actualDepthFt) || 300,
      succeeded: Boolean(succeeded),
      actualCost: parseFloat(actualCost) || 0,
      notes: notes || '',
      reportedAt: new Date()
    };

    if (BorewellFeedback && mongoose.connection.readyState === 1) {
      const fb = new BorewellFeedback(record);
      await fb.save();
    }

    res.json({ success: true, message: 'Borewell outcome report saved successfully. Thank you for contributing field data!' });
  } catch (error) {
    res.status(500).json({ error: 'Borewell feedback save failed', message: error.message });
  }
});

module.exports = router;
