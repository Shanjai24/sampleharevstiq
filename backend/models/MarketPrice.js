const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema({
  crop: { type: String, required: true },
  state: { type: String, required: true },
  market: String,
  district: String,
  minPrice: Number,
  maxPrice: Number,
  modalPrice: Number,
  date: Date,
  fetchedAt: { type: Date, default: Date.now, expires: 86400 } // TTL 24h
});

marketPriceSchema.index({ crop: 1, state: 1 });

module.exports = mongoose.model('MarketPrice', marketPriceSchema);
