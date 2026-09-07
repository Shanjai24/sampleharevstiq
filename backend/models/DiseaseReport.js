const mongoose = require('mongoose');

const DiseaseReportSchema = new mongoose.Schema({
  userId: { type: String, default: 'anonymous' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  district: { type: String, default: 'Unknown' },
  state: { type: String, default: 'Tamil Nadu' },
  crop: { type: String, required: true },
  disease: { type: String, required: true },
  confidence: { type: Number, required: true },
  gridKey: { type: String }, // e.g. "11.12_78.65_rice_blast" for 1km deduplication
  reportedAt: { type: Date, default: Date.now, expires: 14 * 86400 } // TTL 14 days
});

DiseaseReportSchema.index({ lat: 1, lng: 1, reportedAt: -1 });

module.exports = mongoose.model('DiseaseReport', DiseaseReportSchema);
