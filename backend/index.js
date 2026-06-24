require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connected');
    } else {
      console.log('⚠️  No MONGODB_URI set — running without database');
    }
  } catch (err) {
    console.log('⚠️  MongoDB connection failed — running without database:', err.message);
  }
};

// Routes
const farmRoutes = require('./routes/farm');
const cropsRoutes = require('./routes/crops');
const marketRoutes = require('./routes/market');
const weatherRoutes = require('./routes/weather');
const borewellRoutes = require('./routes/borewell');
const historyRoutes = require('./routes/history');
const chatRoutes = require('./routes/chat');

app.use('/api/farm', farmRoutes);
app.use('/api/crops', cropsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/borewell', borewellRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'farmsense-backend' });
});

// Start
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 FarmSense backend running on port ${PORT}`);
  });
});
