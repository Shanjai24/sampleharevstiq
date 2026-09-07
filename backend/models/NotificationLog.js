const mongoose = require('mongoose');

const NotificationLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  type: {
    type: String,
    enum: ['weather', 'outbreak', 'price_shock', 'harvest_reminder', 'scheme_deadline', 'borewell', 'general'],
    default: 'general'
  },
  channel: { type: String, enum: ['push', 'sms', 'in_app'], default: 'in_app' },
  data: { type: mongoose.Schema.Types.Mixed },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 30 * 86400 } // TTL 30 days
});

module.exports = mongoose.model('NotificationLog', NotificationLogSchema);
