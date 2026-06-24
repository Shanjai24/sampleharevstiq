const axios = require('axios');

const API_KEY = process.env.DATA_GOV_API_KEY;
const BASE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

// Fallback mock data for when API is unavailable
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
  ]
};

async function getMarketPrices(state, crop) {
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

      const records = response.data?.records || [];
      if (records.length > 0) {
        return records.map(r => ({
          market: r.market || r.Market,
          district: r.district || r.District,
          state: r.state || r.State,
          commodity: r.commodity || r.Commodity,
          minPrice: parseFloat(r.min_price || r.Min_Price || 0),
          maxPrice: parseFloat(r.max_price || r.Max_Price || 0),
          modalPrice: parseFloat(r.modal_price || r.Modal_Price || 0),
          date: r.arrival_date || r.Arrival_Date || new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Market API error:', error.message);
    }
  }

  // Fallback to mock data
  const cropLower = crop.toLowerCase();
  const mockData = MOCK_PRICES[cropLower] || MOCK_PRICES['rice'];
  return mockData.map(m => ({
    ...m,
    commodity: crop,
    date: new Date().toISOString()
  }));
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
