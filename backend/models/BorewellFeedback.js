const mongoose = require('mongoose');

const BorewellFeedbackSchema = new mongoose.Schema({
  userId: { type: String, default: 'anonymous' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  district: { type: String, default: 'Unknown' },
  state: { type: String, default: 'Tamil Nadu' },
  actualDepthFt: { type: Number, required: true },
  succeeded: { type: Boolean, required: true },
  actualCost: { type: Number },
  notes: { type: String, default: '' },
  reportedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BorewellFeedback', BorewellFeedbackSchema);
