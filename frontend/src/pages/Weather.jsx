import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import { getWeather } from '../services/api';

const codeToW = (c) => {
  if (c <= 1) return { e: '☀️', d: 'Clear' };
  if (c <= 3) return { e: '⛅', d: 'Cloudy' };
  if (c <= 48) return { e: '🌫️', d: 'Fog' };
  if (c <= 67) return { e: '🌧️', d: 'Rain' };
  if (c <= 82) return { e: '🌧️', d: 'Heavy rain' };
  if (c <= 99) return { e: '⛈️', d: 'Storm' };
  return { e: '🌤️', d: 'Fair' };
};

export default function Weather() {
  const { farmData, location } = useContext(FarmContext);
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lat = location?.lat || farmData?.location?.lat || 20.59;
    const lng = location?.lng || farmData?.location?.lng || 78.96;
    getWeather(lat, lng)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [location, farmData]);

  if (loading) return <div style={{ padding: 24 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 12 }} />)}</div>;

  const cur = data?.current || {};
  const w = codeToW(cur.weatherCode);
  const fc = data?.forecast || [];
  const irr = data?.irrigation || {};

  return (
    <div style={{ padding: '16px 16px 80px', maxWidth: 600, margin: '0 auto' }}>
      <h1 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16 }}>🌤️ {t('weather.title')}</h1>

      {/* Today */}
      <div className="glass-card fade-in" style={{ padding: 24, marginBottom: 12, textAlign: 'center', background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(34,197,94,0.05))' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>{w.e}</div>
        <p style={{ fontSize: '2.5rem', fontWeight: 800 }}>{cur.temperature}°C</p>
        <p style={{ color: '#81c784', fontSize: '0.85rem', marginTop: 4 }}>{w.d}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16 }}>
          <div><p style={{ fontSize: '0.7rem', color: '#607d6c' }}>💧 Humidity</p><p style={{ fontWeight: 700 }}>{cur.humidity}%</p></div>
          <div><p style={{ fontSize: '0.7rem', color: '#607d6c' }}>🌧️ Rain</p><p style={{ fontWeight: 700 }}>{cur.precipitation}mm</p></div>
          <div><p style={{ fontSize: '0.7rem', color: '#607d6c' }}>💨 Wind</p><p style={{ fontWeight: 700 }}>{cur.windSpeed}km/h</p></div>
        </div>
      </div>

      {/* Soil & ET */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div className="glass-card fade-in" style={{ padding: 14, textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', color: '#607d6c' }}>🌡️ Soil Temp (6cm)</p>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 6, color: '#f59e0b' }}>{data?.soilTemperature}°C</p>
        </div>
        <div className="glass-card fade-in" style={{ padding: 14, textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', color: '#607d6c' }}>💦 Evapotranspiration</p>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 6, color: '#0ea5e9' }}>{data?.evapotranspiration}mm</p>
        </div>
      </div>

      {/* Irrigation */}
      <div className="glass-card fade-in" style={{ padding: 16, marginBottom: 12, background: 'rgba(14,165,233,0.06)' }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, color: '#0ea5e9' }}>🚿 Irrigation</p>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#c8e6c9' }}>{irr.advice || 'Analyse farm first.'}</p>
        {irr.litresPerAcre > 0 && (
          <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(14,165,233,0.1)', display: 'inline-block' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0ea5e9' }}>{irr.litresPerAcre?.toLocaleString()}</span>
            <span style={{ fontSize: '0.75rem', color: '#607d6c', marginLeft: 6 }}>litres/acre today</span>
          </div>
        )}
      </div>

      {/* 7-Day */}
      <div className="glass-card fade-in" style={{ padding: 16 }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: '#81c784' }}>📅 7-Day Forecast</p>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {fc.map((day, i) => {
            const dw = codeToW(day.weatherCode);
            const dn = i === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en', { weekday: 'short' });
            return (
              <div key={i} style={{ flex: '0 0 70px', textAlign: 'center', padding: '10px 4px', background: i === 0 ? 'rgba(34,197,94,0.1)' : 'transparent', borderRadius: 12 }}>
                <p style={{ fontSize: '0.65rem', color: '#607d6c', fontWeight: 600 }}>{dn}</p>
                <p style={{ fontSize: '1.5rem', margin: '6px 0' }}>{dw.e}</p>
                <p style={{ fontSize: '0.75rem', fontWeight: 700 }}>{day.maxTemp}°</p>
                <p style={{ fontSize: '0.65rem', color: '#607d6c' }}>{day.minTemp}°</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
