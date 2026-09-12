// Generic "cache last successful response, fall back to it on failure"
// helper. Shared by Weather.jsx and Market.jsx so the offline-fallback
// behavior (and its honesty rule — always show how old the data is,
// never silently present stale data as live) lives in one place.

const PREFIX = 'harvestiq_cache_';

/**
 * Save a successful API response to localStorage with a timestamp.
 * @param {string} key - unique cache key, e.g. `weather_${lat}_${lng}`
 * @param {any} data - the data to cache (must be JSON-serializable)
 */
export function saveToCache(key, data) {
    try {
        localStorage.setItem(
            PREFIX + key,
            JSON.stringify({ data, cachedAt: new Date().toISOString() })
        );
    } catch (e) {
        // localStorage can throw if full/disabled — caching is a nice-to-have,
        // never let it break the actual feature
        console.warn('[offlineCache] Failed to cache', key, e.message);
    }
}

/**
 * Read a cached response, if any.
 * @returns {{ data: any, cachedAt: string } | null}
 */
export function readFromCache(key) {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        console.warn('[offlineCache] Failed to read cache', key, e.message);
        return null;
    }
}

/**
 * Human-readable "X ago" string for a cachedAt ISO timestamp.
 */
export function timeAgo(isoString) {
    if (!isoString) return 'unknown time';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}