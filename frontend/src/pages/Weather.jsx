import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import { getWeather } from '../services/api';

const codeToW = (c) => {
  if (c <= 1) return { e: '☀️', d: 'Clear Sky' };
  if (c <= 3) return { e: '⛅', d: 'Partly Cloudy' };
  if (c <= 48) return { e: '🌫️', d: 'Foggy' };
  if (c <= 67) return { e: '🌧️', d: 'Light Rain' };
  if (c <= 82) return { e: '🌧️', d: 'Heavy Rain Showers' };
  if (c <= 99) return { e: '⛈️', d: 'Thunderstorm' };
  return { e: '🌤️', d: 'Fair Weather' };
};

export default function Weather() {
  const { farmData, location, sessionAnalyzed, lastAnalyzedAt } = useContext(FarmContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWeather = () => {
    const lat = location?.lat || farmData?.location?.lat;
    const lng = location?.lng || farmData?.location?.lng;
    if (!lat || !lng) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    getWeather(lat, lng)
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to fetch weather forecast. Please check network connection.');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (location || farmData) {
      fetchWeather();
    } else {
      setLoading(false);
    }
  }, [location, farmData]);

  if (!location && !farmData) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 80 }}>
        <div className="glass-card" style={{ maxWidth: 500, margin: '0 auto', padding: 40 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🌤️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>{t('weather.noLocationTitle', 'No Location Selected')}</h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.5 }}>
            {t('weather.noLocationDesc', 'Select your farm location on the map to view satellite weather feeds and precision irrigation recommendations.')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-accent pulse-glow"
            style={{ width: '100%' }}
          >
            📍 {t('home.title', 'Analyse My Farm')}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: 40, width: '40%', marginBottom: 20 }} />
        <div className="glass-card" style={{ height: 200, marginBottom: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="glass-card" style={{ height: 100 }} />
          <div className="glass-card" style={{ height: 100 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div className="glass-card" style={{ maxWidth: 500, margin: '0 auto', padding: 40 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>⚠️</div>
          <p style={{ color: '#ef4444', fontSize: '1rem', fontWeight: 600, marginBottom: 20 }}>
            {error}
          </p>
          <button onClick={fetchWeather} className="btn-accent">
            Retry Forecast
          </button>
        </div>
      </div>
    );
  }

  const cur = data?.current || {};
  const w = codeToW(cur.weatherCode);
  const fc = data?.forecast || [];
  const irr = data?.irrigation || {};

  return (
    <div className="page-container">
      {/* Location Alert */}
      {!sessionAnalyzed && farmData && (
        <div style={{
          background: '#FFF8E7', border: '1px solid #FCE4B6', borderRadius: 10,
          padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.1rem' }}>📌</span>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#D97706' }}>
                Weather Forecast for Farm Plot
              </span>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#4A5D58' }}>
                {farmData?.location?.district ? `${farmData.location.district}, ${farmData.location.state}` : 'Current plot'} {lastAnalyzedAt ? `(Analyzed ${lastAnalyzedAt})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="btn-accent"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            📍 {t('dashboard.runFresh', 'Run Fresh Analysis')}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="fade-in" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#1C2826' }}>
          🌤️ Agricultural Weather & Climate Advisory
        </h1>
        <p style={{ color: '#788A85', fontSize: '0.85rem', marginTop: 4 }}>
          Satellite weather telemetry, soil temperature metrics, & precision irrigation schedule
        </p>
      </div>

      {/* Grid Layout: Today's Weather & Soil/Irrigation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Today's Weather Card */}
        <div className="glass-card fade-in" style={{
          padding: 32, textAlign: 'center',
          background: '#EBF4ED', borderColor: '#C8E6C9',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '3.8rem', marginBottom: 6 }}>{w.e}</div>
            <h2 style={{ fontSize: '2.8rem', fontWeight: 800, margin: 0, color: '#1C2826' }}>{cur.temperature}°C</h2>
            <p style={{ color: '#2E6F40', fontSize: '1.05rem', fontWeight: 700, marginTop: 4 }}>{w.d}</p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20,
            background: '#FFFFFF', padding: 16, borderRadius: 10,
            border: '1px solid #E6E4DC'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#788A85', display: 'block' }}>💧 Humidity</span>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1C2826' }}>{cur.humidity}%</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#788A85', display: 'block' }}>🌧️ Rain</span>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#2E6F40' }}>{cur.precipitation} mm</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#788A85', display: 'block' }}>💨 Wind</span>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1C2826' }}>{cur.windSpeed} km/h</span>
            </div>
          </div>
        </div>

        {/* Soil & Irrigation Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Soil Temp & ET Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="glass-card fade-in fade-in-delay-1" style={{ padding: 20, textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#788A85', fontWeight: 600 }}>🌡️ Soil Temp (6cm)</span>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4, color: '#D97706', margin: 0 }}>
                {data?.soilTemperature || '28.5'}°C
              </p>
            </div>
            <div className="glass-card fade-in fade-in-delay-2" style={{ padding: 20, textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#788A85', fontWeight: 600 }}>💦 Evapotranspiration</span>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4, color: '#2E6F40', margin: 0 }}>
                {data?.evapotranspiration || '4.2'} mm
              </p>
            </div>
          </div>

          {/* Irrigation Card */}
          <div className="glass-card fade-in fade-in-delay-3" style={{ padding: 24, flex: 1, background: '#F4F8EC', borderColor: '#D5E6BC' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8, color: '#4D7C1B' }}>
              🚿 Smart Irrigation Schedule
            </h3>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#1C2826', margin: 0 }}>
              {irr.advice || 'Soil moisture is currently optimal. Maintain normal irrigation cycle.'}
            </p>
            {irr.litresPerAcre > 0 && (
              <div style={{ marginTop: 14, padding: '10px 16px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #D5E6BC', display: 'inline-block' }}>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#4D7C1B' }}>{irr.litresPerAcre?.toLocaleString()}</span>
                <span style={{ fontSize: '0.8rem', color: '#4A5D58', marginLeft: 8 }}>Litres / acre recommended today</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7-Day Forecast Section */}
      <div className="glass-card fade-in fade-in-delay-4" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, color: '#1C2826' }}>
          📅 7-Day Extended Weather Forecast
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: 12
        }}>
          {fc.map((day, i) => {
            const dw = codeToW(day.weatherCode);
            const dn = i === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en', { weekday: 'short' });
            return (
              <div key={i} style={{
                textAlign: 'center', padding: '16px 8px',
                background: i === 0 ? '#EBF4ED' : '#FAF9F5',
                border: i === 0 ? '1px solid #C8E6C9' : '1px solid #E6E4DC',
                borderRadius: 10
              }}>
                <p style={{ fontSize: '0.75rem', color: i === 0 ? '#2E6F40' : '#788A85', fontWeight: 700, margin: 0 }}>{dn}</p>
                <div style={{ fontSize: '1.8rem', margin: '6px 0' }}>{dw.e}</div>
                <p style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: '#1C2826' }}>{day.maxTemp}°</p>
                <p style={{ fontSize: '0.72rem', color: '#788A85', margin: '2px 0 0' }}>{day.minTemp}°</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
