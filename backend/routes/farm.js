const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const { getWeather } = require('../services/weatherService');
const { getSoilData } = require('../services/soilService');
const { getElevation } = require('../services/elevationService');
const { getMarketPrices } = require('../services/marketService');
const { recommendCrops, getBorewellRisk } = require('../services/mlService');
const { getDistanceToRiver, estimateNdviScore } = require('../services/geospatialService');
const { getRegionalSoilData } = require('../services/regionalSoilData');
const { calculateFertilizerRecommendation } = require('../services/fertilizerService');
const cache = require('../services/cacheService');

let FarmAnalysis;
try {
  FarmAnalysis = require('../models/FarmAnalysis');
} catch (e) {
  FarmAnalysis = null;
}

// Estimated cultivation cost per acre per crop (INR)
const CROP_ESTIMATED_COSTS = {
  rice: 18000,
  wheat: 16000,
  maize: 14000,
  cotton: 22000,
  groundnut: 19000,
  sugarcane: 35000,
  soybean: 15000,
  tomato: 28000,
  onion: 26000,
  turmeric: 32000,
  chickpea: 14000,
  mustard: 13000,
  banana: 45000,
  millet: 11000,
  chilli: 30000
};

// POST /api/farm/analyse — AgroPredict Main Analysis Endpoint
router.post('/analyse', async (req, res) => {
  try {
    const { lat, lng, soilInputTier, manualSoil, soilReportData } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng parameters are required' });
    }

    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;

    // Check DB cache first if no custom manual soil overrides provided
    if (!soilInputTier && FarmAnalysis && mongoose.connection.readyState === 1) {
      try {
        const cached = await FarmAnalysis.findOne({ lat: roundedLat, lng: roundedLng });
        if (cached) {
          console.log(`[CACHE HIT] Returning cached analysis for AgroPredict (${roundedLat}, ${roundedLng})`);
          return res.json(cached);
        }
      } catch (err) {
        console.error('Cache query error:', err.message);
      }
    }

    // Parallelize all independent external API calls concurrently (Promise.all)
    const geocodePromise = (async () => {
      const cacheKey = cache.getGeoKey('geocode', lat, lng, 2);
      const cached = cache.get(cacheKey);
      if (cached) return cached;
      try {
        const geoRes = await axios.get('https://nominatim.openstreetmap.org/reverse', {
          params: { lat, lon: lng, format: 'json', 'accept-language': 'en' },
          headers: { 'User-Agent': 'AgroPredict/2.0' },
          timeout: 4000
        });
        const addr = geoRes.data.address || {};
        const district = addr.county || addr.state_district || addr.city || 'Unknown';
        const state = addr.state || 'Tamil Nadu';
        const res = { district, state };
        cache.set(cacheKey, res, 30 * 24 * 60 * 60 * 1000);
        return res;
      } catch (e) {
        return { district: 'Unknown', state: 'Tamil Nadu' };
      }
    })();

    const [locationInfo, weather, baseSoil, elevationData, distanceToRiver] = await Promise.all([
      geocodePromise,
      getWeather(lat, lng),
      getSoilData(lat, lng),
      getElevation(lat, lng),
      getDistanceToRiver(lat, lng)
    ]);

    const district = locationInfo.district;
    const state = locationInfo.state;

    // Determine Soil Tier & Soil Chemistry Data
    let finalSoilData = { ...baseSoil };
    let soilTierInfo = {
      tier: 'regional_fallback',
      confidence: 60,
      confidenceLabel: '60% Regional Avg',
      source: 'Geospatial SoilGrids Matrix',
      N: 180, P: 20, K: 180
    };

    if (soilInputTier === 'lab_report' && soilReportData) {
      // Tier 1: Lab Test Report OCR Upload (100% Confidence)
      finalSoilData.ph = parseFloat(soilReportData.ph) || finalSoilData.ph;
      finalSoilData.soilType = soilReportData.soilType || finalSoilData.soilType;
      soilTierInfo = {
        tier: 'lab_report',
        confidence: 100,
        confidenceLabel: '100% Lab Verified',
        source: 'Lab Soil Test OCR Report',
        N: parseFloat(soilReportData.N) || 200,
        P: parseFloat(soilReportData.P) || 25,
        K: parseFloat(soilReportData.K) || 200
      };
    } else if (soilInputTier === 'manual' && manualSoil) {
      // Tier 2: Manual Entry (90% Confidence)
      finalSoilData.ph = parseFloat(manualSoil.ph) || finalSoilData.ph;
      finalSoilData.soilType = manualSoil.soilType || finalSoilData.soilType;
      soilTierInfo = {
        tier: 'manual',
        confidence: 90,
        confidenceLabel: '90% Farmer Input',
        source: 'Direct Farmer Soil Entry',
        N: parseFloat(manualSoil.N) || 190,
        P: parseFloat(manualSoil.P) || 22,
        K: parseFloat(manualSoil.K) || 190
      };
    } else {
      // Tier 3: Government Regional Soil DB Fallback (75% / 60% Confidence)
      const regionalSeed = getRegionalSoilData(state);
      soilTierInfo = {
        tier: 'regional_gov_db',
        confidence: regionalSeed.confidence || 75,
        confidenceLabel: `${regionalSeed.confidence || 75}% Govt Soil DB`,
        source: regionalSeed.source,
        N: regionalSeed.N,
        P: regionalSeed.P,
        K: regionalSeed.K
      };
    }

    const annualRainfall = (weather.rainfall7day || 20) * 52;
    const ndviScore = estimateNdviScore(lat, lng, annualRainfall, finalSoilData.clay);
    const month = new Date().getMonth() + 1;

    // Run ML models concurrently
    const [cropRecommendation, borewellRisk] = await Promise.all([
      recommendCrops({
        soil_type: finalSoilData.soilType,
        soil_ph: finalSoilData.ph,
        avg_temperature: weather.current.temperature,
        rainfall_7day: weather.rainfall7day,
        humidity: weather.current.humidity,
        month: month,
        elevation: elevationData.elevation,
        state: state
      }),
      getBorewellRisk({
        elevation: elevationData.elevation,
        soil_depth: finalSoilData.depth,
        clay_content: finalSoilData.clay,
        annual_rainfall: annualRainfall,
        distance_to_river: distanceToRiver,
        ndvi_score: ndviScore,
        month: month
      })
    ]);

    // Fetch market prices & compute Profit Analysis (Revenue - Cost)
    const rawCrops = cropRecommendation.crops || [];
    const cropsWithEconomics = await Promise.all(
      rawCrops.slice(0, 6).map(async (c) => {
        const prices = await getMarketPrices(state, c.crop);
        const topPrice = prices[0];
        const modalPriceQuintal = topPrice?.modalPrice || 2400; // INR per quintal (1 quintal = 0.1 ton)
        const pricePerTon = modalPriceQuintal * 10;

        // Estimated yield per acre (approx 1.5 - 3.5 tons depending on suitability score)
        const estYieldPerAcre = Math.round((1.5 + (c.score || 0.8) * 2.0) * 10) / 10;
        const estimatedRevenue = Math.round(estYieldPerAcre * pricePerTon);
        const cropCost = CROP_ESTIMATED_COSTS[c.crop] || 18000;
        const estimatedProfit = estimatedRevenue - cropCost;

        // Calculate Fertilizer Recommendation
        const fertilizerPlan = calculateFertilizerRecommendation(
          c.crop,
          soilTierInfo.N,
          soilTierInfo.P,
          soilTierInfo.K,
          finalSoilData.ph
        );

        return {
          ...c,
          currentPrice: modalPriceQuintal,
          pricePerTon,
          estimatedYieldPerAcre: estYieldPerAcre,
          estimatedRevenue,
          estimatedCost: cropCost,
          estimatedProfit,
          fertilizerPlan,
          market: topPrice?.market || 'Local APMC',
          prices: prices.slice(0, 5)
        };
      })
    );

    // Rank crops by Net Profit and flag highest-profit choice
    cropsWithEconomics.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
    if (cropsWithEconomics.length > 0) {
      cropsWithEconomics[0].isHighestProfit = true;
      cropsWithEconomics[0].recommendationReason = '⭐ Highest expected net profit per acre';
    }

    // Detailed borewell object
    const borewellWithDetails = {
      riskScore: borewellRisk.riskScore || 50,
      riskLevel: borewellRisk.riskLevel || 'MODERATE',
      distanceToRiver,
      ndviScore,
      breakdown: {
        soilDepth: { score: borewellRisk.breakdown?.soilDepth || 50, value: `${finalSoilData.depth}cm`, label: 'Soil Depth' },
        elevation: { score: borewellRisk.breakdown?.elevation || 50, value: `${elevationData.elevation}m`, label: 'Elevation' },
        rainfall: { score: borewellRisk.breakdown?.rainfall || 50, value: `${Math.round(annualRainfall)}mm/yr`, label: 'Annual Rainfall' },
        waterDistance: { score: borewellRisk.breakdown?.waterDistance || 50, value: `${distanceToRiver} km`, label: 'Distance to River' }
      },
      recommendation: (borewellRisk.riskLevel === 'HIGH' 
        ? `⚠️ Borewell drilling is NOT recommended. High failure risk (${borewellRisk.riskScore}/100). Consider drip irrigation.`
        : borewellRisk.riskLevel === 'MODERATE' 
          ? `Borewell drilling may succeed with hydro-geological survey. Moderate risk score: ${borewellRisk.riskScore}/100.`
          : `✅ Borewell drilling is highly feasible in your plot. Low risk score: ${borewellRisk.riskScore}/100.`),
      explanation: (borewellRisk.riskLevel === 'HIGH'
        ? `High risk due to terrain elevation of ${elevationData.elevation}m and low rainfall retention.`
        : `Groundwater conditions evaluated from elevation (${elevationData.elevation}m), soil depth (${finalSoilData.depth}cm), and rainfall patterns.`),
      estimatedCost: (borewellRisk.riskScore > 70 ? '₹80,000–₹1,50,000' : borewellRisk.riskScore > 40 ? '₹50,000–₹80,000' : '₹30,000–₹50,000')
    };

    const result = {
      brand: 'AgroPredict',
      location: { lat: roundedLat, lng: roundedLng, district, state },
      soilTierInfo,
      weather: {
        current: weather.current,
        soilTemperature: weather.soilTemperature,
        evapotranspiration: weather.evapotranspiration,
        forecast: weather.forecast,
        rainfall7day: weather.rainfall7day
      },
      soil: finalSoilData,
      elevation: elevationData.elevation,
      borewell: borewellWithDetails,
      crops: cropsWithEconomics,
      analyzedAt: new Date().toISOString()
    };

    // Save to Mongo DB Cache
    if (!soilInputTier && FarmAnalysis && mongoose.connection.readyState === 1) {
      try {
        const cacheDoc = new FarmAnalysis({
          lat: roundedLat,
          lng: roundedLng,
          district,
          state,
          soilType: finalSoilData.soilType,
          soilData: finalSoilData,
          elevation: elevationData.elevation,
          groundwaterRisk: borewellRisk.riskLevel || 'MODERATE',
          riskScore: borewellRisk.riskScore || 50,
          borewellDetail: borewellWithDetails,
          recommendedCrops: cropsWithEconomics,
          weatherSummary: {
            temperature: weather.current.temperature,
            humidity: weather.current.humidity,
            rainfall: weather.rainfall7day,
            windSpeed: weather.current.windSpeed || 0,
            forecast: weather.forecast
          }
        });
        await cacheDoc.save();
        result._id = cacheDoc._id;
      } catch (err) {
        console.error('Cache save error:', err.message);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('AgroPredict Farm Analysis Error:', error);
    res.status(500).json({ error: 'Farm analysis failed', message: error.message });
  }
});

module.exports = router;
