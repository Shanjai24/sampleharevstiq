const mongoose = require('mongoose');

const farmLedgerEntrySchema = new mongoose.Schema({
  farmId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    default: 'default-user'
  },
  crop: {
    type: String,
    default: 'rice'
  },
  season: {
    type: String,
    default: 'kharif'
  },
  entryType: {
    type: String,
    enum: ['expense', 'income'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'seed',
      'fertilizer',
      'pesticide',
      'labor',
      'irrigation',
      'equipment_rental',
      'transport',
      'crop_sale',
      'subsidy_received',
      'other'
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number
  },
  unit: {
    type: String,
    default: ''
  },
  unitPrice: {
    type: Number
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  note: {
    type: String,
    default: ''
  },
  source: {
    type: String,
    enum: ['manual', 'linked_to_task'],
    default: 'manual'
  },
  relatedTaskId: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

farmLedgerEntrySchema.index({ farmId: 1, date: -1 });

module.exports = mongoose.model('FarmLedgerEntry', farmLedgerEntrySchema);
