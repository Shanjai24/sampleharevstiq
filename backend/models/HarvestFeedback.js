const mongoose = require('mongoose');

const HarvestFeedbackSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  farmName: { type: String, required: true },
  crop: { type: String, required: true },
  soilInputTier: { type: String, default: 'regional_fallback' },
  predictedYield: { type: Number, required: true }, // tons/acre
  actualYield: { type: Number, required: true },    // tons/acre
  yieldDelta: { type: Number, required: true },     // actual - predicted
  predictedProfit: { type: Number, default: 0 },   // INR
  actualProfit: { type: Number, required: true },    // INR
  profitDelta: { type: Number, default: 0 },
  soil_ph: { type: Number, default: 6.5 },
  avg_temperature: { type: Number, default: 30.0 },
  rainfall_7day: { type: Number, default: 50.0 },
  humidity: { type: Number, default: 65.0 },
  soil_type: { type: String, default: 'loam' },
  state: { type: String, default: 'Tamil Nadu' },
  area_acres: { type: Number, default: 1.0 },
  elevation: { type: Number, default: 200.0 },
  month: { type: Number, default: 6 },
  recordedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HarvestFeedback', HarvestFeedbackSchema);
