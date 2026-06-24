const express = require('express');
const router = express.Router();

// In-memory store if MongoDB is unavailable
let memoryStore = [];

let SavedFarm;
try {
  SavedFarm = require('../models/SavedFarm');
} catch (e) {
  SavedFarm = null;
}

// POST /api/history/save
router.post('/save', async (req, res) => {
  try {
    const { userId, farmName, lat, lng, district, state, notes } = req.body;

    if (SavedFarm && SavedFarm.db?.readyState === 1) {
      const farm = new SavedFarm({ userId: userId || 'default-user', farmName, lat, lng, district, state, notes });
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

// GET /api/history/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (SavedFarm && SavedFarm.db?.readyState === 1) {
      const farms = await SavedFarm.find({ userId }).sort({ createdAt: -1 }).limit(20);
      res.json({ farms });
    } else {
      const farms = memoryStore.filter(f => f.userId === userId || userId === 'default-user');
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
