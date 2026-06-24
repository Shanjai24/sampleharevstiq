import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import GrassIcon from '@mui/icons-material/Grass';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const weatherCodeToEmoji = (code) => {
  if (code <= 1) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '❄️';
  if (code <= 99) return '⛈️';
  return '🌤️';
};

export default function Dashboard() {
  const { farmData } = useContext(FarmContext);
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!farmData) {
    return (
      <div style={{ padding: 24, textAlign: 'center', paddingTop: 100 }}>
        <p style={{ color: '#81c784', fontSize: '1.1rem', marginBottom: 16 }}>
          No farm data yet
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: '#fff', border: 'none', padding: '12px 32px',
            borderRadius: 25, cursor: 'pointer', fontWeight: 600
          }}
        >
          📍 Analyse My Farm
        </button>
      </div>
    );
  }

  const { weather, borewell, crops, location: loc, soil } = farmData;

  const riskColor = borewell?.riskLevel === 'HIGH' ? '#ef4444' : borewell?.riskLevel === 'MODERATE' ? '#f59e0b' : '#22c55e';
  const riskEmoji = borewell?.riskLevel === 'HIGH' ? '🔴' : borewell?.riskLevel === 'MODERATE' ? '🟡' : '🟢';

  return (
    <div style={{ padding: '16px 16px 80px', maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: 20 }}>
        <h1 className="gradient-text" style={{ fontSize: '1.6rem', fontWeight: 800 }}>
          {t('dashboard.title')}
        </h1>
        <p style={{ color: '#607d6c', fontSize: '0.8rem', marginTop: 4 }}>
          📍 {loc?.district}, {loc?.state} • {loc?.lat?.toFixed(4)}, {loc?.lng?.toFixed(4)}
        </p>
      </div>

      {/* 2×2 Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Groundwater Risk */}
        <div
          className="glass-card fade-in fade-in-delay-1"
          onClick={() => navigate('/borewell')}
          style={{ padding: 18, cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <WaterDropIcon sx={{ color: '#0ea5e9', fontSize: 22 }} />
            <span style={{ fontSize: '0.75rem', color: '#81c784', fontWeight: 600 }}>
              {t('dashboard.groundwater')}
            </span>
          </div>
          <div style={{ fontSize: '2rem', marginBottom: 4 }}>{riskEmoji}</div>
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: riskColor }}>
            {t(`borewell.${borewell?.riskLevel || 'MODERATE'}`)}
          </p>
          <p style={{ fontSize: '0.7rem', color: '#607d6c', marginTop: 4 }}>
            Score: {borewell?.riskScore || 0}/100
          </p>
        </div>

        {/* Weather */}
        <div
          className="glass-card fade-in fade-in-delay-2"
          onClick={() => navigate('/weather')}
          style={{ padding: 18, cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <WbSunnyIcon sx={{ color: '#f59e0b', fontSize: 22 }} />
            <span style={{ fontSize: '0.75rem', color: '#81c784', fontWeight: 600 }}>
              {t('dashboard.weather')}
            </span>
          </div>
          <div style={{ fontSize: '2rem', marginBottom: 4 }}>
            {weatherCodeToEmoji(weather?.current?.weatherCode)}
          </div>
          <p style={{ fontSize: '1.3rem', fontWeight: 700 }}>
            {weather?.current?.temperature || '--'}°C
          </p>
          <p style={{ fontSize: '0.7rem', color: '#607d6c', marginTop: 4 }}>
            💧 {weather?.current?.humidity || '--'}% • 🌧️ {weather?.current?.precipitation || 0}mm
          </p>
        </div>

        {/* Top Crops */}
        <div
          className="glass-card fade-in fade-in-delay-3"
          onClick={() => crops?.[0] && navigate(`/crop/${crops[0].crop}`)}
          style={{ padding: 18, cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <GrassIcon sx={{ color: '#22c55e', fontSize: 22 }} />
            <span style={{ fontSize: '0.75rem', color: '#81c784', fontWeight: 600 }}>
              {t('dashboard.crops')}
            </span>
          </div>
          {(crops || []).slice(0, 3).map((c, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '4px 0', borderBottom: i < 2 ? '1px solid rgba(34,197,94,0.1)' : 'none'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 500, textTransform: 'capitalize' }}>
                {c.name || c.crop}
              </span>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, color: '#22c55e',
                background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 10
              }}>
                {Math.round((c.score || 0) * 100)}%
              </span>
            </div>
          ))}
        </div>

        {/* Market Prices */}
        <div
          className="glass-card fade-in fade-in-delay-4"
          onClick={() => navigate('/market')}
          style={{ padding: 18, cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUpIcon sx={{ color: '#8b5cf6', fontSize: 22 }} />
            <span style={{ fontSize: '0.75rem', color: '#81c784', fontWeight: 600 }}>
              {t('dashboard.market')}
            </span>
          </div>
          {(crops || []).slice(0, 3).map((c, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '4px 0', borderBottom: i < 2 ? '1px solid rgba(34,197,94,0.1)' : 'none'
            }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>
                {c.name || c.crop}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b' }}>
                ₹{c.currentPrice?.toLocaleString() || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Soil Info Banner */}
      <div className="glass-card fade-in" style={{ padding: 16, marginTop: 12 }}>
        <p style={{ fontSize: '0.75rem', color: '#81c784', fontWeight: 600, marginBottom: 8 }}>
          🧪 Soil Profile
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div><span style={{ fontSize: '0.7rem', color: '#607d6c' }}>Type</span><br/><span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{soil?.soilType}</span></div>
          <div><span style={{ fontSize: '0.7rem', color: '#607d6c' }}>pH</span><br/><span style={{ fontWeight: 600 }}>{soil?.ph}</span></div>
          <div><span style={{ fontSize: '0.7rem', color: '#607d6c' }}>Clay</span><br/><span style={{ fontWeight: 600 }}>{soil?.clay}%</span></div>
          <div><span style={{ fontSize: '0.7rem', color: '#607d6c' }}>Sand</span><br/><span style={{ fontWeight: 600 }}>{soil?.sand}%</span></div>
          <div><span style={{ fontSize: '0.7rem', color: '#607d6c' }}>Depth</span><br/><span style={{ fontWeight: 600 }}>{soil?.depth}cm</span></div>
        </div>
      </div>

      {/* Quick Crop Cards */}
      <div style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 10, color: '#81c784' }}>
          🌱 Recommended Crops
        </h3>
        {(crops || []).map((crop, i) => (
          <div
            key={i}
            className="glass-card fade-in"
            onClick={() => navigate(`/crop/${crop.crop}`)}
            style={{
              padding: 16, marginBottom: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `linear-gradient(135deg, rgba(34,197,94,${0.3 - i * 0.05}), rgba(14,165,233,${0.2 - i * 0.04}))`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.3rem'
            }}>
              🌾
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, textTransform: 'capitalize', fontSize: '0.95rem' }}>
                  {crop.name || crop.crop}
                </span>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700, color: '#22c55e',
                  background: 'rgba(34,197,94,0.15)', padding: '3px 10px', borderRadius: 12
                }}>
                  {Math.round((crop.score || 0) * 100)}% match
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#607d6c', marginTop: 3 }}>
                🗓 {crop.harvestDays || '—'} days • 💧 {crop.waterPerDay || '—'}mm/day • ₹{crop.currentPrice?.toLocaleString() || '—'}/q
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
