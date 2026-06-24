const axios = require('axios');

const BASE_URL = 'https://api.open-elevation.com/api/v1/lookup';

async function getElevation(lat, lng) {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        locations: `${lat},${lng}`
      },
      timeout: 10000
    });
    const elevation = response.data.results?.[0]?.elevation || 0;
    return { elevation: Math.round(elevation) };
  } catch (error) {
    console.error('Elevation API error:', error.message);
    // Fallback — use Open-Meteo elevation
    try {
      const fallback = await axios.get('https://api.open-meteo.com/v1/elevation', {
        params: { latitude: lat, longitude: lng }
      });
      return { elevation: Math.round(fallback.data.elevation?.[0] || 200) };
    } catch {
      return { elevation: 200 };
    }
  }
}

module.exports = { getElevation };
