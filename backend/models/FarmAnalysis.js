const mongoose = require('mongoose');

const farmAnalysisSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  district: String,
  state: String,
  soilType: String,
  soilData: {
    ph: Number,
    clay: Number,
    sand: Number,
    silt: Number,
    organicCarbon: Number,
    depth: Number
  },
  elevation: Number,
  groundwaterRisk: { type: String, enum: ['LOW', 'MODERATE', 'HIGH'] },
  riskScore: Number,
  borewellDetail: mongoose.Schema.Types.Mixed,
  recommendedCrops: [{
    crop: String,
    score: Number,
    plantWindow: String,
    harvestDays: Number,
    waterPerDay: Number,
    soilMatch: Number,
    weatherMatch: Number,
    currentPrice: Number,
    priceTrend: String,
    tips: [String]
  }],
  weatherSummary: {
    temperature: Number,
    humidity: Number,
    rainfall: Number,
    windSpeed: Number,
    forecast: [mongoose.Schema.Types.Mixed]
  },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // TTL 24h
});

farmAnalysisSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model('FarmAnalysis', farmAnalysisSchema);
