const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const { getWeather } = require('../services/weatherService');
const { getSoilData } = require('../services/soilService');
const { getElevation } = require('../services/elevationService');
const { getMarketPrices } = require('../services/marketService');
const { recommendCrops, getBorewellRisk, predictYield } = require('../services/mlService');
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

// Load ground-truth crop database
const fs = require('fs');
const path = require('path');
let cropDb = {};
try {
  const cropDbPath = path.join(__dirname, '../../ml/data/crop_database.json');
  if (fs.existsSync(cropDbPath)) {
    cropDb = JSON.parse(fs.readFileSync(cropDbPath, 'utf8'));
  }
} catch (e) {
  console.warn('crop_database.json load warn in farm.js:', e.message);
}

// Realistic crop agronomic benchmarks (base yield in tons/acre & cultivation cost in INR/acre)
const CROP_BENCHMARKS = {
  rice: { baseYield: 2.5, costPerAcre: 22000 },
  wheat: { baseYield: 1.8, costPerAcre: 16000 },
  groundnut: { baseYield: 1.0, costPerAcre: 18000 },
  cotton: { baseYield: 0.8, costPerAcre: 24000 },
  sugarcane: { baseYield: 30.0, costPerAcre: 55000 },
  maize: { baseYield: 2.2, costPerAcre: 16000 },
  soybean: { baseYield: 0.9, costPerAcre: 14000 },
  tomato: { baseYield: 10.0, costPerAcre: 45000 },
  onion: { baseYield: 7.0, costPerAcre: 35000 },
  turmeric: { baseYield: 2.0, costPerAcre: 30000 },
  chickpea: { baseYield: 0.6, costPerAcre: 12000 },
  mustard: { baseYield: 0.6, costPerAcre: 11000 },
  banana: { baseYield: 15.0, costPerAcre: 75000 },
  millet: { baseYield: 0.6, costPerAcre: 9000 },
  chilli: { baseYield: 1.2, costPerAcre: 30000 }
};

// POST /api/farm/analyse — AgroPredict Main Analysis Endpoint
router.post('/analyse', async (req, res) => {
  try {
    const { lat, lng, soilInputTier, manualSoil, soilReportData, areaAcres: rawArea } = req.body;
    const areaAcres = Math.max(0.1, parseFloat(rawArea) || 1.0);
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
        let district = addr.state_district || addr.district || addr.county || addr.city || addr.town || addr.municipality || addr.village || 'Unknown';
        district = district.replace(/\s+District$/i, '').trim();
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

    // Fetch market prices & compute Profit Analysis (Revenue - Cost) using primary ML predictYield
    const rawCrops = cropRecommendation.crops || [];
    let overallYieldSource = 'ml_model';

    const cropsWithEconomics = await Promise.all(
      rawCrops.slice(0, 6).map(async (c) => {
        const prices = await getMarketPrices(state, c.crop);
        const topPrice = prices[0];
        const modalPriceQuintal = topPrice?.modalPrice || 2400; // INR per quintal (1 quintal = 0.1 ton)
        const pricePerTon = modalPriceQuintal * 10;

        const cropKey = (c.crop || '').toLowerCase();
        const dbInfo = cropDb[cropKey] || {};
        const benchmark = CROP_BENCHMARKS[cropKey] || { baseYield: dbInfo.baseYield || 2.0, costPerAcre: 18000 };
        const baseYield = dbInfo.baseYield || benchmark.baseYield || 2.0;
        const harvestDays = dbInfo.harvestDays || 110;
        const waterPerDay = dbInfo.waterPerDay || 5;
        const plantMonths = dbInfo.plantMonths || [6, 7];
        const tips = dbInfo.tips || [];
        const nameTa = dbInfo.nameTa || '';
        const nameHi = dbInfo.nameHi || '';
        const suitability = (c.score != null ? c.score : 0.75);

        // Heuristic fallback yield calibrated to ground-truth baseYield
        const fallbackYieldPerAcre = Math.round(baseYield * (0.7 + 0.5 * suitability) * 100) / 100;

        // Try calling real ML Yield Predictor model
        let predictedYieldPerAcre = fallbackYieldPerAcre;
        let cropYieldSource = 'heuristic_fallback';
        try {
          const mlYieldRes = await predictYield({
            crop: c.crop,
            soil_type: finalSoilData.soilType,
            soil_ph: finalSoilData.ph,
            avg_temperature: weather.current.temperature,
            rainfall_7day: weather.rainfall7day,
            humidity: weather.current.humidity,
            area_acres: areaAcres,
            elevation: elevationData.elevation,
            state: state,
            month: month
          });

          if (mlYieldRes && mlYieldRes.predictedYieldPerAcre) {
            predictedYieldPerAcre = mlYieldRes.predictedYieldPerAcre;
            cropYieldSource = 'ml_model';
          }
        } catch (err) {
          console.warn(`[ML YIELD FALLBACK] Using benchmark heuristic for ${c.crop}:`, err.message);
        }

        if (cropYieldSource === 'heuristic_fallback') {
          overallYieldSource = 'heuristic_fallback';
        }

        const totalYield = Math.round(predictedYieldPerAcre * areaAcres * 100) / 100;

        const estimatedCostPerAcre = benchmark.costPerAcre;
        const totalEstimatedCost = Math.round(estimatedCostPerAcre * areaAcres);

        const estimatedRevenuePerAcre = Math.round(predictedYieldPerAcre * pricePerTon);
        const totalEstimatedRevenue = Math.round(estimatedRevenuePerAcre * areaAcres);

        const estimatedProfitPerAcre = estimatedRevenuePerAcre - estimatedCostPerAcre;
        const totalEstimatedProfit = totalEstimatedRevenue - totalEstimatedCost;

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
          harvestDays,
          waterPerDay,
          plantMonths,
          tips,
          nameTa,
          nameHi,
          baseYield,
          currentPrice: modalPriceQuintal,
          pricePerTon,
          predictedYieldPerAcre,
          totalYield,
          estimatedYieldPerAcre: predictedYieldPerAcre, // alias for legacy/backward compatibility
          estimatedCostPerAcre,
          totalEstimatedCost,
          estimatedCost: totalEstimatedCost, // total for the plot
          estimatedRevenuePerAcre,
          totalEstimatedRevenue,
          estimatedRevenue: totalEstimatedRevenue, // total for the plot
          estimatedProfitPerAcre,
          totalEstimatedProfit,
          estimatedProfit: totalEstimatedProfit, // total for the plot
          yieldSource: cropYieldSource,
          fertilizerPlan,
          market: topPrice?.market || 'Local APMC',
          prices: prices.slice(0, 5)
        };
      })
    );

    // Rank crops by total net profit and flag highest-profit choice
    cropsWithEconomics.sort((a, b) => b.totalEstimatedProfit - a.totalEstimatedProfit);
    if (cropsWithEconomics.length > 0) {
      cropsWithEconomics[0].isHighestProfit = true;
      cropsWithEconomics[0].recommendationReason = `⭐ Highest expected net profit (${areaAcres} acre plot)`;
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
      areaAcres,
      yieldSource: overallYieldSource,
      soilTierInfo,
      weather: {
        current: weather.current,
        soilTemperature: weather.soilTemperature,
        evapotranspiration: weather.evapotranspiration,
        forecast: weather.forecast,
        rainfall7day: weather.rainfall7day,
        source: weather.source || 'live'
      },
      soil: finalSoilData,
      elevation: elevationData.elevation,
      borewell: borewellWithDetails,
      crops: cropsWithEconomics,
      dataSources: {
        weather: weather.source || 'live',
        soil: soilTierInfo.tier === 'lab_report' ? 'lab_report' : soilTierInfo.tier === 'manual' ? 'manual' : 'regional_gov_db',
        elevation: elevationData.source || 'live',
        groundwater: 'gradient_boosting_ml',
        market: 'apmc_mandi_baseline',
        ndvi: 'precipitation_clay_model'
      },
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
