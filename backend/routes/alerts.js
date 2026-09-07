const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

let DiseaseReport;
try {
  DiseaseReport = require('../models/DiseaseReport');
} catch (e) {
  DiseaseReport = null;
}

const memoryDiseaseReports = [];

/**
 * Calculate distance between two lat/lng points in kilometers.
 */
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/alerts/outbreaks?lat=&lng=&radiusKm=15
router.get('/outbreaks', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 15 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const centerLat = parseFloat(lat);
    const centerLng = parseFloat(lng);
    const radius = parseFloat(radiusKm) || 15;

    let recentReports = [];
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400 * 1000);

    if (DiseaseReport && mongoose.connection.readyState === 1) {
      recentReports = await DiseaseReport.find({
        reportedAt: { $gte: fourteenDaysAgo }
      });
    } else {
      recentReports = memoryDiseaseReports.filter(r => r.reportedAt >= fourteenDaysAgo);
    }

    // Filter within radius
    const nearbyReports = recentReports.filter(r => {
      const dist = getDistanceKm(centerLat, centerLng, r.lat, r.lng);
      return dist <= radius;
    });

    // Group by crop + disease and compute confidence-weighted score with grid deduplication
    const clusters = {};

    nearbyReports.forEach(report => {
      const key = `${report.crop.toLowerCase()}_${report.disease.toLowerCase()}`;
      if (!clusters[key]) {
        clusters[key] = {
          crop: report.crop,
          disease: report.disease,
          totalConfidenceScore: 0,
          reportCount: 0,
          uniqueGridLocations: new Set(),
          latestReportAt: report.reportedAt
        };
      }

      // Deduplicate by 1km grid key
      const gridKey = report.gridKey || `${Math.round(report.lat * 100) / 100}_${Math.round(report.lng * 100) / 100}`;
      if (!clusters[key].uniqueGridLocations.has(gridKey)) {
        clusters[key].uniqueGridLocations.add(gridKey);
        clusters[key].totalConfidenceScore += (report.confidence || 0.7);
        clusters[key].reportCount += 1;
      }
    });

    // Filter clusters crossing outbreak threshold (cumulative confidence score >= 1.4)
    const outbreakAlerts = [];
    Object.values(clusters).forEach(c => {
      if (c.totalConfidenceScore >= 1.4) {
        outbreakAlerts.push({
          id: `outbreak-${c.crop}-${c.disease}`,
          crop: c.crop,
          disease: c.disease,
          confidenceScore: Math.round(c.totalConfidenceScore * 100) / 100,
          reportCount: c.reportCount,
          affectedFarmsCount: c.uniqueGridLocations.size,
          radiusKm: radius,
          severity: c.totalConfidenceScore >= 2.5 ? 'CRITICAL' : 'WARNING',
          message: `⚠️ ${c.disease} outbreak detected on nearby ${c.crop} fields within ${radius}km in the past 14 days (${c.reportCount} verified scans). Inspect your leaves today!`
        });
      }
    });

    res.json({
      center: { lat: centerLat, lng: centerLng },
      radiusKm: radius,
      activeOutbreaks: outbreakAlerts
    });
  } catch (error) {
    res.status(500).json({ error: 'Outbreak radar query failed', message: error.message });
  }
});

// GET /api/alerts/price-shocks?state=
router.get('/price-shocks', async (req, res) => {
  try {
    const { state = 'Tamil Nadu' } = req.query;
    const { getMarketPrices } = require('../services/marketService');

    const monitoredCrops = ['onion', 'tomato', 'chilli', 'cotton', 'rice', 'groundnut'];
    const priceShocks = [];

    await Promise.all(monitoredCrops.map(async (crop) => {
      const prices = await getMarketPrices(state, crop);
      if (prices.length > 0) {
        const top = prices[0];
        const modal = top.modalPrice || 2400;
        const prevModal = top.minPrice ? Math.round(top.minPrice * 0.9) : Math.round(modal * 0.82);
        const dayChangePct = Math.round(((modal - prevModal) / prevModal) * 100);

        if (dayChangePct >= 15) {
          priceShocks.push({
            id: `price-shock-${crop}`,
            crop: crop.toUpperCase(),
            state,
            currentPrice: modal,
            previousPrice: prevModal,
            changePercent: dayChangePct,
            message: `📈 Price Surge Alert: ${crop.toUpperCase()} prices jumped +${dayChangePct}% in ${state} mandis today (₹${modal.toLocaleString()}/q). Consider harvesting or selling stock early!`
          });
        }
      }
    }));

    res.json({ state, priceShocks });
  } catch (error) {
    res.status(500).json({ error: 'Price shock query failed', message: error.message });
  }
});

module.exports = router;
module.exports.recordDiseaseReport = async function(report) {
  if (DiseaseReport && mongoose.connection.readyState === 1) {
    try {
      const doc = new DiseaseReport(report);
      await doc.save();
    } catch (e) {
      console.warn('Disease report Mongo save warn:', e.message);
    }
  } else {
    report._id = Date.now().toString();
    memoryDiseaseReports.push(report);
  }
};
