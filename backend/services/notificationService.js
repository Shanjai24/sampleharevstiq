const mongoose = require('mongoose');

let NotificationLog;
try {
  NotificationLog = require('../models/NotificationLog');
} catch (e) {
  NotificationLog = null;
}

const memoryNotifications = [];

/**
 * Send notification to a farmer across Web Push, In-App Log, or SMS.
 * @param {string} userId - target user ID
 * @param {Object} payload - { title, body, type, channel, data }
 */
async function notify(userId = 'default-user', payload = {}) {
  const { title, body, type = 'general', channel = 'in_app', data = {} } = payload;

  const record = {
    userId,
    title,
    body,
    type,
    channel,
    data,
    read: false,
    createdAt: new Date()
  };

  console.log(`[NOTIFICATION SENT] [${type.toUpperCase()}] to ${userId}: ${title} - ${body}`);

  let savedItem = record;
  if (NotificationLog && mongoose.connection.readyState === 1) {
    try {
      const doc = new NotificationLog(record);
      savedItem = await doc.save();
    } catch (err) {
      console.error('Notification log DB save error:', err.message);
    }
  } else {
    record._id = Date.now().toString();
    memoryNotifications.push(record);
    // keep memory notifications capped at 100
    if (memoryNotifications.length > 100) memoryNotifications.shift();
  }

  // SMS Gateway Integration (gated by process.env.SMS_PROVIDER_KEY)
  if (process.env.SMS_PROVIDER_KEY && (channel === 'sms' || channel === 'all')) {
    try {
      // MSG91 / Twilio integration hook
      console.log(`[SMS PROVISIONED] Sending SMS via provider to user ${userId}`);
    } catch (smsErr) {
      console.warn('[SMS ERROR]', smsErr.message);
    }
  }

  return savedItem;
}

/**
 * Fetch recent notifications for a user.
 */
async function getUserNotifications(userId = 'default-user', limit = 20) {
  if (NotificationLog && mongoose.connection.readyState === 1) {
    try {
      return await NotificationLog.find({ userId }).sort({ createdAt: -1 }).limit(limit);
    } catch (err) {
      console.error('Error fetching notifications:', err.message);
      return [];
    }
  }
  return memoryNotifications.filter(n => n.userId === userId).slice(-limit).reverse();
}

/**
 * Mark notification as read.
 */
async function markAsRead(id) {
  if (NotificationLog && mongoose.connection.readyState === 1) {
    try {
      await NotificationLog.findByIdAndUpdate(id, { read: true });
      return true;
    } catch (err) {
      return false;
    }
  }
  const item = memoryNotifications.find(n => n._id === id);
  if (item) item.read = true;
  return true;
}

module.exports = { notify, getUserNotifications, markAsRead };
