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
      prices: prices.slice(0, 5),
      history,
      bestMandi,
      trend: history.length > 1 ?
        (history[history.length - 1].price > history[history.length - 8]?.price ? 'UP' : 'DOWN') :
        'STABLE'
    });
  } catch (error) {
    res.status(500).json({ error: 'Market data failed', message: error.message });
  }
});

module.exports = router;
