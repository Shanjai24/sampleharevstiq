import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import { getMarketPrices } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CropDetail() {
  const { name } = useParams();
  const { farmData } = useContext(FarmContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [marketData, setMarketData] = useState(null);

  const crop = farmData?.crops?.find(c => c.crop === name);
  const state = farmData?.location?.state || 'Tamil Nadu';

  useEffect(() => {
    if (name && state) {
      getMarketPrices(state, name).then(setMarketData).catch(console.error);
    }
  }, [name, state]);

  if (!crop) {
    return (
      <div style={{ padding: 24, textAlign: 'center', paddingTop: 100 }}>
        <p style={{ color: '#81c784' }}>Crop data not available</p>
        <button onClick={() => navigate('/dashboard')}
          style={{ marginTop: 16, background: '#16a34a', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 20, cursor: 'pointer' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const plantWindow = crop.plantMonths?.map(m => monthNames[m - 1]).join(', ') || 'Year-round';
  const priceHistory = marketData?.history || [];
  const trend = marketData?.trend || 'STABLE';
  const trendEmoji = trend === 'UP' ? '📈' : trend === 'DOWN' ? '📉' : '➡️';
  const trendColor = trend === 'UP' ? '#22c55e' : trend === 'DOWN' ? '#ef4444' : '#f59e0b';

  return (
    <div style={{ padding: '16px 16px 80px', maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ color: '#81c784' }}>
          <ArrowBackIcon />
        </IconButton>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'capitalize' }}>
            🌾 {crop.name || name}
          </h1>
          <p style={{
            fontSize: '0.8rem', fontWeight: 700, color: '#22c55e',
            background: 'rgba(34,197,94,0.15)', display: 'inline-block',
            padding: '2px 12px', borderRadius: 10, marginTop: 4
          }}>
            {Math.round((crop.score || 0) * 100)}% {t('crop.match')}
          </p>
        </div>
      </div>

      {/* Quick stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div className="glass-card fade-in fade-in-delay-1" style={{ padding: 14 }}>
          <p style={{ fontSize: '0.7rem', color: '#607d6c' }}>{t('crop.plantWindow')}</p>
          <p style={{ fontWeight: 700, marginTop: 4, fontSize: '0.9rem' }}>🗓 {plantWindow}</p>
        </div>
        <div className="glass-card fade-in fade-in-delay-2" style={{ padding: 14 }}>
          <p style={{ fontSize: '0.7rem', color: '#607d6c' }}>{t('crop.harvestDays')}</p>
          <p style={{ fontWeight: 700, marginTop: 4, fontSize: '0.9rem' }}>⏱ {crop.harvestDays} days</p>
        </div>
        <div className="glass-card fade-in fade-in-delay-3" style={{ padding: 14 }}>
          <p style={{ fontSize: '0.7rem', color: '#607d6c' }}>{t('crop.waterPerDay')}</p>
          <p style={{ fontWeight: 700, marginTop: 4, fontSize: '0.9rem' }}>💧 {Math.round(crop.waterPerDay * 4047 / 10)} L</p>
        </div>
        <div className="glass-card fade-in fade-in-delay-4" style={{ padding: 14 }}>
          <p style={{ fontSize: '0.7rem', color: '#607d6c' }}>{t('crop.currentPrice')}</p>
          <p style={{ fontWeight: 700, marginTop: 4, fontSize: '0.9rem', color: '#f59e0b' }}>
            ₹{crop.currentPrice?.toLocaleString() || '—'}/q
          </p>
        </div>
      </div>

      {/* Soil & Weather Match */}
      <div className="glass-card fade-in" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.7rem', color: '#607d6c', marginBottom: 6 }}>{t('crop.soilMatch')}</p>
            <div style={{ height: 6, background: 'rgba(34,197,94,0.1)', borderRadius: 3 }}>
              <div style={{
                height: '100%', borderRadius: 3, width: `${crop.soilMatch || 50}%`,
                background: 'linear-gradient(90deg, #16a34a, #22c55e)'
              }} />
            </div>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: 4 }}>{crop.soilMatch || 50}%</p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.7rem', color: '#607d6c', marginBottom: 6 }}>{t('crop.weatherMatch')}</p>
            <div style={{ height: 6, background: 'rgba(14,165,233,0.1)', borderRadius: 3 }}>
              <div style={{
                height: '100%', borderRadius: 3, width: `${crop.weatherMatch || 50}%`,
                background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)'
              }} />
            </div>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: 4 }}>{crop.weatherMatch || 50}%</p>
          </div>
        </div>
      </div>

      {/* Price Trend Chart */}
      {priceHistory.length > 0 && (
        <div className="glass-card fade-in" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#81c784' }}>
              {t('crop.priceTrend')}
            </p>
            <span style={{ color: trendColor, fontWeight: 700, fontSize: '0.85rem' }}>
              {trendEmoji} {trend}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={priceHistory}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#607d6c' }} interval={6} />
              <YAxis tick={{ fontSize: 9, fill: '#607d6c' }} width={40} />
              <Tooltip
                contentStyle={{ background: '#111b15', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, fontSize: '0.75rem' }}
                labelStyle={{ color: '#81c784' }}
              />
              <Line type="monotone" dataKey="price" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Growing Tips */}
      {crop.tips && crop.tips.length > 0 && (
        <div className="glass-card fade-in" style={{ padding: 16 }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#81c784', marginBottom: 10 }}>
            💡 {t('crop.tips')}
          </p>
          {crop.tips.map((tip, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              padding: '8px 0',
              borderBottom: i < crop.tips.length - 1 ? '1px solid rgba(34,197,94,0.08)' : 'none'
            }}>
              <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>•</span>
              <p style={{ fontSize: '0.8rem', color: '#c8e6c9', lineHeight: 1.5 }}>{tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
