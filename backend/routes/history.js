const express = require('express');
const router = express.Router();

let memoryStore = [];
let feedbackMemoryStore = [];

let SavedFarm;
try {
  SavedFarm = require('../models/SavedFarm');
} catch (e) {
  SavedFarm = null;
}

let FarmAnalysis;
try {
  FarmAnalysis = require('../models/FarmAnalysis');
} catch (e) {
  FarmAnalysis = null;
}

let HarvestFeedback;
try {
  HarvestFeedback = require('../models/HarvestFeedback');
} catch (e) {
  HarvestFeedback = null;
}

// POST /api/history/save
router.post('/save', async (req, res) => {
  try {
    const { userId, farmName, lat, lng, district, state, notes } = req.body;

    if (SavedFarm && SavedFarm.db?.readyState === 1) {
      let lastAnalysisId = undefined;
      if (FarmAnalysis) {
        const roundedLat = Math.round(lat * 10000) / 10000;
        const roundedLng = Math.round(lng * 10000) / 10000;
        const analysis = await FarmAnalysis.findOne({ lat: roundedLat, lng: roundedLng });
        if (analysis) {
          lastAnalysisId = analysis._id;
        }
      }

      const farm = new SavedFarm({ 
        userId: userId || 'default-user', 
        farmName, 
        lat, 
        lng, 
        district, 
        state, 
        notes,
        lastAnalysis: lastAnalysisId
      });
      await farm.save();
      res.json({ success: true, farm });
    } else {
      const farm = { id: Date.now().toString(), userId: userId || 'default-user', farmName, lat, lng, district, state, notes, createdAt: new Date() };
      memoryStore.push(farm);
      res.json({ success: true, farm });
    }
  } catch (error) {
    res.status(500).json({ error: 'Save failed', message: error.message });
  }
});

// POST /api/history/feedback — Submit Post-Harvest Farmer Feedback
router.post('/feedback', async (req, res) => {
  try {
    const { userId, farmName, crop, soilInputTier, predictedYield, actualYield, predictedProfit, actualProfit, feedbackNotes } = req.body;

    const yPred = parseFloat(predictedYield) || 2.0;
    const yAct = parseFloat(actualYield) || 2.0;
    const yieldDelta = Math.round((yAct - yPred) * 100) / 100;
    const pPred = parseFloat(predictedProfit) || 0;
    const pAct = parseFloat(actualProfit) || 0;
    const profitDelta = pAct - pPred;

    const record = {
      userId: userId || 'default-user',
      farmName: farmName || 'Saved Plot',
      crop: crop || 'Rice',
      soilInputTier: soilInputTier || 'regional_fallback',
      predictedYield: yPred,
      actualYield: yAct,
      yieldDelta,
      predictedProfit: pPred,
      actualProfit: pAct,
      profitDelta,
      feedbackNotes: feedbackNotes || '',
      recordedAt: new Date()
    };

    if (HarvestFeedback && HarvestFeedback.db?.readyState === 1) {
      const fb = new HarvestFeedback(record);
      await fb.save();
      res.json({ success: true, feedback: fb });
    } else {
      record._id = Date.now().toString();
      feedbackMemoryStore.push(record);
      res.json({ success: true, feedback: record });
    }
  } catch (error) {
    res.status(500).json({ error: 'Feedback save failed', message: error.message });
  }
});

// GET /api/history/feedback/:userId — Fetch feedback records
router.get('/feedback/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (HarvestFeedback && HarvestFeedback.db?.readyState === 1) {
      const records = await HarvestFeedback.find({ userId }).sort({ recordedAt: -1 });
      res.json({ feedbacks: records });
    } else {
      const records = feedbackMemoryStore.filter(f => f.userId === userId);
      res.json({ feedbacks: records });
    }
  } catch (error) {
    res.status(500).json({ error: 'Fetch feedback failed', message: error.message });
  }
});

// GET /api/history/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (SavedFarm && SavedFarm.db?.readyState === 1) {
      const farms = await SavedFarm.find({ userId }).sort({ createdAt: -1 }).limit(20);
      res.json({ farms });
    } else {
      const farms = memoryStore.filter(f => f.userId === userId);
      res.json({ farms });
    }
  } catch (error) {
    res.status(500).json({ error: 'Fetch failed', message: error.message });
  }
});

// DELETE /api/history/:id
router.delete('/:id', async (req, res) => {
  try {
    if (SavedFarm && SavedFarm.db?.readyState === 1) {
      await SavedFarm.findByIdAndDelete(req.params.id);
    } else {
      memoryStore = memoryStore.filter(f => f.id !== req.params.id);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed', message: error.message });
  }
});

module.exports = router;
