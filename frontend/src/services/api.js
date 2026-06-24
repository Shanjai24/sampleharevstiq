import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

export const analyseFarm = (lat, lng) =>
  api.post('/api/farm/analyse', { lat, lng }).then(r => r.data);

export const getWeather = (lat, lng) =>
  api.get(`/api/weather/${lat}/${lng}`).then(r => r.data);

export const getSoil = (lat, lng) =>
  api.get(`/api/soil/${lat}/${lng}`).then(r => r.data);

export const getMarketPrices = (state, crop) =>
  api.get(`/api/market/${encodeURIComponent(state)}/${encodeURIComponent(crop)}`).then(r => r.data);

export const getBorewellRisk = (lat, lng) =>
  api.get(`/api/borewell/${lat}/${lng}`).then(r => r.data);

export const saveHistory = (data) =>
  api.post('/api/history/save', data).then(r => r.data);

export const getHistory = (userId = 'default-user') =>
  api.get(`/api/history/${userId}`).then(r => r.data);

export const deleteHistory = (id) =>
  api.delete(`/api/history/${id}`).then(r => r.data);

export const sendChat = (message, farmData) =>
  api.post('/api/chat', { message, farmData }).then(r => r.data);

export default api;
