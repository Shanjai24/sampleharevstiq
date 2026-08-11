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
  feedbackNotes: { type: String, default: '' },
  recordedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HarvestFeedback', HarvestFeedbackSchema);
