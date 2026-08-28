import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PlaceIcon from '@mui/icons-material/Place';
import L from 'leaflet';
import axios from 'axios';
import { FarmContext } from '../App';
import { analyseFarm } from '../services/api';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 13, { duration: 1.5 });
  }, [position, map]);
  return null;
}

// Map Click Listener
function MapClickHandler({ onSelectPoint }) {
  useMapEvents({
    click(e) {
      onSelectPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

export default function Home() {
  const { setFarmData, location, setLocation } = useContext(FarmContext);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPlaceName, setSelectedPlaceName] = useState('');
  const [mapCenter] = useState([11.1271, 78.6569]); // Default Tamil Nadu centroid
  const [mapZoom] = useState(7);
  const prefetchedDataRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Reverse geocode whenever pin is placed
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: { lat, lon: lng, format: 'json', 'accept-language': 'en' },
        headers: { 'User-Agent': 'AgroPredict/2.0' },
        timeout: 4000
      });
      const addr = res.data?.address || {};
      const dist = (addr.state_district || addr.district || addr.county || addr.city || addr.town || addr.village || '').replace(/\s+District$/i, '');
      const state = addr.state || '';
      const name = dist && state ? `${dist}, ${state}` : res.data?.display_name?.split(',').slice(0, 2).join(',') || '';
      if (name) setSelectedPlaceName(name);
    } catch (e) {
      // ignore geocode error
    }
  };

  const triggerPrefetch = async (lat, lng) => {
    try {
      const data = await analyseFarm(lat, lng);
      prefetchedDataRef.current = data;
    } catch (e) {
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

  // Search places via Nominatim
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
          headers: { 'User-Agent': 'AgroPredict/2.0' },
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

    try {
      let lat = location?.lat;
      let lng = location?.lng;

      if (!lat || !lng) {
        // If not selected yet, prompt user or use GPS
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true, timeout: 8000
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        setLocation({ lat, lng });
      }

      setStatus(t('home.analyzing') || 'Running AgroPredict AI Models...');

      if (prefetchedDataRef.current && prefetchedDataRef.current.location?.lat === lat) {
        setFarmData(prefetchedDataRef.current);
        navigate('/dashboard');
        return;
      }

      const data = await analyseFarm(lat, lng);
      setFarmData(data);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      if (!location) {
        // Default centroid fallback
        const lat = 11.3410;
        const lng = 77.7172;
        setLocation({ lat, lng });
        try {
          const data = await analyseFarm(lat, lng);
          setFarmData(data);
          navigate('/dashboard');
          return;
        } catch (e) {
          setError('Failed to analyze farm conditions. Please check backend connectivity.');
          setLoading(false);
          return;
        }
      }
      setError('Failed to analyze farm conditions. Please verify backend connectivity.');
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Full-screen Interactive Map */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelectPoint={handleSelectPoint} />
        <FlyToLocation position={location ? [location.lat, location.lng] : null} />
        {location && (
          <Marker position={[location.lat, location.lng]}>
            <Popup>
              📍 <strong>{selectedPlaceName || 'Selected Farm Plot'}</strong><br />
              ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Control Card */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(180deg, rgba(248,247,242,0.15) 0%, rgba(248,247,242,0.45) 50%, rgba(248,247,242,0.88) 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 20, zIndex: 500, pointerEvents: 'none'
      }}>
        <div className="glass-card-static fade-in" style={{
          pointerEvents: 'auto',
          textAlign: 'center',
          maxWidth: 540,
          width: '100%',
          padding: '32px 28px',
          background: '#FFFFFF',
          border: '1px solid #E5E2D8',
          borderRadius: 16,
          boxShadow: 'var(--shadow-hero)'
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#EBF5ED', border: '1px solid #C6E4CF',
            padding: '5px 14px', borderRadius: 20, fontSize: '0.76rem', color: '#1E5E3A',
            fontWeight: 800, marginBottom: 12
          }}>
            <span>🌱</span>
            <span>Indian Smallholder Decision Support</span>
          </div>

          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em', lineHeight: 1.15, color: '#182420' }}>
            AgroPredict AI
          </h1>

          <p style={{ color: '#485954', fontSize: '0.88rem', marginBottom: 20, lineHeight: 1.45 }}>
            Search your village/district, click anywhere on the map, or use GPS to receive tailored crop & climate recommendations.
          </p>

          {/* Search Box & GPS Bar */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#F8F7F2', border: '1px solid #E5E2D8',
              borderRadius: 12, padding: '6px 12px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <SearchIcon sx={{ color: '#748782', fontSize: 20 }} />
              <input
                type="text"
                placeholder="Search village, city, or district (e.g. Madurai, Salem)..."
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  border: 'none', background: 'transparent', outline: 'none',
                  flex: 1, fontSize: '0.88rem', color: '#182420', fontWeight: 600
                }}
              />
              {searchLoading && <CircularProgress size={16} sx={{ color: '#1E5E3A' }} />}
              <button
                type="button"
                onClick={handleUseGPS}
                title="Use Current GPS"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: '#EBF5ED', border: '1px solid #C6E4CF',
                  borderRadius: 8, padding: '5px 10px', fontSize: '0.74rem',
                  fontWeight: 800, color: '#1E5E3A', cursor: 'pointer'
                }}
              >
                <MyLocationIcon sx={{ fontSize: 14 }} />
                <span>GPS</span>
              </button>
            </div>

            {/* Search Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                background: '#FFFFFF', border: '1px solid #E5E2D8', borderRadius: 12,
                boxShadow: 'var(--shadow-card)', zIndex: 1000, overflow: 'hidden', textAlign: 'left'
              }}>
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSearchResult(item)}
                    style={{
                      padding: '10px 14px', borderBottom: idx < searchResults.length - 1 ? '1px solid #F0EFEA' : 'none',
                      cursor: 'pointer', fontSize: '0.82rem', color: '#182420', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'background 0.1s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8F7F2'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
                  >
                    <PlaceIcon sx={{ color: '#C85A32', fontSize: 16, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.display_name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Selection Indicator */}
          {location && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#F8F7F2', border: '1px solid #E5E2D8',
              padding: '6px 14px', borderRadius: 10, fontSize: '0.78rem',
              color: '#182420', fontWeight: 700, marginBottom: 18, maxWidth: '100%'
            }}>
              <PlaceIcon sx={{ color: '#C85A32', fontSize: 16 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedPlaceName ? selectedPlaceName : `Plot (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`}
              </span>
            </div>
          )}

          {/* CTA Button */}
          <div>
            <button
              onClick={handleAnalyse}
              disabled={loading}
              className="btn-accent"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '12px 28px', minWidth: 260, fontSize: '0.95rem',
                borderRadius: 12, margin: '0 auto',
                opacity: loading ? 0.85 : 1
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={18} sx={{ color: '#fff' }} />
                  <span>{status}</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '1.1rem' }}>📍</span>
                  <span>{t('home.title') || 'Analyse Selected Plot'}</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 10,
              background: '#FDF3F0', border: '1px solid #F7D0C4',
              color: '#C85A32', fontSize: '0.82rem', lineHeight: 1.4
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
