const express = require('express');
const router = express.Router();
const { getMarketPrices, generatePriceHistory } = require('../services/marketService');

// GET /api/market/:state/:crop
router.get('/:state/:crop', async (req, res) => {
  try {
    const { state, crop } = req.params;
    const prices = await getMarketPrices(state, crop);
    const history = generatePriceHistory(prices[0]?.modalPrice || 3000, 30);

    // Find best mandi (highest price)
    const bestMandi = prices.reduce((best, curr) =>
      (curr.modalPrice > (best?.modalPrice || 0)) ? curr : best
    , prices[0]);

    res.json({
      crop,
      state,
      source: prices[0]?.source || 'curated_baseline',
      prices: prices.slice(0, 5),
      history,
      bestMandi,
      trend: history.length > 1 ?
        (history[history.length - 1].price > history[history.length - 8]?.price ? 'UP' : 'DOWN') :
        'STABLE'
    });
  } catch (error) {
    res.status(500).json({ error: 'Market data fetch failed', message: error.message });
  }
});

// GET /api/market/buyers/:crop/:state?yieldPerAcre=&areaAcres=
router.get('/buyers/:crop/:state', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { crop, state } = req.params;
    const { yieldPerAcre = 2.0, areaAcres = 1.0 } = req.query;

    const cropLower = (crop || 'rice').toLowerCase();
    const parsedYield = parseFloat(yieldPerAcre) || 2.0;
    const parsedArea = parseFloat(areaAcres) || 1.0;
    const totalYieldTons = parsedYield * parsedArea;
    const totalYieldQuintals = totalYieldTons * 10;

    // Get Mandi baseline price
    const mandiPrices = await getMarketPrices(state, cropLower);
    const mandiModalPrice = mandiPrices[0]?.modalPrice || 2400; // INR / quintal

    let buyerData = {};
    try {
      const bPath = path.join(__dirname, '../../ml/data/buyer_directory.json');
      if (fs.existsSync(bPath)) {
        buyerData = JSON.parse(fs.readFileSync(bPath, 'utf8'));
      }
    } catch (e) {
      console.warn('Buyer directory read error:', e.message);
    }

    const cropBuyers = (buyerData[cropLower] && buyerData[cropLower][state]) || [
      {
        buyerName: `${state} APMC MSP Procurement Center`,
        buyerType: 'msp',
        pricePerQuintal: Math.round(mandiModalPrice * 1.02),
        minimumQuantityQuintal: 5,
        location: `${state} APMC Main Mandi Yard`,
        contactInfo: 'Visit nearest APMC Mandi Office',
        benefits: 'Government Minimum Support Price (MSP) guaranteed floor.'
      },
      {
        buyerName: `${state} Regional Agro Producers Company (FPO)`,
        buyerType: 'fpo',
        pricePerQuintal: Math.round(mandiModalPrice * 1.10),
        minimumQuantityQuintal: 10,
        location: `${state} Agro Processing Cluster`,
        contactInfo: 'Local Farmer Producer Organization',
        benefits: 'Direct member bonus + reduced transport costs.'
      }
    ];

    const rankedBuyers = cropBuyers.map(b => {
      const buyerPrice = b.pricePerQuintal || mandiModalPrice;
      const mandiTotalRevenue = Math.round(mandiModalPrice * totalYieldQuintals);
      const buyerTotalRevenue = Math.round(buyerPrice * totalYieldQuintals);
      const extraProfitVsMandi = buyerTotalRevenue - mandiTotalRevenue;

      return {
        ...b,
        mandiModalPrice,
        mandiTotalRevenue,
        buyerTotalRevenue,
        extraProfitVsMandi,
        isProfitableVsMandi: extraProfitVsMandi > 0
      };
    });

    // Rank buyers by highest profit delta
    rankedBuyers.sort((a, b) => b.extraProfitVsMandi - a.extraProfitVsMandi);

    res.json({
      crop: cropLower,
      state,
      mandiModalPrice,
      areaAcres: parsedArea,
      totalYieldTons,
      totalYieldQuintals,
      disclaimer: "Illustrative directory — verify current rates and contracts directly before committing any produce.",
      buyers: rankedBuyers
    });
  } catch (error) {
    res.status(500).json({ error: 'Buyer directory fetch failed', message: error.message });
  }
});

module.exports = router;
