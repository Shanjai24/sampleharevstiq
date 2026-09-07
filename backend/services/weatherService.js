const axios = require('axios');
const cache = require('./cacheService');

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const WEATHER_TTL = 30 * 60 * 1000; // 30 mins cache

async function getWeather(lat, lng) {
  const cacheKey = cache.getGeoKey('weather', lat, lng, 2);
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        latitude: lat,
        longitude: lng,
        current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code',
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max,relative_humidity_2m_mean',
        hourly: 'soil_temperature_6cm,et0_fao_evapotranspiration',
        timezone: 'Asia/Kolkata',
        forecast_days: 7
      },
      timeout: 5000
    });

    const data = response.data;
    const current = data.current;
    const daily = data.daily;

    const todayHours = data.hourly?.time?.filter(t => t.startsWith(daily.time[0])) || [];
    const todayIndices = todayHours.map((_, i) => i);
    const avgSoilTemp = todayIndices.length > 0
      ? todayIndices.reduce((sum, i) => sum + (data.hourly.soil_temperature_6cm[i] || 0), 0) / todayIndices.length
      : 28;
    const totalET = todayIndices.reduce((sum, i) => sum + (data.hourly.et0_fao_evapotranspiration[i] || 0), 0);

    const forecast = daily.time.map((date, i) => ({
      date,
      maxTemp: daily.temperature_2m_max[i],
      minTemp: daily.temperature_2m_min[i],
      precipitation: daily.precipitation_sum[i],
      weatherCode: daily.weather_code[i],
      windSpeed: daily.wind_speed_10m_max[i],
      humidity: daily.relative_humidity_2m_mean?.[i] || null
    }));

    // Sync current weather telemetry with today's daily forecast if current data lacks precipitation or weather code consistency
    const todayForecast = forecast[0] || {};
    const effectivePrecipitation = current.precipitation > 0 ? current.precipitation : (todayForecast.precipitation || 0);
    const effectiveWeatherCode = (current.weather_code === 0 && todayForecast.precipitation > 0) ? (todayForecast.weatherCode || 61) : current.weather_code;

    const todaySummary = {
      date: todayForecast.date,
      maxTemp: todayForecast.maxTemp,
      minTemp: todayForecast.minTemp,
      avgTemp: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      precipitation: todayForecast.precipitation,
      weatherCode: todayForecast.weatherCode,
      windSpeed: todayForecast.windSpeed
    };

    const result = {
      current: {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        precipitation: effectivePrecipitation,
        windSpeed: current.wind_speed_10m,
        weatherCode: effectiveWeatherCode
      },
      todaySummary,
      soilTemperature: Math.round(avgSoilTemp * 10) / 10,
      evapotranspiration: Math.round(totalET * 100) / 100,
      forecast,
      rainfall7day: forecast.reduce((sum, d) => sum + (d.precipitation || 0), 0),
      source: 'live'
    };

    cache.set(cacheKey, result, WEATHER_TTL);
    return result;
  } catch (error) {
    console.error('Weather API error (using fallback):', error.message);
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Dynamic realistic 7-day forecast fallback with varied conditions
    const fallbackForecast = [
      { date: todayStr, maxTemp: 31, minTemp: 23, precipitation: 0.0, weatherCode: 0, windSpeed: 12, humidity: 65 },
      { date: new Date(Date.now() + 86400000).toISOString().split('T')[0], maxTemp: 32, minTemp: 24, precipitation: 1.5, weatherCode: 61, windSpeed: 14, humidity: 70 },
      { date: new Date(Date.now() + 172800000).toISOString().split('T')[0], maxTemp: 30, minTemp: 22, precipitation: 8.2, weatherCode: 63, windSpeed: 16, humidity: 78 },
      { date: new Date(Date.now() + 259200000).toISOString().split('T')[0], maxTemp: 29, minTemp: 21, precipitation: 3.0, weatherCode: 61, windSpeed: 11, humidity: 72 },
      { date: new Date(Date.now() + 345600000).toISOString().split('T')[0], maxTemp: 33, minTemp: 24, precipitation: 0.0, weatherCode: 2, windSpeed: 10, humidity: 62 },
      { date: new Date(Date.now() + 432000000).toISOString().split('T')[0], maxTemp: 34, minTemp: 25, precipitation: 0.0, weatherCode: 0, windSpeed: 9, humidity: 58 },
      { date: new Date(Date.now() + 518400000).toISOString().split('T')[0], maxTemp: 32, minTemp: 23, precipitation: 0.5, weatherCode: 2, windSpeed: 12, humidity: 64 }
    ];

    const fallbackToday = {
      date: todayStr,
      maxTemp: 31,
      minTemp: 23,
      avgTemp: 31,
      humidity: 65,
      precipitation: 0.0,
      weatherCode: 0,
      windSpeed: 12
    };

    const fallback = {
      current: { temperature: 31, humidity: 65, precipitation: 0, windSpeed: 12, weatherCode: 0 },
      todaySummary: fallbackToday,
      soilTemperature: 28.5,
      evapotranspiration: 4.8,
      forecast: fallbackForecast,
      rainfall7day: 13.2,
      source: 'fallback'
    };
    cache.set(cacheKey, fallback, 5 * 60 * 1000); // 5 min fallback cache
    return fallback;
  }
}


module.exports = { getWeather };
