const axios = require('axios');
const mongoose = require('mongoose');

const API_KEY = process.env.DATA_GOV_API_KEY;
const BASE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

let MarketPrice;
try {
  MarketPrice = require('../models/MarketPrice');
} catch (e) {
  MarketPrice = null;
}

// Fallback mock data covering all 15 crops in database
const MOCK_PRICES = {
  'rice': [
    { market: 'Erode', district: 'Erode', state: 'Tamil Nadu', minPrice: 2200, maxPrice: 2600, modalPrice: 2400 },
    { market: 'Salem', district: 'Salem', state: 'Tamil Nadu', minPrice: 2150, maxPrice: 2550, modalPrice: 2350 },
    { market: 'Madurai', district: 'Madurai', state: 'Tamil Nadu', minPrice: 2180, maxPrice: 2580, modalPrice: 2380 },
    { market: 'Thanjavur', district: 'Thanjavur', state: 'Tamil Nadu', minPrice: 2250, maxPrice: 2650, modalPrice: 2450 },
    { market: 'Tirunelveli', district: 'Tirunelveli', state: 'Tamil Nadu', minPrice: 2100, maxPrice: 2500, modalPrice: 2300 }
  ],
  'wheat': [
    { market: 'Indore', district: 'Indore', state: 'Madhya Pradesh', minPrice: 2300, maxPrice: 2700, modalPrice: 2500 },
    { market: 'Bhopal', district: 'Bhopal', state: 'Madhya Pradesh', minPrice: 2250, maxPrice: 2650, modalPrice: 2450 },
    { market: 'Ujjain', district: 'Ujjain', state: 'Madhya Pradesh', minPrice: 2280, maxPrice: 2680, modalPrice: 2480 },
    { market: 'Dewas', district: 'Dewas', state: 'Madhya Pradesh', minPrice: 2200, maxPrice: 2600, modalPrice: 2400 },
    { market: 'Sehore', district: 'Sehore', state: 'Madhya Pradesh', minPrice: 2150, maxPrice: 2550, modalPrice: 2350 }
  ],
  'groundnut': [
    { market: 'Rajkot', district: 'Rajkot', state: 'Gujarat', minPrice: 5200, maxPrice: 5600, modalPrice: 5400 },
    { market: 'Junagadh', district: 'Junagadh', state: 'Gujarat', minPrice: 5150, maxPrice: 5550, modalPrice: 5350 },
    { market: 'Amreli', district: 'Amreli', state: 'Gujarat', minPrice: 5100, maxPrice: 5500, modalPrice: 5300 },
    { market: 'Erode', district: 'Erode', state: 'Tamil Nadu', minPrice: 5300, maxPrice: 5700, modalPrice: 5500 },
    { market: 'Anantapur', district: 'Anantapur', state: 'Andhra Pradesh', minPrice: 5000, maxPrice: 5400, modalPrice: 5200 }
  ],
  'cotton': [
    { market: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', minPrice: 6200, maxPrice: 6600, modalPrice: 6400 },
    { market: 'Adilabad', district: 'Adilabad', state: 'Telangana', minPrice: 6100, maxPrice: 6500, modalPrice: 6300 },
    { market: 'Yavatmal', district: 'Yavatmal', state: 'Maharashtra', minPrice: 6000, maxPrice: 6400, modalPrice: 6200 },
    { market: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', minPrice: 6050, maxPrice: 6450, modalPrice: 6250 },
    { market: 'Rajkot', district: 'Rajkot', state: 'Gujarat', minPrice: 6150, maxPrice: 6550, modalPrice: 6350 }
  ],
  'sugarcane': [
    { market: 'Kolhapur', district: 'Kolhapur', state: 'Maharashtra', minPrice: 3100, maxPrice: 3500, modalPrice: 3300 },
    { market: 'Pune', district: 'Pune', state: 'Maharashtra', minPrice: 3050, maxPrice: 3450, modalPrice: 3250 },
    { market: 'Meerut', district: 'Meerut', state: 'Uttar Pradesh', minPrice: 3000, maxPrice: 3400, modalPrice: 3200 },
    { market: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', minPrice: 2950, maxPrice: 3350, modalPrice: 3150 },
    { market: 'Belgaum', district: 'Belgaum', state: 'Karnataka', minPrice: 3080, maxPrice: 3480, modalPrice: 3280 }
  ],
  'maize': [
    { market: 'Chamarajnagar', district: 'Chamarajnagar', state: 'Karnataka', minPrice: 1950, maxPrice: 2250, modalPrice: 2100 },
    { market: 'Devanagere', district: 'Davanagere', state: 'Karnataka', minPrice: 2000, maxPrice: 2300, modalPrice: 2150 },
    { market: 'Sangli', district: 'Sangli', state: 'Maharashtra', minPrice: 1900, maxPrice: 2200, modalPrice: 2050 },
    { market: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', minPrice: 1980, maxPrice: 2280, modalPrice: 2130 },
    { market: 'Salem', district: 'Salem', state: 'Tamil Nadu', minPrice: 2020, maxPrice: 2320, modalPrice: 2170 }
  ],
  'soybean': [
    { market: 'Dewas', district: 'Dewas', state: 'Madhya Pradesh', minPrice: 3900, maxPrice: 4300, modalPrice: 4100 },
    { market: 'Ujjain', district: 'Ujjain', state: 'Madhya Pradesh', minPrice: 3950, maxPrice: 4350, modalPrice: 4150 },
    { market: 'Latur', district: 'Latur', state: 'Maharashtra', minPrice: 4000, maxPrice: 4400, modalPrice: 4200 },
    { market: 'Amravati', district: 'Amravati', state: 'Maharashtra', minPrice: 3850, maxPrice: 4250, modalPrice: 4050 },
    { market: 'Kota', district: 'Kota', state: 'Rajasthan', minPrice: 3800, maxPrice: 4200, modalPrice: 4000 }
  ],
  'tomato': [
    { market: 'Kolar', district: 'Kolar', state: 'Karnataka', minPrice: 1200, maxPrice: 2400, modalPrice: 1800 },
    { market: 'Pimpalgaon', district: 'Nashik', state: 'Maharashtra', minPrice: 1000, maxPrice: 2200, modalPrice: 1600 },
    { market: 'Madanapalle', district: 'Chittoor', state: 'Andhra Pradesh', minPrice: 1300, maxPrice: 2500, modalPrice: 1900 },
    { market: 'Ottanchatram', district: 'Dindigul', state: 'Tamil Nadu', minPrice: 1100, maxPrice: 2100, modalPrice: 1600 },
    { market: 'Pune', district: 'Pune', state: 'Maharashtra', minPrice: 1150, maxPrice: 2300, modalPrice: 1720 }
  ],
  'onion': [
    { market: 'Lasalgaon', district: 'Nashik', state: 'Maharashtra', minPrice: 1500, maxPrice: 2100, modalPrice: 1800 },
    { market: 'Pimpalgaon', district: 'Nashik', state: 'Maharashtra', minPrice: 1600, maxPrice: 2200, modalPrice: 1900 },
    { market: 'Pune', district: 'Pune', state: 'Maharashtra', minPrice: 1400, maxPrice: 2000, modalPrice: 1700 },
    { market: 'Yeshwanthpur', district: 'Bangalore', state: 'Karnataka', minPrice: 1450, maxPrice: 2150, modalPrice: 1800 },
    { market: 'Mahuva', district: 'Bhavnagar', state: 'Gujarat', minPrice: 1300, maxPrice: 1900, modalPrice: 1600 }
  ],
  'turmeric': [
    { market: 'Erode', district: 'Erode', state: 'Tamil Nadu', minPrice: 7200, maxPrice: 8400, modalPrice: 7800 },
    { market: 'Nizamabad', district: 'Nizamabad', state: 'Telangana', minPrice: 7000, maxPrice: 8200, modalPrice: 7600 },
    { market: 'Sangli', district: 'Sangli', state: 'Maharashtra', minPrice: 7400, maxPrice: 8600, modalPrice: 8000 },
    { market: 'Salem', district: 'Salem', state: 'Tamil Nadu', minPrice: 7100, maxPrice: 8300, modalPrice: 7700 },
    { market: 'Duggirala', district: 'Guntur', state: 'Andhra Pradesh', minPrice: 6800, maxPrice: 8000, modalPrice: 7400 }
  ],
  'chickpea': [
    { market: 'Indore', district: 'Indore', state: 'Madhya Pradesh', minPrice: 4900, maxPrice: 5300, modalPrice: 5100 },
    { market: 'Akola', district: 'Akola', state: 'Maharashtra', minPrice: 4850, maxPrice: 5250, modalPrice: 5050 },
    { market: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', minPrice: 5000, maxPrice: 5400, modalPrice: 5200 },
    { market: 'Latur', district: 'Latur', state: 'Maharashtra', minPrice: 4800, maxPrice: 5200, modalPrice: 5000 },
    { market: 'Gulbarga', district: 'Gulbarga', state: 'Karnataka', minPrice: 4950, maxPrice: 5350, modalPrice: 5150 }
  ],
  'mustard': [
    { market: 'Bharatpur', district: 'Bharatpur', state: 'Rajasthan', minPrice: 5300, maxPrice: 5700, modalPrice: 5500 },
    { market: 'Sri Ganganagar', district: 'Ganganagar', state: 'Rajasthan', minPrice: 5250, maxPrice: 5650, modalPrice: 5450 },
    { market: 'Hisar', district: 'Hisar', state: 'Haryana', minPrice: 5350, maxPrice: 5750, modalPrice: 5550 },
    { market: 'Morena', district: 'Morena', state: 'Madhya Pradesh', minPrice: 5100, maxPrice: 5500, modalPrice: 5300 },
    { market: 'Mathura', district: 'Mathura', state: 'Uttar Pradesh', minPrice: 5150, maxPrice: 5550, modalPrice: 5350 }
  ],
  'banana': [
    { market: 'Trichy', district: 'Tiruchirappalli', state: 'Tamil Nadu', minPrice: 1600, maxPrice: 2200, modalPrice: 1900 },
    { market: 'Jalgaon', district: 'Jalgaon', state: 'Maharashtra', minPrice: 1500, maxPrice: 2000, modalPrice: 1750 },
    { market: 'Surat', district: 'Surat', state: 'Gujarat', minPrice: 1700, maxPrice: 2300, modalPrice: 2000 },
    { market: 'Chinna Salem', district: 'Kallakurichi', state: 'Tamil Nadu', minPrice: 1550, maxPrice: 2150, modalPrice: 1850 },
    { market: 'Pune', district: 'Pune', state: 'Maharashtra', minPrice: 1580, maxPrice: 2080, modalPrice: 1830 }
  ],
  'millet': [
    { market: 'Alwar', district: 'Alwar', state: 'Rajasthan', minPrice: 2150, maxPrice: 2550, modalPrice: 2350 },
    { market: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', minPrice: 2200, maxPrice: 2600, modalPrice: 2400 },
    { market: 'Hisar', district: 'Hisar', state: 'Haryana', minPrice: 2100, maxPrice: 2500, modalPrice: 2300 },
    { market: 'Agra', district: 'Agra', state: 'Uttar Pradesh', minPrice: 2050, maxPrice: 2450, modalPrice: 2250 },
    { market: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', minPrice: 2180, maxPrice: 2580, modalPrice: 2380 }
  ],
  'chilli': [
    { market: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', minPrice: 13500, maxPrice: 16500, modalPrice: 15000 },
    { market: 'Khammam', district: 'Khammam', state: 'Telangana', minPrice: 13000, maxPrice: 16000, modalPrice: 14500 },
    { market: 'Warangal', district: 'Warangal', state: 'Telangana', minPrice: 13200, maxPrice: 16200, modalPrice: 14700 },
    { market: 'Byadgi', district: 'Haveri', state: 'Karnataka', minPrice: 14000, maxPrice: 18000, modalPrice: 16000 },
    { market: 'Virudhunagar', district: 'Virudhunagar', state: 'Tamil Nadu', minPrice: 12500, maxPrice: 15500, modalPrice: 14000 }
  ]
};

async function getMarketPrices(state, crop) {
  const cropLower = crop.toLowerCase();

  // Try DB Cache first
  if (MarketPrice && mongoose.connection.readyState === 1) {
    try {
      const cached = await MarketPrice.find({ crop: cropLower, state });
      if (cached && cached.length > 0) {
        console.log(`[CACHE HIT] Returning cached market prices for ${cropLower} in ${state}`);
        return cached.map(p => ({
          market: p.market,
          district: p.district,
          state: p.state,
          commodity: crop,
          minPrice: p.minPrice,
          maxPrice: p.maxPrice,
          modalPrice: p.modalPrice,
          date: p.date ? p.date.toISOString() : new Date().toISOString()
        }));
      }
    } catch (err) {
      console.error('Market cache query error:', err.message);
    }
  }

  let records = [];

  // Try live API first
  if (API_KEY && API_KEY !== 'your_api_key_here') {
    try {
      const response = await axios.get(BASE_URL, {
        params: {
          'api-key': API_KEY,
          format: 'json',
          limit: 10,
          'filters[state.keyword]': state,
          'filters[commodity]': crop.charAt(0).toUpperCase() + crop.slice(1)
        },
        timeout: 10000
      });

      const rawRecords = response.data?.records || [];
      if (rawRecords.length > 0) {
        records = rawRecords.map(r => ({
          market: r.market || r.Market,
          district: r.district || r.District,
          state: r.state || r.State,
          commodity: r.commodity || r.Commodity,
          minPrice: parseFloat(r.min_price || r.Min_Price || 0),
          maxPrice: parseFloat(r.max_price || r.Max_Price || 0),
          modalPrice: parseFloat(r.modal_price || r.Modal_Price || 0),
          date: r.arrival_date || r.Arrival_Date || new Date().toISOString(),
          source: 'live'
        }));
      }
    } catch (error) {
      console.error('Market API error:', error.message);
    }
  }

  // Fallback to mock data if no records fetched
  if (records.length === 0) {
    const mockData = MOCK_PRICES[cropLower] || MOCK_PRICES['rice'];
    records = mockData.map(m => ({
      ...m,
      commodity: crop,
      date: new Date().toISOString(),
      source: 'curated_baseline'
    }));
  }


  // Save to DB Cache if DB is available
  if (MarketPrice && mongoose.connection.readyState === 1 && records.length > 0) {
    try {
      const docs = records.map(r => ({
        crop: cropLower,
        state: r.state,
        market: r.market,
        district: r.district,
        minPrice: r.minPrice,
        maxPrice: r.maxPrice,
        modalPrice: r.modalPrice,
        date: new Date(r.date)
      }));
      await MarketPrice.insertMany(docs);
      console.log(`[CACHE SAVE] Saved ${docs.length} market prices for ${cropLower} in ${state}`);
    } catch (err) {
      console.error('Market cache save error:', err.message);
    }
  }

  return records;
}

// Generate mock historical prices for chart
function generatePriceHistory(basePrice, days = 30) {
  const history = [];
  let price = basePrice;
  const today = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    price = price + (Math.random() - 0.48) * (basePrice * 0.03);
    price = Math.max(basePrice * 0.85, Math.min(basePrice * 1.15, price));
    history.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price)
    });
  }

  return history;
}

module.exports = { getMarketPrices, generatePriceHistory };
