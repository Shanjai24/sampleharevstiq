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

// GET /api/crops/rotation?state=&soilType=&currentCrop=
router.get('/rotation', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    const { state = 'Tamil Nadu', soilType = 'loam', currentCrop = 'rice' } = req.query;
    
    let seasonsData = {};
    let soilMatrix = {};

    try {
      const sPath = path.join(__dirname, '../../ml/data/state_seasons.json');
      if (fs.existsSync(sPath)) seasonsData = JSON.parse(fs.readFileSync(sPath, 'utf8'));

      const mPath = path.join(__dirname, '../../ml/data/soil_crop_matrix.json');
      if (fs.existsSync(mPath)) soilMatrix = JSON.parse(fs.readFileSync(mPath, 'utf8'));
    } catch (e) {
      console.warn('Rotation data read error:', e.message);
    }

    const stateCalendar = seasonsData[state] || seasonsData['Tamil Nadu'];

    // Rotation logic: Legumes / Soil restorers follow heavy feeders
    // Kharif (Monsoon) -> Rabi (Winter) -> Summer (Pre-monsoon)
    const kharifCrops = stateCalendar.kharif?.crops || ['rice', 'cotton', 'maize'];
    const rabiCrops = stateCalendar.rabi?.crops || ['wheat', 'chickpea', 'onion'];
    const summerCrops = stateCalendar.summer?.crops || ['groundnut', 'tomato', 'chilli'];

    // Select distinct crops that fix nitrogen or rotate plant family
    const curLower = currentCrop.toLowerCase();

    // 1. Season 1 (Current / Kharif): Main crop
    const season1Crop = kharifCrops.includes(curLower) ? curLower : kharifCrops[0];

    // 2. Season 2 (Rabi): Complementary crop (e.g. pulse / chickpea / mustard if main was cereal)
    const leguminousRabi = rabiCrops.find(c => ['chickpea', 'groundnut', 'mustard'].includes(c));
    const season2Crop = leguminousRabi || rabiCrops.find(c => c !== season1Crop) || rabiCrops[0];

    // 3. Season 3 (Summer): Short duration / restorative crop
    const season3Crop = summerCrops.find(c => c !== season1Crop && c !== season2Crop) || summerCrops[0];

    const plan = [
      {
        season: 'Season 1 (Kharif / Monsoon)',
        months: 'Jun – Sep',
        crop: season1Crop,
        role: 'Primary Yield Crop',
        benefit: 'Capitalizes on monsoon moisture and high soil nitrogen availability.',
        soilScore: Math.round((soilMatrix[soilType]?.[season1Crop] || 0.8) * 100)
      },
      {
        season: 'Season 2 (Rabi / Winter)',
        months: 'Oct – Jan',
        crop: season2Crop,
        role: ['chickpea', 'groundnut'].includes(season2Crop) ? 'Nitrogen-Fixing Legume' : 'Secondary Cash Crop',
        benefit: ['chickpea', 'groundnut'].includes(season2Crop) 
          ? 'Fixes atmospheric nitrogen into root nodules, restoring soil fertility for next season.'
          : 'Differs in root depth to draw nutrients from deeper soil layers.',
        soilScore: Math.round((soilMatrix[soilType]?.[season2Crop] || 0.75) * 100)
      },
      {
        season: 'Season 3 (Summer / Zaid)',
        months: 'Feb – May',
        crop: season3Crop,
        role: 'Short-Duration Soil Cover',
        benefit: 'Prevents soil erosion, maintains organic matter, and generates summer income.',
        soilScore: Math.round((soilMatrix[soilType]?.[season3Crop] || 0.7) * 100)
      }
    ];

    res.json({
      state,
      soilType,
      rotationPlan: plan,
      agronomicPrinciple: 'Alternating heavy-feeder cereals with nitrogen-fixing pulses prevents soil nutrient depletion, breaks pest cycles, and optimizes water use efficiency.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Crop rotation lookup failed', message: error.message });
  }
});

module.exports = router;
