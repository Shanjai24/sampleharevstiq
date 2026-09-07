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
import { FarmContext } from '../context/FarmContext';
import { analyseFarm } from '../services/api';
import { Card, ErrorBanner } from '../components/ui';
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
  const navigate = useNavigate();
  const { t } = useTranslation();

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
    } catch {
      // ignore geocode error
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
    <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="absolute inset-0 h-full w-full"
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
              📍 <strong>{selectedPlaceName || 'Selected Farm Plot'}</strong>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="pointer-events-none absolute inset-0 z-[500] flex flex-col items-center justify-center bg-gradient-to-b from-bg/15 via-bg/45 to-bg/90 p-5">
        <Card variant="static" className="fade-in pointer-events-auto w-full max-w-[540px] rounded-2xl px-7 py-8 text-center shadow-hero">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary-border bg-primary-soft px-3.5 py-1 text-xs font-extrabold text-primary">
            <span>🌱</span>
            <span>Indian Smallholder Decision Support</span>
          </div>

          <h1 className="mb-1.5 text-[2.1rem] font-extrabold leading-tight tracking-tight text-text-primary">
            AgroPredict AI
          </h1>

          <p className="mb-5 text-[0.88rem] leading-snug text-text-secondary">
            Search your village/district, click anywhere on the map, or use GPS to receive tailored crop & climate recommendations.
          </p>

          <div className="relative mb-3.5">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-1.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.03)]">
              <SearchIcon sx={{ color: '#748782', fontSize: 20 }} />
              <input
                type="text"
                placeholder="Search village, city, or district (e.g. Madurai, Salem)..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="flex-1 border-0 bg-transparent text-[0.88rem] font-semibold text-text-primary outline-none"
              />
              {searchLoading && <CircularProgress size={16} sx={{ color: '#1E5E3A' }} />}
              <button
                type="button"
                onClick={handleUseGPS}
                title="Use Current GPS"
                className="flex min-h-11 cursor-pointer items-center gap-1 rounded-lg border border-primary-border bg-primary-soft px-2.5 py-1.5 text-xs font-extrabold text-primary"
              >
                <MyLocationIcon sx={{ fontSize: 14 }} />
                <span>GPS</span>
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="absolute top-full right-0 left-0 z-[1000] mt-1 overflow-hidden rounded-xl border border-border bg-surface text-left shadow-card">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="flex w-full cursor-pointer items-center gap-2 border-0 border-b border-[#F0EFEA] bg-surface px-3.5 py-2.5 text-left text-[0.82rem] font-semibold text-text-primary last:border-b-0 hover:bg-bg"
                  >
                    <PlaceIcon sx={{ color: '#C85A32', fontSize: 16, flexShrink: 0 }} />
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {item.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {location && (
            <div className="mb-[18px] flex flex-col items-center gap-2.5">
              <div className="inline-flex max-w-full items-center gap-1.5 rounded-[10px] border border-border bg-bg px-3.5 py-1.5 text-xs font-bold text-text-primary">
                <PlaceIcon sx={{ color: '#C85A32', fontSize: 16 }} />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {selectedPlaceName ? selectedPlaceName : 'Selected Plot Location'}
                </span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-primary-light bg-surface-muted px-3.5 py-1.5">
                <span className="text-[0.82rem] font-bold text-primary">
                  🌾 Farm Area (Acres):
                </span>
                <input
                  type="number"
                  min="0.1"
                  max="500"
                  step="0.1"
                  value={areaAcres || 1.0}
                  onChange={(e) => setAreaAcres(e.target.value)}
                  className="w-[70px] rounded-md border border-primary-border bg-surface px-2 py-0.5 text-center text-[0.88rem] font-extrabold text-primary outline-none"
                />
                <span className="text-xs font-semibold text-text-secondary">acres</span>
              </div>
            </div>
          )}

          <div>
            <button
              onClick={handleAnalyse}
              disabled={loading}
              className={`btn-accent mx-auto inline-flex min-w-[260px] items-center justify-center gap-2.5 rounded-xl px-7 py-3 text-[0.95rem] ${loading ? 'opacity-85' : ''}`}
            >
              {loading ? (
                <>
                  <CircularProgress size={18} sx={{ color: '#fff' }} />
                  <span>{status}</span>
                </>
              ) : (
                <>
                  <span className="text-lg">📍</span>
                  <span>{t('home.title') || 'Analyse Selected Plot'}</span>
                </>
              )}
            </button>
          </div>

          <ErrorBanner className="mt-3.5 text-left">{error}</ErrorBanner>
        </Card>
      </div>
    </div>
  );
}
