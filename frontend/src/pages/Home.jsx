import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PlaceIcon from '@mui/icons-material/Place';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import L from 'leaflet';
import axios from 'axios';
import { FarmContext } from '../context/FarmContext';
import { analyseFarm } from '../services/api';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Common Indian state abbreviations for the compact "Annur, Coimbatore, TN" display format.
const STATE_ABBR = {
  'Tamil Nadu': 'TN', 'Kerala': 'KL', 'Karnataka': 'KA', 'Andhra Pradesh': 'AP',
  'Telangana': 'TS', 'Maharashtra': 'MH', 'Gujarat': 'GJ', 'Rajasthan': 'RJ',
  'Madhya Pradesh': 'MP', 'Uttar Pradesh': 'UP', 'Punjab': 'PB', 'Haryana': 'HR',
  'Bihar': 'BR', 'West Bengal': 'WB', 'Odisha': 'OD', 'Assam': 'AS'
};

// Minimum gap between reverse-geocode calls to Nominatim (their usage policy asks for
// max ~1 request/second per app; this also cuts down on GPS-jitter-triggered repeat calls).
const GEOCODE_MIN_INTERVAL_MS = 1200;

function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 13, { duration: 1.5 });
  }, [position, map]);
  return null;
}

function MapClickHandler({ onSelectPoint }) {
  useMapEvents({
    click(e) {
      onSelectPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

export default function Home() {
  const { setFarmData, location, setLocation, areaAcres, setAreaAcres } = useContext(FarmContext);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPlaceName, setSelectedPlaceName] = useState('');
  const [mapCenter] = useState([11.1271, 78.6569]);
  const [mapZoom] = useState(7);
  const prefetchedDataRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const lastGeocodeAtRef = useRef(0);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Fix #2: settlement-level place name first, district as secondary context, not the
  // other way around. Nominatim's `address` block usually has town/village AND
  // state_district for the same point — previously we picked state_district first,
  // which is why GPS points near Annur/Sathyamangalam showed as "Erode"/"Coimbatore"
  // (the district they administratively fall under) instead of the actual town, and
  // why the label flickered near district borders even when the real location barely moved.
  const reverseGeocode = async (lat, lng) => {
    const now = Date.now();
    if (now - lastGeocodeAtRef.current < GEOCODE_MIN_INTERVAL_MS) {
      // Skip — too soon after the last call. Respects Nominatim's rate-limit guidance
      // and avoids firing a burst of requests from rapid map clicks or GPS jitter.
      return;
    }
    lastGeocodeAtRef.current = now;

    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: { lat, lon: lng, format: 'json', 'accept-language': 'en' },
        // NOTE: 'User-Agent' cannot actually be set by browser JS — browsers silently
        // strip it, so this request is sent unidentified regardless of this header.
        // Nominatim's usage policy asks for an identifiable user agent + contact info;
        // properly fixing this means proxying this call through the backend (which CAN
        // set real headers) rather than calling Nominatim directly from the browser.
        timeout: 4000
      });
      const addr = res.data?.address || {};

      const settlement = addr.town || addr.village || addr.suburb || addr.hamlet || addr.city || '';
      const district = (addr.state_district || addr.county || addr.city || '')
        .replace(/\s+District$/i, '');
      const state = addr.state || '';
      const stateAbbrev = STATE_ABBR[state] || state;

      // "Annur, Coimbatore, TN" — settlement + district + state abbreviation,
      // dropping district when it duplicates the settlement (e.g. inside a district HQ town).
      const parts = [
        settlement,
        district && district !== settlement ? district : null,
        stateAbbrev
      ].filter(Boolean);

      const name = parts.length > 0
        ? parts.join(', ')
        : (res.data?.display_name?.split(',').slice(0, 2).join(',') || '');

      if (name) setSelectedPlaceName(name);
    } catch {
      // ignore geocode error — selectedPlaceName just stays as whatever it was
    }
  };

  const triggerPrefetch = async (lat, lng) => {
    try {
      const data = await analyseFarm(lat, lng);
      prefetchedDataRef.current = data;
    } catch {
      // background error
    }
  };

  const handleSelectPoint = (pos, placeLabel = '') => {
    setLocation(pos);
    if (placeLabel) {
      setSelectedPlaceName(placeLabel);
    } else {
      reverseGeocode(pos.lat, pos.lng);
    }
    triggerPrefetch(pos.lat, pos.lng);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: { q: `${val}, India`, format: 'json', limit: 5, 'accept-language': 'en' },
          timeout: 4000
        });
        setSearchResults(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const handleSelectSearchResult = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const label = item.display_name.split(',').slice(0, 3).join(', ');
    setSearchQuery('');
    setSearchResults([]);
    handleSelectPoint({ lat, lng }, label);
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setStatus('Acquiring high-accuracy GPS fix...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        handleSelectPoint({ lat, lng });
        setStatus('');
      },
      (err) => {
        console.warn('GPS error:', err);
        setError('Could not access GPS. Please type your village/district in the search box or click directly on the map.');
        setStatus('');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAnalyse = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    setStatus(t('home.detecting') || 'Detecting Location & Soil Matrix...');

    let targetLat = location?.lat;
    let targetLng = location?.lng;

    if (!targetLat || !targetLng) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true, timeout: 4000
          });
        });
        targetLat = pos.coords.latitude;
        targetLng = pos.coords.longitude;
        setLocation({ lat: targetLat, lng: targetLng });
      } catch {
        targetLat = 11.3410;
        targetLng = 77.7172;
        setLocation({ lat: targetLat, lng: targetLng });
      }
    }

    try {
      setStatus(t('home.analyzing') || 'Running AgroPredict AI Models...');

      if (prefetchedDataRef.current && prefetchedDataRef.current.location?.lat === targetLat && prefetchedDataRef.current.areaAcres === (areaAcres || 1.0)) {
        setFarmData(prefetchedDataRef.current);
        navigate('/dashboard');
        return;
      }

      const data = await analyseFarm(targetLat, targetLng, { areaAcres: areaAcres || 1.0 });
      setFarmData(data);
      navigate('/dashboard');
    } catch (err) {
      console.error('Primary analysis error:', err);
      try {
        const fallbackLat = targetLat || 11.3410;
        const fallbackLng = targetLng || 77.7172;
        const data = await analyseFarm(fallbackLat, fallbackLng, { areaAcres: areaAcres || 1.0 });
        setFarmData(data);
        navigate('/dashboard');
      } catch (e) {
        console.error('Fallback analysis error:', e);
        setError('Failed to analyze farm conditions. Please check backend connectivity on port 5000.');
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 57px)', minHeight: 480, overflow: 'hidden' }}>
      {/* Map Layer */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ position: 'absolute', inset: 0, height: '100%', width: '100%' }}
        zoomControl={false}
      >
        {/*
          Fix #3: switched off the raw tile.openstreetmap.org endpoint.
          That server's usage policy explicitly disallows non-trivial production traffic
          hitting it directly and will rate-limit/block IPs that do — fine for local dev,
          risky the moment this gets real demo/user traffic. CARTO's Voyager basemap is
          free, requires no API key, and its usage terms explicitly permit this kind of
          moderate-traffic app use. For a real production deployment beyond the hackathon,
          swap this for a paid tile provider (MapTiler/Mapbox) or a self-hosted tile cache.
        */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        <MapClickHandler onSelectPoint={handleSelectPoint} />
        <FlyToLocation position={location ? [location.lat, location.lng] : null} />
        {location && (
          <Marker position={[location.lat, location.lng]}>
            <Popup>
              📍 <strong>{selectedPlaceName || 'Selected Farm Plot'}</strong>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Subtle overlay for legibility */}
      <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, background: 'rgba(248,247,242,0.10)', zIndex: 400 }} />

      {/* Centered Card Container */}
      <div style={{
        pointerEvents: 'none',
        position: 'absolute',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: '5vh',
      }}>
        {/* Main Landing Card */}
        <div
          style={{
            pointerEvents: 'auto',
            width: 'min(540px, calc(100vw - 28px))',
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '32px 36px 28px',
            boxShadow: '0 8px 40px rgba(24,36,32,0.13), 0 2px 8px rgba(24,36,32,0.06)',
            border: '1px solid rgba(20,80,50,0.07)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '999px',
            background: '#EBF5ED',
            border: '1px solid #C6E4CF',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#1E5E3A',
            letterSpacing: '0.01em',
            marginBottom: '14px',
          }}>
            <span>🌱</span>
            <span>Indian Smallholder Decision Support</span>
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(1.9rem, 5vw, 2.55rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            color: '#182420',
            letterSpacing: '-0.02em',
            textAlign: 'center',
            marginBottom: '10px',
          }}>
            AgroPredict AI
          </h1>

          {/* Description */}
          <p style={{
            fontSize: '0.875rem',
            fontWeight: 400,
            color: '#485954',
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: '380px',
            marginBottom: '22px',
          }}>
            {t('home.instructions') || 'Search your village or district, click anywhere on the map, or use GPS for tailored crop and climate recommendations.'}
          </p>

          {/* Search Box */}
          <div style={{ width: '100%', position: 'relative', marginBottom: '14px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              height: '50px',
              padding: '0 8px 0 14px',
              borderRadius: '10px',
              border: '1.5px solid #E0DDD5',
              background: '#FAFAF8',
              boxSizing: 'border-box',
            }}>
              <SearchIcon sx={{ color: '#9CA8A3', fontSize: 20, flexShrink: 0 }} />

              <input
                type="text"
                placeholder={t('home.searchPlaceholder') || 'Search village, city, or district (e.g. Madurai, Salem)...'}
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  border: 0,
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#182420',
                  fontFamily: 'inherit',
                }}
              />

              {searchLoading && (
                <CircularProgress size={15} sx={{ color: '#1E5E3A', flexShrink: 0 }} />
              )}

              {/* Compact GPS button inside search row */}
              <button
                type="button"
                onClick={handleUseGPS}
                title="Use GPS location"
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  height: '34px',
                  padding: '0 10px',
                  borderRadius: '7px',
                  border: '1px solid #B8DEC8',
                  background: '#EBF5ED',
                  color: '#1E5E3A',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#D6EFE0'}
                onMouseLeave={e => e.currentTarget.style.background = '#EBF5ED'}
              >
                <MyLocationIcon sx={{ fontSize: 13 }} />
                <span>GPS</span>
              </button>
            </div>

            {/* Search Results dropdown */}
            {searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 1000,
                marginTop: '4px',
                background: '#FFFFFF',
                border: '1px solid #E5E2D8',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(24,36,32,0.10)',
              }}>
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      border: 0,
                      borderBottom: idx < searchResults.length - 1 ? '1px solid #F0EFEA' : 'none',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#182420',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8F7F2'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
                  >
                    <PlaceIcon sx={{ color: '#C85A32', fontSize: 15, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Location + Farm Area row (shown only after location is selected) */}
          {location && (
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '10px',
              width: '100%',
              marginBottom: '16px',
              alignItems: 'stretch',
            }}>
              {/* Plot location selected */}
              <div style={{
                flex: '1 1 0',
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '9px 12px',
                borderRadius: '9px',
                border: '1.5px solid #C6E4CF',
                background: '#F2FBF5',
                overflow: 'hidden',
              }}>
                <PlaceIcon sx={{ color: '#1E5E3A', fontSize: 16, flexShrink: 0 }} />
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#1E5E3A',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {selectedPlaceName || 'Plot location selected'}
                </span>
                <CheckCircleIcon sx={{ color: '#1E5E3A', fontSize: 16, flexShrink: 0 }} />
              </div>

              {/* Farm area input */}
              <div style={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '9px 12px',
                borderRadius: '9px',
                border: '1.5px solid #E0DDD5',
                background: '#FAFAF8',
                whiteSpace: 'nowrap',
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#485954' }}>Farm area</span>
                <input
                  type="number"
                  min="0.1"
                  max="500"
                  step="0.1"
                  value={areaAcres || 1.0}
                  onChange={(e) => setAreaAcres(e.target.value)}
                  style={{
                    width: '52px',
                    height: '28px',
                    padding: '0 6px',
                    boxSizing: 'border-box',
                    borderRadius: '6px',
                    border: '1.5px solid #C6E4CF',
                    background: '#FFFFFF',
                    color: '#182420',
                    textAlign: 'center',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#748782' }}>acres</span>
              </div>
            </div>
          )}

          {/* Analyse My Farm CTA */}
          <button
            onClick={handleAnalyse}
            disabled={loading}
            style={{
              width: '100%',
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: '10px',
              border: 'none',
              background: loading ? '#D97B54' : '#C85A32',
              color: '#FFFFFF',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '-0.01em',
              fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(200,90,50,0.28)',
              transition: 'background 0.18s',
              marginTop: location ? 0 : '4px',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#B54E2A'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#C85A32'; }}
          >
            {loading ? (
              <>
                <CircularProgress size={18} sx={{ color: '#fff' }} />
                <span>{status}</span>
              </>
            ) : (
              <>
                <span>Analyse My Farm</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 400 }}>→</span>
              </>
            )}
          </button>

          {/* Error message */}
          {error && (
            <div style={{
              marginTop: '12px',
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#FDF3F0',
              border: '1px solid #F7D0C4',
              fontSize: '0.82rem',
              color: '#9F3E1E',
              fontWeight: 600,
            }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}