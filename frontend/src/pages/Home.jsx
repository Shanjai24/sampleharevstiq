import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import CircularProgress from '@mui/material/CircularProgress';
import L from 'leaflet';
import { FarmContext } from '../App';
import { analyseFarm } from '../services/api';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icons
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

export default function Home() {
  const { setFarmData, location, setLocation } = useContext(FarmContext);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [mapZoom] = useState(5);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleAnalyse = async () => {
    setLoading(true);
    setStatus(t('home.detecting'));

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000
        });
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLocation({ lat, lng });
      setMapCenter([lat, lng]);

      setStatus(t('home.analyzing'));

      const data = await analyseFarm(lat, lng);
      setFarmData(data);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      // Fallback: use a default Indian location
      const lat = 11.3410;
      const lng = 77.7172;
      setLocation({ lat, lng });
      setMapCenter([lat, lng]);

      setStatus(t('home.analyzing'));
      try {
        const data = await analyseFarm(lat, lng);
        setFarmData(data);
        navigate('/dashboard');
      } catch (e) {
        setStatus('Failed to analyse. Please ensure the backend is running.');
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Full-screen Map */}
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
        <FlyToLocation position={location ? [location.lat, location.lng] : null} />
        {location && (
          <Marker position={[location.lat, location.lng]}>
            <Popup>📍 Your Farm Location</Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(180deg, rgba(10,15,13,0.3) 0%, rgba(10,15,13,0.6) 50%, rgba(10,15,13,0.85) 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 500, pointerEvents: 'none'
      }}>
        {/* Logo */}
        <div style={{ pointerEvents: 'auto', textAlign: 'center' }}>
          <div style={{
            fontSize: '3rem', marginBottom: 8,
            filter: 'drop-shadow(0 0 20px rgba(22, 163, 74, 0.5))'
          }}>🌾</div>
          <h1 className="gradient-text" style={{
            fontSize: '2.2rem', fontWeight: 800, marginBottom: 4,
            letterSpacing: '-0.02em'
          }}>
            FarmSense
          </h1>
          <p style={{
            color: '#81c784', fontSize: '0.85rem', marginBottom: 40,
            fontWeight: 400, letterSpacing: '0.05em'
          }}>
            {t('app.tagline')}
          </p>

          {/* CTA Button */}
          <button
            onClick={handleAnalyse}
            disabled={loading}
            className="pulse-glow"
            style={{
              padding: '18px 40px',
              fontSize: '1.05rem',
              fontWeight: 700,
              border: 'none',
              borderRadius: 50,
              cursor: loading ? 'wait' : 'pointer',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#fff',
              display: 'flex', alignItems: 'center', gap: 10,
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 30px rgba(22, 163, 74, 0.4)',
              opacity: loading ? 0.8 : 1,
              transform: loading ? 'scale(0.98)' : 'scale(1)'
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ color: '#fff' }} />
                {status}
              </>
            ) : (
              <>📍 {t('home.title')}</>
            )}
          </button>

          {status && !loading && (
            <p style={{ color: '#f59e0b', marginTop: 16, fontSize: '0.85rem' }}>{status}</p>
          )}
        </div>
      </div>

      {/* Top-left branding */}
      <div style={{
        position: 'absolute', top: 14, left: 14, zIndex: 600,
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(10, 15, 13, 0.85)',
        backdropFilter: 'blur(12px)',
        padding: '6px 14px', borderRadius: 20,
        border: '1px solid rgba(34, 197, 94, 0.2)'
      }}>
        <span style={{ fontSize: '1.1rem' }}>🌾</span>
        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#22c55e' }}>FarmSense</span>
      </div>
    </div>
  );
}
