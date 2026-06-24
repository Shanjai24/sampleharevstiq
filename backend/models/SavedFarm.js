const mongoose = require('mongoose');

const savedFarmSchema = new mongoose.Schema({
  userId: { type: String, required: true, default: 'default-user' },
  farmName: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  district: String,
  state: String,
  notes: String,
  lastAnalysis: { type: mongoose.Schema.Types.ObjectId, ref: 'FarmAnalysis' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SavedFarm', savedFarmSchema);
