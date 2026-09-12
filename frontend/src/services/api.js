import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

export const getUserId = () => {
  let userId = localStorage.getItem('agropredict_user_id') || localStorage.getItem('harvestiq_user_id');
  if (!userId) {
    userId = `user_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('agropredict_user_id', userId);
  }
  return userId;
};

export const analyseFarm = (lat, lng, options = {}) =>
  api.post('/api/farm/analyse', {
    lat,
    lng,
    areaAcres: options.areaAcres,
    soilInputTier: options.soilInputTier,
    manualSoil: options.manualSoil,
    soilReportData: options.soilReportData
  }).then(r => r.data);

export const parseSoilReportOCR = (textContent, sampleType) =>
  api.post('/api/soil-report/ocr', { textContent, sampleType }).then(r => r.data);

export const getWeather = (lat, lng) =>
  api.get(`/api/weather/${lat}/${lng}`).then(r => r.data);

export const getMarketPrices = (state, crop) =>
  api.get(`/api/market/${encodeURIComponent(state)}/${encodeURIComponent(crop)}`).then(r => r.data);

export const getBorewellRisk = (lat, lng) =>
  api.get(`/api/borewell/${lat}/${lng}`).then(r => r.data);

export const saveHistory = (data) =>
  api.post('/api/history/save', data).then(r => r.data);

export const getHistory = (userId) =>
  api.get(`/api/history/${userId || getUserId()}`).then(r => r.data);

export const deleteHistory = (id) =>
  api.delete(`/api/history/${id}`).then(r => r.data);

export const submitHarvestFeedback = (feedbackData) =>
  api.post('/api/history/feedback', feedbackData).then(r => r.data);

export const getHarvestFeedbacks = (userId) =>
  api.get(`/api/history/feedback/${userId || getUserId()}`).then(r => r.data);

export const sendChat = (message, farmData) =>
  api.post('/api/chat', { message, farmData }).then(r => r.data);

export const analyzeVision = (imageB64, cropHint) =>
  api.post('/api/chat/vision', { image: imageB64, cropHint }).then(r => r.data);

export const getChatStatus = () =>
  api.get('/api/chat/status').then(r => r.data).catch(() => ({ online: false, mode: 'limited' }));

export const predictYield = (data) =>
  api.post('/api/crops/predict-yield', data).then(r => r.data);

// ---------------------------------------------------------------------------
// Offline-first cache layer (Phase 4)
//
// Wraps a handful of read-only endpoints (weather, market prices) so that a
// dropped connection falls back to the last successful response instead of
// showing a blank error page. Nothing is ever silently presented as live —
// callers get back `{ data, stale, cachedAt }` and are responsible for
// showing a visible "offline / last updated" indicator when `stale` is true.
// ---------------------------------------------------------------------------

const CACHE_PREFIX = 'harvestiq_cache_';

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {
    // localStorage full or unavailable (e.g. private browsing) — degrade silently,
    // live fetches still work, we just won't have anything to fall back on next time.
  }
}

/**
 * Fetches live data via fetchFn; on failure, falls back to the last cached
 * response for `key`. Throws only when there is no live data AND no cache.
 */
async function fetchWithCache(key, fetchFn) {
  try {
    const data = await fetchFn();
    writeCache(key, data);
    return { data, stale: false, cachedAt: Date.now() };
  } catch (err) {
    const cached = readCache(key);
    if (cached) {
      return { data: cached.data, stale: true, cachedAt: cached.cachedAt };
    }
    throw err;
  }
}

export const getWeatherCached = (lat, lng) =>
  fetchWithCache(`weather_${lat}_${lng}`, () => getWeather(lat, lng));

export const getMarketPricesCached = (state, crop) =>
  fetchWithCache(`market_${state}_${crop}`, () => getMarketPrices(state, crop));

export default api;