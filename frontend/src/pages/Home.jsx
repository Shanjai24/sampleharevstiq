import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import CircularProgress from '@mui/material/CircularProgress';
import L from 'leaflet';
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

// Map Click Listener to enable Optimistic Prefetching on map selection
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
  const [mapCenter] = useState([20.5937, 78.9629]);
  const [mapZoom] = useState(5);
  const prefetchedDataRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Optimistic Prefetching when location is selected/clicked
  const triggerPrefetch = async (lat, lng) => {
    try {
      const data = await analyseFarm(lat, lng);
      prefetchedDataRef.current = data;
    } catch (e) {
      // Background prefetch error silent catch
    }
  };

  const handleSelectPoint = (pos) => {
    setLocation(pos);
    triggerPrefetch(pos.lat, pos.lng);
  };

  const handleAnalyse = async () => {
    if (loading) return; // Debounce guard against double clicks
    setLoading(true);
    setError('');
    setStatus(t('home.detecting') || 'Detecting Location & Soil Matrix...');

    try {
      let lat = location?.lat;
      let lng = location?.lng;

      if (!lat || !lng) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true, timeout: 10000
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        setLocation({ lat, lng });
      }

      setStatus(t('home.analyzing') || 'Running AgroPredict AI...');

      // If prefetch already finished, use instant result
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
      // Fallback: default Tamil Nadu location
      const lat = 11.3410;
      const lng = 77.7172;
      setLocation({ lat, lng });
      try {
        const data = await analyseFarm(lat, lng);
        setFarmData(data);
        navigate('/dashboard');
      } catch (e) {
        setError('Failed to analyze farm conditions. Please verify backend service connectivity.');
        setLoading(false);
      }
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
            <Popup>📍 Selected Plot ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})</Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Hero Glass Control Panel */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(180deg, rgba(250,249,245,0.2) 0%, rgba(250,249,245,0.5) 50%, rgba(250,249,245,0.85) 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, zIndex: 500, pointerEvents: 'none'
      }}>
        <div className="glass-card-static fade-in" style={{
          pointerEvents: 'auto',
          textAlign: 'center',
          maxWidth: 520,
          width: '100%',
          padding: '36px 32px',
          background: '#FFFFFF',
          border: '1px solid #E6E4DC',
          borderRadius: 14,
          boxShadow: '0 8px 30px rgba(28, 40, 38, 0.08)'
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#EBF4ED', border: '1px solid #C8E6C9',
            padding: '5px 14px', borderRadius: 20, fontSize: '0.75rem', color: '#2E6F40',
            fontWeight: 700, marginBottom: 14
          }}>
            <span>🌱</span>
            <span>Your Farm's AI Assistant</span>
          </div>

          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 10, letterSpacing: '-0.02em', lineHeight: 1.15, color: '#1C2826' }}>
            AgroPredict
          </h1>

          <p style={{ color: '#4A5D58', fontSize: '0.92rem', marginBottom: 24, lineHeight: 1.55 }}>
            {t('app.tagline') || 'Select your land on the map to receive tailored crop choices, seasonal weather alerts, and groundwater safety insights.'}
          </p>

          {/* CTA Button */}
          <button
            onClick={handleAnalyse}
            disabled={loading}
            className="btn-accent"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '11px 26px', minWidth: 240, fontSize: '0.92rem',
              borderRadius: 10, margin: '0 auto',
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
                <span style={{ fontSize: '1.05rem' }}>📍</span>
                <span>{t('home.title') || 'Analyse My Farm Plot'}</span>
              </>
            )}
          </button>

          {error && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 8,
              background: '#FDF3F0', border: '1px solid #F8D2C6',
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
