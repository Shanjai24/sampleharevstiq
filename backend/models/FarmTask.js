const mongoose = require('mongoose');

const farmTaskSchema = new mongoose.Schema({
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
    required: true
  },
  taskType: {
    type: String,
    enum: [
      'sowing',
      'fertilizer_basal',
      'fertilizer_topdress1',
      'fertilizer_topdress2',
      'irrigation_check',
      'pest_scout',
      'spray',
      'harvest_window',
      'custom'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  dosage: {
    type: String,
    default: ''
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'done', 'skipped', 'overdue'],
    default: 'pending'
  },
  completedAt: {
    type: Date
  },
  source: {
    type: String,
    enum: ['auto_generated', 'farmer_added'],
    default: 'auto_generated'
  },
  relatedAdvisoryId: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for querying tasks by farm and due date
farmTaskSchema.index({ farmId: 1, dueDate: 1 });

module.exports = mongoose.model('FarmTask', farmTaskSchema);
