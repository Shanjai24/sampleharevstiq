// In-Memory Cache with TTL & Geogrid Rounding for AgroPredict backend

const cacheStore = new Map();

/**
 * Generates a cache key rounded to fixed decimal precision (grid cell)
 * @param {string} prefix 
 * @param {number} lat 
 * @param {number} lng 
 * @param {number} precision 
 */
function getGeoKey(prefix, lat, lng, precision = 2) {
  if (!lat || !lng) return null;
  const roundedLat = parseFloat(lat).toFixed(precision);
  const roundedLng = parseFloat(lng).toFixed(precision);
  return `${prefix}:${roundedLat}:${roundedLng}`;
}

/**
 * Gets a cached item if not expired
 */
function get(key) {
  if (!key) return null;
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Sets a cached item with TTL in milliseconds
 */
function set(key, data, ttlMs) {
  if (!key) return;
  cacheStore.set(key, {
    data,
    expiry: Date.now() + ttlMs
  });
}

// Clean up expired items periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (now > entry.expiry) {
      cacheStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

module.exports = {
  getGeoKey,
  get,
  set
};
