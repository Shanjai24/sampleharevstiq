import { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../context/FarmContext';
import { getWeather } from '../services/api';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AirIcon from '@mui/icons-material/Air';
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';
import OpacityIcon from '@mui/icons-material/Opacity';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ShieldIcon from '@mui/icons-material/Shield';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';

const codeToW = (c, precip = 0) => {
  if (precip >= 10.0) return { e: '⛈️', d: 'Heavy Rain', bg: '#FAF5FF', border: '#E9D5FF' };
  if (precip >= 2.5) return { e: '🌧️', d: 'Moderate Rain', bg: '#EFF6FF', border: '#BFDBFE' };
  if (precip >= 0.5) return { e: '🌦️', d: 'Light Rain', bg: '#EFF6FF', border: '#BFDBFE' };
  if (c <= 1) return { e: '☀️', d: 'Clear Sky', bg: '#FFFBEB', border: '#FDE68A' };
  if (c <= 3) return { e: '⛅', d: 'Partly Cloudy', bg: '#F8F9FA', border: '#E5E7EB' };
  if (c <= 48) return { e: '🌫️', d: 'Foggy / Hazy', bg: '#F3F4F6', border: '#E5E7EB' };
  if (c <= 67) return { e: '🌧️', d: 'Light Rain', bg: '#EFF6FF', border: '#BFDBFE' };
  if (c <= 82) return { e: '🌧️', d: 'Heavy Rain Showers', bg: '#EFF6FF', border: '#93C5FD' };
  if (c <= 99) return { e: '⛈️', d: 'Thunderstorm', bg: '#FAF5FF', border: '#E9D5FF' };
  return { e: '🌤️', d: 'Fair Weather', bg: '#F8F9FA', border: '#E5E7EB' };
};

export default function Weather() {
  const { farmData, location, sessionAnalyzed, lastAnalyzedAt } = useContext(FarmContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWeather = useCallback(() => {
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
  }, [location, farmData]);

  useEffect(() => {
    if (location || farmData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchWeather();
    } else {
      setLoading(false);
    }
  }, [fetchWeather, location, farmData]);

  if (!location && !farmData) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 80 }}>
        <div className="glass-card" style={{ maxWidth: 520, margin: '0 auto', padding: '44px 28px', border: '1px solid #E5E2D8' }}>
          <div style={{ fontSize: '3.6rem', marginBottom: 16 }}>🌤️</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 10, color: '#182420' }}>
            {t('weather.noLocationTitle', 'No Farm Location Selected')}
          </h2>
          <p style={{ color: '#485954', fontSize: '0.92rem', marginBottom: 28, lineHeight: 1.6 }}>
            {t('weather.noLocationDesc', 'Select your farm plot on the map to receive real-time satellite weather feeds, evapotranspiration data, and precision irrigation advice.')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-accent"
            style={{ width: '100%', padding: '12px 24px', fontSize: '0.95rem' }}
          >
            📍 {t('home.title', 'Analyse My Farm Plot')}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: 48, width: '45%', marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
          <div className="skeleton" style={{ height: 260 }} />
          <div className="skeleton" style={{ height: 260 }} />
        </div>
        <div className="skeleton" style={{ height: 160 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div className="glass-card" style={{ maxWidth: 500, margin: '0 auto', padding: 40 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>⚠️</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#182420', marginBottom: 8 }}>Forecast Telemetry Unavailable</h3>
          <p style={{ color: '#C85A32', fontSize: '0.9rem', fontWeight: 600, marginBottom: 20 }}>
            {error}
          </p>
          <button onClick={fetchWeather} className="btn-accent">
            <RefreshIcon sx={{ fontSize: 18 }} />
            <span>Retry Satellite Telemetry</span>
          </button>
        </div>
      </div>
    );
  }

  const cur = data?.current || {};
  const fc = data?.forecast || [];
  const todayFc = fc[0] || {};
  const effectiveCode = (cur.precipitation > 0 || todayFc.precipitation > 0) 
    ? (cur.weatherCode > 0 ? cur.weatherCode : (todayFc.weatherCode || 61)) 
    : cur.weatherCode;
  const effectivePrecip = cur.precipitation > 0 ? cur.precipitation : (todayFc.precipitation || 0);
  const w = codeToW(effectiveCode, effectivePrecip);
  const irr = data?.irrigation || {};
  const isLive = fc && fc.length > 0;
  const locDistrict = farmData?.location?.district || 'Selected Plot';
  const locState = farmData?.location?.state || '';

  return (
    <div className="page-container">
      {/* Session Plot Alert */}
      {!sessionAnalyzed && farmData && (
        <div style={{
          background: '#FFF8E7', border: '1px solid #FCE4B6', borderRadius: 12,
          padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.25rem' }}>📌</span>
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#B45309' }}>
                Weather Telemetry for Saved Plot
              </span>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#485954' }}>
                {locDistrict ? `${locDistrict}, ${locState}` : 'Farm plot'} {lastAnalyzedAt ? `• Analyzed ${lastAnalyzedAt}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="btn-accent"
            style={{ padding: '7px 16px', fontSize: '0.82rem' }}
          >
            📍 {t('dashboard.runFresh', 'Run Fresh Analysis')}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#182420', margin: 0, letterSpacing: '-0.02em' }}>
              Agricultural Weather Advisory
            </h1>
            {isLive ? (
              <span className="badge-live">
                <span className="badge-live-dot" />
                LIVE OPEN-METEO SATELLITE
              </span>
            ) : (
              <span className="badge-estimated">
                ⚡ REGIONAL ESTIMATE (OFFLINE CACHE)
              </span>
            )}
          </div>
          <p style={{ color: '#485954', fontSize: '0.88rem', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📍</span>
            <strong>{locDistrict}{locState ? `, ${locState}` : ''}</strong>
            <span style={{ color: '#748782' }}>•</span>
            <span style={{ color: '#748782', fontSize: '0.82rem' }}>High-resolution agro-meteorological telemetry</span>
          </p>
        </div>

        <button
          onClick={fetchWeather}
          className="btn-secondary"
          style={{ fontSize: '0.84rem' }}
        >
          <RefreshIcon sx={{ fontSize: 16 }} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Main Grid: Today's Weather & Soil/Irrigation */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 20,
        marginBottom: 24
      }}>
        {/* Today's Hero Weather Card */}
        <div className="hero-card-top-crop fade-in" style={{
          padding: '28px 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{
                background: '#1E5E3A', color: '#FFFFFF',
                fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                letterSpacing: '0.03em'
              }}>
                TODAY'S FIELD TELEMETRY
              </span>
              <span style={{ fontSize: '0.8rem', color: '#485954', fontWeight: 600 }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <h2 style={{ fontSize: '3.2rem', fontWeight: 800, margin: 0, color: '#182420', lineHeight: 1 }}>
                    {cur.temperature != null ? Math.round(cur.temperature) : 30}°
                  </h2>
                  <span style={{ fontSize: '1.3rem', color: '#748782', fontWeight: 600 }}>C</span>
                </div>
                <p style={{ color: '#1E5E3A', fontSize: '1.1rem', fontWeight: 800, margin: '6px 0 0' }}>
                  {w.d}
                </p>
              </div>

              <div style={{
                fontSize: '4.2rem', width: 90, height: 90, borderRadius: 24,
                background: '#FFFFFF', border: '1px solid #E5E2D8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-card)'
              }}>
                {w.e}
              </div>
            </div>
          </div>

          {/* Telemetry Sensor Bar */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
            background: '#FFFFFF', padding: '14px 16px', borderRadius: 12,
            border: '1px solid #E5E2D8', boxShadow: 'var(--shadow-subtle)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <OpacityIcon sx={{ fontSize: 15, color: '#0284c7' }} />
                <span style={{ fontSize: '0.72rem', color: '#748782' }}>Humidity</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#182420' }}>
                {cur.humidity || 65}%
              </span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <WaterDropIcon sx={{ fontSize: 15, color: '#1E5E3A' }} />
                <span style={{ fontSize: '0.72rem', color: '#748782' }}>Precipitation</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1E5E3A' }}>
                {cur.precipitation || 0} <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>mm</span>
              </span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <AirIcon sx={{ fontSize: 15, color: '#D97706' }} />
                <span style={{ fontSize: '0.72rem', color: '#748782' }}>Wind</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#182420' }}>
                {cur.windSpeed || 10} <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>km/h</span>
              </span>
            </div>
          </div>
        </div>

        {/* Soil & Precision Irrigation Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Soil Temp & Evapotranspiration Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="glass-card fade-in fade-in-delay-1" style={{ padding: '18px 20px', borderLeft: '4px solid #D97706' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <DeviceThermostatIcon sx={{ fontSize: 18, color: '#D97706' }} />
                <span style={{ fontSize: '0.76rem', color: '#748782', fontWeight: 700 }}>Soil Temp (6cm)</span>
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#D97706' }}>
                {data?.soilTemperature || '28.5'}°C
              </p>
              <span style={{ fontSize: '0.72rem', color: '#485954', marginTop: 4, display: 'block' }}>
                Optimal root activity band
              </span>
            </div>

            <div className="glass-card fade-in fade-in-delay-2" style={{ padding: '18px 20px', borderLeft: '4px solid #1E5E3A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <WaterDropIcon sx={{ fontSize: 18, color: '#1E5E3A' }} />
                <span style={{ fontSize: '0.76rem', color: '#748782', fontWeight: 700 }}>Evapotranspiration</span>
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#1E5E3A' }}>
                {data?.evapotranspiration || '4.2'} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>mm/day</span>
              </p>
              <span style={{ fontSize: '0.72rem', color: '#485954', marginTop: 4, display: 'block' }}>
                FAO-56 reference benchmark
              </span>
            </div>
          </div>

          {/* Smart Irrigation Schedule Card */}
          <div className="glass-card fade-in fade-in-delay-3" style={{
            padding: 22, flex: 1,
            background: '#F4F8EC', border: '1px solid #D4E5BC',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>🚿</span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#38761D' }}>
                    Smart Irrigation Recommendation
                  </h3>
                </div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 800, background: '#FFFFFF',
                  color: '#38761D', padding: '3px 9px', borderRadius: 20, border: '1px solid #D4E5BC'
                }}>
                  ADAPTIVE WATERING
                </span>
              </div>

              <p style={{ fontSize: '0.88rem', lineHeight: 1.55, color: '#182420', margin: '0 0 14px' }}>
                {irr.advice || 'Soil moisture index is balanced against evapotranspiration loss. Follow recommended drip or flood volume.'}
              </p>
            </div>

            {irr.litresPerAcre > 0 ? (
              <div style={{
                padding: '12px 18px', borderRadius: 10,
                background: '#FFFFFF', border: '1px solid #D4E5BC',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#748782', display: 'block' }}>Recommended Today</span>
                  <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1E5E3A' }}>
                    {irr.litresPerAcre?.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#485954', marginLeft: 6, fontWeight: 600 }}>Litres / acre</span>
                </div>
                <span style={{ fontSize: '1.4rem' }}>💧</span>
              </div>
            ) : (
              <div style={{
                padding: '10px 16px', borderRadius: 10,
                background: '#FFFFFF', border: '1px solid #D4E5BC',
                color: '#38761D', fontSize: '0.82rem', fontWeight: 700
              }}>
                ✅ No additional irrigation required today due to recent precipitation.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7-Day Extended Weather Forecast Section */}
      <div className="glass-card fade-in fade-in-delay-4" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarMonthIcon sx={{ color: '#1E5E3A', fontSize: 22 }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#182420' }}>
              7-Day Agricultural Forecast
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#748782' }}>
            Precipitation & Daily Temperature Bands
          </span>
        </div>

        {fc.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 12
          }}>
            {fc.map((day, i) => {
              const dw = codeToW(day.weatherCode, day.precipitation || 0);
              const dn = i === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'numeric', day: 'numeric' });
              const isToday = i === 0;

              return (
                <div key={i} style={{
                  textAlign: 'center', padding: '16px 10px',
                  background: isToday ? '#EBF5ED' : '#F8F7F2',
                  border: isToday ? '2px solid #C6E4CF' : '1px solid #E5E2D8',
                  borderRadius: 12,
                  boxShadow: isToday ? 'var(--shadow-subtle)' : 'none',
                  transition: 'transform 0.15s ease'
                }}>
                  <p style={{
                    fontSize: '0.76rem',
                    color: isToday ? '#1E5E3A' : '#748782',
                    fontWeight: isToday ? 800 : 700, margin: '0 0 6px'
                  }}>
                    {dn}
                  </p>

                  <div style={{ fontSize: '2.1rem', margin: '4px 0 8px' }}>
                    {dw.e}
                  </div>

                  <p style={{ fontSize: '0.72rem', color: '#485954', fontWeight: 600, margin: '0 0 6px', lineHeight: 1.2 }}>
                    {dw.d.split(' ')[0]}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#182420' }}>
                      {Math.round(day.maxTemp)}°
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#748782', fontWeight: 600 }}>
                      / {Math.round(day.minTemp)}°
                    </span>
                  </div>

                  {day.precipitation > 0 && (
                    <div style={{
                      marginTop: 8, padding: '2px 6px', borderRadius: 6,
                      background: '#EFF6FF', color: '#1E40AF',
                      fontSize: '0.7rem', fontWeight: 700
                    }}>
                      🌧️ {day.precipitation}mm
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: '#748782', fontSize: '0.88rem' }}>
            Extended forecast telemetry currently offline. Showing regional climate averages.
          </div>
        )}
      </div>

      {/* Weather Safety & Field Mitigation Advisory */}
      <div className="glass-card fade-in" style={{ padding: 24, background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <ShieldIcon sx={{ color: '#C85A32', fontSize: 22 }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#182420' }}>
            Agronomic Weather Mitigation Guidance
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <div style={{ padding: '14px 16px', borderRadius: 10, background: '#F8F7F2', border: '1px solid #E5E2D8' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1E5E3A', display: 'block', marginBottom: 4 }}>
              🌾 Sowing & Spray Timing
            </span>
            <p style={{ fontSize: '0.78rem', color: '#485954', margin: 0, lineHeight: 1.5 }}>
              Avoid foliar pesticide spraying if wind speed exceeds 15 km/h or rain is forecasted within 6 hours to prevent runoff.
            </p>
          </div>

          <div style={{ padding: '14px 16px', borderRadius: 10, background: '#F8F7F2', border: '1px solid #E5E2D8' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#D97706', display: 'block', marginBottom: 4 }}>
              ☀️ Heat & Moisture Stress
            </span>
            <p style={{ fontSize: '0.78rem', color: '#485954', margin: 0, lineHeight: 1.5 }}>
              If daytime temperatures rise above 34°C, irrigate early in the morning or post-sunset to minimize evapotranspiration losses.
            </p>
          </div>

          <div style={{ padding: '14px 16px', borderRadius: 10, background: '#F8F7F2', border: '1px solid #E5E2D8' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#C85A32', display: 'block', marginBottom: 4 }}>
              🌧️ Drainage Preparation
            </span>
            <p style={{ fontSize: '0.78rem', color: '#485954', margin: 0, lineHeight: 1.5 }}>
              Keep field bund drainage gates open if 7-day cumulative rainfall exceeds 60mm to protect root zones from waterlogging.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
