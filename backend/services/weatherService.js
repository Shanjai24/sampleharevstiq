const axios = require('axios');

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

async function getWeather(lat, lng) {
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
      }
    });

    const data = response.data;
    const current = data.current;
    const daily = data.daily;

    // Get today's soil temp and ET (average of hourly)
    const todayHours = data.hourly.time.filter(t => t.startsWith(daily.time[0]));
    const todayIndices = todayHours.map((_, i) => i);
    const avgSoilTemp = todayIndices.reduce((sum, i) => sum + (data.hourly.soil_temperature_6cm[i] || 0), 0) / todayIndices.length;
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

    return {
      current: {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code
      },
      soilTemperature: Math.round(avgSoilTemp * 10) / 10,
      evapotranspiration: Math.round(totalET * 100) / 100,
      forecast,
      rainfall7day: forecast.reduce((sum, d) => sum + (d.precipitation || 0), 0)
    };
  } catch (error) {
    console.error('Weather API error:', error.message);
    return {
      current: { temperature: 30, humidity: 65, precipitation: 0, windSpeed: 10, weatherCode: 0 },
      soilTemperature: 28,
      evapotranspiration: 5.0,
      forecast: [],
      rainfall7day: 20
    };
  }
}

module.exports = { getWeather };
