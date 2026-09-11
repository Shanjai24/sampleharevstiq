const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection (graceful fallback if not configured)
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log(' Connected to MongoDB'))
    .catch((err) => console.warn(' MongoDB connection failed, using in-memory fallbacks:', err.message));
} else {
  console.log('ℹ No MONGODB_URI specified. Operating with in-memory storage fallback.');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState === 1 
    ? 'connected' 
    : (MONGODB_URI ? 'disconnected' : 'in-memory-fallback');
  res.json({
    status: 'ok',
    service: 'HarvestIQ Backend',
    database: dbState
  });
});

// Mount Routes
app.use('/api/farm', require('./routes/farm'));
app.use('/api/soil-report', require('./routes/soilReport'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/market', require('./routes/market'));
app.use('/api/borewell', require('./routes/borewell'));
app.use('/api/history', require('./routes/history'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/crops', require('./routes/crops'));
app.use('/api/schemes', require('./routes/schemes'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/ledger', require('./routes/ledger'));
app.use('/api/storage', require('./routes/storage'));

const { startScheduler } = require('./jobs/scheduler');

app.listen(PORT, () => {
  console.log(`🚀 HarvestIQ Backend Server running on http://localhost:${PORT}`);
  startScheduler();
});

module.exports = app;
