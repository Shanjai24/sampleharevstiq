const express = require('express');
const router = express.Router();
const { matchSchemes } = require('../services/schemeMatcher');

// GET /api/schemes/eligible?state=&areaAcres=&crop=
router.get('/eligible', (req, res) => {
  try {
    const { state = 'Tamil Nadu', areaAcres = 1.0, crop = 'rice' } = req.query;
    const matched = matchSchemes({
      state,
      areaAcres: parseFloat(areaAcres) || 1.0,
      crop
    });
    res.json({ success: true, schemes: matched });
  } catch (error) {
    res.status(500).json({ error: 'Scheme matching failed', message: error.message });
  }
});

module.exports = router;
