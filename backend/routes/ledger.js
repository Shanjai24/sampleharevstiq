const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const FarmLedgerEntry = require('../models/FarmLedgerEntry');

let FarmAnalysis;
try {
  FarmAnalysis = require('../models/FarmAnalysis');
} catch {
  FarmAnalysis = null;
}

// In-memory fallback store if MongoDB is offline
const memoryLedger = new Map();

function isDbReady() {
  return mongoose.connection.readyState === 1;
}

// Loads calibrated cost/price benchmarks written by
// ml/calibrate_cost_benchmarks.py, if it has run and found enough real
// farmer data for a given crop. Re-read on every request rather than
// cached at startup, since the calibration file can be updated by a
// periodic job while the server keeps running.
function getCalibratedBenchmark(cropKey) {
  try {
    const fs = require('fs');
    const path = require('path');
    const calPath = path.join(__dirname, '../../ml/data/cost_benchmarks_calibrated.json');
    if (!fs.existsSync(calPath)) return null;
    const calibrated = JSON.parse(fs.readFileSync(calPath, 'utf8'));
    return calibrated[cropKey] || null;
  } catch (e) {
    console.warn('[CALIBRATION READ WARN]', e.message);
    return null;
  }
}

// Benchmark agronomic costs and revenues (per acre) for fallback comparisons
const CROP_BENCHMARKS = {
  rice: { costPerAcre: 18000, expectedYieldPerAcre: 2.5, modalPricePerTon: 24000 },
  wheat: { costPerAcre: 15000, expectedYieldPerAcre: 1.8, modalPricePerTon: 25000 },
  groundnut: { costPerAcre: 22000, expectedYieldPerAcre: 1.0, modalPricePerTon: 54000 },
  cotton: { costPerAcre: 26000, expectedYieldPerAcre: 0.8, modalPricePerTon: 64000 },
  sugarcane: { costPerAcre: 45000, expectedYieldPerAcre: 30.0, modalPricePerTon: 3300 },
  maize: { costPerAcre: 14000, expectedYieldPerAcre: 2.2, modalPricePerTon: 21000 },
  soybean: { costPerAcre: 16000, expectedYieldPerAcre: 0.9, modalPricePerTon: 41000 },
  tomato: { costPerAcre: 35000, expectedYieldPerAcre: 10.0, modalPricePerTon: 18000 },
  onion: { costPerAcre: 32000, expectedYieldPerAcre: 7.0, modalPricePerTon: 22000 },
  turmeric: { costPerAcre: 48000, expectedYieldPerAcre: 2.8, modalPricePerTon: 75000 },
  chilli: { costPerAcre: 38000, expectedYieldPerAcre: 1.2, modalPricePerTon: 140000 }
};

// GET /api/ledger/:farmId - List entries
router.get('/:farmId', async (req, res) => {
  try {
    const { farmId } = req.params;
    const { season, crop } = req.query;

    let entries = [];

    if (isDbReady()) {
      const query = { farmId };
      if (season) query.season = season;
      if (crop) query.crop = crop.toLowerCase();

      const dbEntries = await FarmLedgerEntry.find(query).sort({ date: -1 }).lean();
      entries = dbEntries.map(e => ({
        ...e,
        id: e._id.toString()
      }));
    } else {
      const all = memoryLedger.get(farmId) || [];
      entries = all.filter(e => {
        if (season && e.season !== season) return false;
        if (crop && e.crop !== crop.toLowerCase()) return false;
        return true;
      });
    }

    res.json({
      farmId,
      totalEntries: entries.length,
      entries
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ledger entries', message: error.message });
  }
});

// GET /api/ledger/:farmId/summary - Financial totals & Estimated vs Actual
router.get('/:farmId/summary', async (req, res) => {
  try {
    const { farmId } = req.params;
    const { season, crop = 'rice', areaAcres = 1.0 } = req.query;
    const parsedArea = Math.max(0.1, parseFloat(areaAcres) || 1.0);
    const cropKey = (crop || 'rice').toLowerCase().trim();

    let entries = [];
    if (isDbReady()) {
      const query = { farmId };
      if (season) query.season = season;
      const dbEntries = await FarmLedgerEntry.find(query).lean();
      entries = dbEntries.map(e => ({ ...e, id: e._id.toString() }));
    } else {
      entries = memoryLedger.get(farmId) || [];
    }

    let totalExpenses = 0;
    let totalIncome = 0;
    const expensesByCategory = {
      seed: 0,
      fertilizer: 0,
      pesticide: 0,
      labor: 0,
      irrigation: 0,
      equipment_rental: 0,
      transport: 0,
      other: 0
    };
    const incomeByCategory = {
      crop_sale: 0,
      subsidy_received: 0,
      other: 0
    };

    entries.forEach(e => {
      const amt = Number(e.amount) || 0;
      if (e.entryType === 'expense') {
        totalExpenses += amt;
        if (expensesByCategory[e.category] !== undefined) {
          expensesByCategory[e.category] += amt;
        } else {
          expensesByCategory.other += amt;
        }
      } else if (e.entryType === 'income') {
        totalIncome += amt;
        if (incomeByCategory[e.category] !== undefined) {
          incomeByCategory[e.category] += amt;
        } else {
          incomeByCategory.other += amt;
        }
      }
    });

    const actualNetProfit = totalIncome - totalExpenses;

    // Retrieve original estimated benchmark, and use calibrated real-data
    // values where enough farmers have logged data for this crop
    // (see ml/calibrate_cost_benchmarks.py — MIN_SAMPLES_PER_CROP guard).
    const bench = CROP_BENCHMARKS[cropKey] || CROP_BENCHMARKS['rice'];
    const calibrated = getCalibratedBenchmark(cropKey);
    const effectiveCostPerAcre = calibrated?.costPerAcre ?? bench.costPerAcre;
    const effectiveModalPrice = calibrated?.modalPricePerTon ?? bench.modalPricePerTon;
    const benchmarkSource = calibrated
      ? `Calibrated from ${calibrated.sample_farm_count} real farms' ledger data (${calibrated.calibrated_at?.slice(0, 10)})`
      : 'Hardcoded agronomic default (not yet enough real farm data to calibrate)';

    const estimatedCost = Math.round(effectiveCostPerAcre * parsedArea);
    const estimatedRevenue = Math.round(bench.expectedYieldPerAcre * effectiveModalPrice * parsedArea);
    const estimatedProfit = estimatedRevenue - estimatedCost;

    const profitVariance = actualNetProfit - estimatedProfit;
    const profitVariancePct = estimatedProfit !== 0
      ? Math.round((profitVariance / Math.abs(estimatedProfit)) * 100)
      : 0;

    res.json({
      farmId,
      crop: cropKey,
      areaAcres: parsedArea,
      totals: {
        totalExpenses,
        totalIncome,
        actualNetProfit,
        entryCount: entries.length
      },
      expensesByCategory,
      incomeByCategory,
      estimatedVsActual: {
        estimated: {
          cost: estimatedCost,
          revenue: estimatedRevenue,
          profit: estimatedProfit,
          source: benchmarkSource
        },
        actual: {
          cost: totalExpenses,
          revenue: totalIncome,
          profit: actualNetProfit,
          source: 'Farmer Recorded Ledger Book Entries'
        },
        variance: {
          profitDiff: profitVariance,
          profitDiffPct: profitVariancePct,
          status: profitVariance >= 0 ? 'AHEAD_OF_TARGET' : 'BELOW_TARGET'
        },
        honestyDisclosure: 'Estimated values reflect model benchmark projections. Actual values represent real self-reported farmer transactions.'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Ledger summary failed', message: error.message });
  }
});

// POST /api/ledger - Add entry
router.post('/', async (req, res) => {
  try {
    const {
      farmId = 'default-farm',
      userId = 'default-user',
      crop = 'rice',
      season = 'kharif',
      entryType = 'expense',
      category = 'other',
      amount,
      quantity,
      unit = '',
      unitPrice,
      date = new Date(),
      note = '',
      source = 'manual',
      relatedTaskId,
      areaAcres
    } = req.body;

    if (amount === undefined || isNaN(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({ error: 'Valid non-negative amount is required' });
    }

    const newEntry = {
      farmId,
      userId,
      crop: (crop || 'rice').toLowerCase().trim(),
      season,
      entryType,
      category,
      amount: Number(amount),
      quantity: quantity ? Number(quantity) : undefined,
      unit: unit.trim(),
      unitPrice: unitPrice ? Number(unitPrice) : undefined,
      date: new Date(date),
      note: note.trim(),
      source,
      relatedTaskId,
      areaAcres: areaAcres ? Number(areaAcres) : undefined
    };

    let savedDoc;
    if (isDbReady()) {
      const doc = new FarmLedgerEntry(newEntry);
      await doc.save();
      savedDoc = doc;
    } else {
      const doc = {
        ...newEntry,
        _id: `mem-led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        id: `mem-led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString()
      };
      const list = memoryLedger.get(farmId) || [];
      list.unshift(doc);
      memoryLedger.set(farmId, list);
      savedDoc = doc;
    }

    // Sync to ml/data/ledger_cost_logs.json as a file-based fallback so
    // ml/calibrate_cost_benchmarks.py can read real cost/income data even
    // without direct Mongo access — same pattern already used for
    // harvest feedback in backend/routes/history.js.
    try {
      const path = require('path');
      const fs = require('fs');
      const jsonPath = path.join(__dirname, '../../ml/data/ledger_cost_logs.json');
      let currentLogs = [];
      if (fs.existsSync(jsonPath)) {
        currentLogs = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      }
      currentLogs.push({
        farmId: newEntry.farmId,
        crop: newEntry.crop,
        entryType: newEntry.entryType,
        category: newEntry.category,
        amount: newEntry.amount,
        quantity: newEntry.quantity,
        areaAcres: newEntry.areaAcres,
        date: newEntry.date,
        recordedAt: new Date().toISOString()
      });
      fs.writeFileSync(jsonPath, JSON.stringify(currentLogs, null, 2), 'utf8');
    } catch (fsErr) {
      console.warn('[LEDGER JSON SYNC WARN]', fsErr.message);
    }

    return res.status(201).json(savedDoc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record ledger entry', message: error.message });
  }
});

// PUT /api/ledger/:id - Update entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.amount !== undefined) {
      updates.amount = Number(updates.amount);
    }

    if (isDbReady() && mongoose.isValidObjectId(id)) {
      const updated = await FarmLedgerEntry.findByIdAndUpdate(id, updates, { new: true });
      if (!updated) return res.status(404).json({ error: 'Entry not found' });
      return res.json(updated);
    } else {
      for (const [farmId, list] of memoryLedger.entries()) {
        const item = list.find(e => e.id === id || e._id === id);
        if (item) {
          Object.assign(item, updates);
          return res.json(item);
        }
      }
      return res.status(404).json({ error: 'Entry not found in local memory' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ledger entry', message: error.message });
  }
});

// DELETE /api/ledger/:id - Delete entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isDbReady() && mongoose.isValidObjectId(id)) {
      await FarmLedgerEntry.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Ledger entry deleted' });
    } else {
      for (const [farmId, list] of memoryLedger.entries()) {
        const filtered = list.filter(e => e.id !== id && e._id !== id);
        if (filtered.length !== list.length) {
          memoryLedger.set(farmId, filtered);
          return res.json({ success: true, message: 'Ledger entry deleted from memory' });
        }
      }
      return res.json({ success: true, message: 'Entry removed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ledger entry', message: error.message });
  }
});

module.exports = router;