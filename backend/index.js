require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connected');
    } else {
      console.log('⚠️ No MONGODB_URI set — running in-memory fallback');
    }
  } catch (err) {
    console.log('⚠️ MongoDB connection failed — running in-memory fallback:', err.message);
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
const soilReportRoutes = require('./routes/soilReport');

app.use('/api/farm', farmRoutes);
app.use('/api/crops', cropsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/borewell', borewellRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/soil-report', soilReportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'agropredict-backend', brand: 'AgroPredict AI' });
});

// Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 AgroPredict API backend running on port ${PORT}`);
  });
});
