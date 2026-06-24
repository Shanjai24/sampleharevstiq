import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import { getBorewellRisk } from '../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';

export default function Borewell() {
  const { farmData, location } = useContext(FarmContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (farmData?.borewell) {
      setRiskData(farmData.borewell);
      setLoading(false);
    } else if (location) {
      getBorewellRisk(location.lat, location.lng)
        .then(data => { setRiskData(data); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [farmData, location]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', paddingTop: 100 }}>
        <div className="skeleton" style={{ width: 200, height: 200, margin: '0 auto', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!riskData) {
    return (
      <div style={{ padding: 24, textAlign: 'center', paddingTop: 100 }}>
        <p style={{ color: '#81c784' }}>Please analyse your farm first</p>
        <button onClick={() => navigate('/')} style={{
          marginTop: 16, background: '#16a34a', color: '#fff', border: 'none',
          padding: '10px 24px', borderRadius: 20, cursor: 'pointer'
        }}>Go to Map</button>
      </div>
    );
  }

  const { riskScore = 50, riskLevel = 'MODERATE', breakdown = {}, recommendation, explanation, estimatedCost } = riskData;
  const riskColors = { HIGH: '#ef4444', MODERATE: '#f59e0b', LOW: '#22c55e' };
  const riskBg = { HIGH: 'rgba(239,68,68,0.1)', MODERATE: 'rgba(245,158,11,0.1)', LOW: 'rgba(34,197,94,0.1)' };
  const color = riskColors[riskLevel] || '#f59e0b';

  const breakdownItems = [
    { key: 'soilDepth', icon: '🧱', label: 'Soil Depth' },
    { key: 'elevation', icon: '⛰️', label: 'Elevation' },
    { key: 'rainfall', icon: '🌧️', label: 'Rainfall' },
    { key: 'waterDistance', icon: '🏞️', label: 'Water Distance' }
  ];

  return (
    <div style={{ padding: '16px 16px 80px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ color: '#81c784' }}>
          <ArrowBackIcon />
        </IconButton>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{t('borewell.title')}</h1>
      </div>

      {/* Risk Badge */}
      <div className="glass-card fade-in" style={{
        padding: 28, textAlign: 'center', marginBottom: 16,
        background: riskBg[riskLevel], borderColor: `${color}30`
      }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%', margin: '0 auto 16px',
          border: `4px solid ${color}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 30px ${color}30`
        }}>
          <span style={{ fontSize: '2rem' }}>
            {riskLevel === 'HIGH' ? '🔴' : riskLevel === 'MODERATE' ? '🟡' : '🟢'}
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{riskScore}</span>
        </div>
        <p style={{ fontSize: '1.2rem', fontWeight: 800, color }}>{t(`borewell.${riskLevel}`)}</p>
        <p style={{ fontSize: '0.8rem', color: '#607d6c', marginTop: 4 }}>
          {t('borewell.riskScore')}: {riskScore}/100
        </p>
      </div>

      {/* Breakdown */}
      <div className="glass-card fade-in fade-in-delay-1" style={{ padding: 18, marginBottom: 12 }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 14, color: '#81c784' }}>
          📊 {t('borewell.breakdown')}
        </p>
        {breakdownItems.map(item => {
          const val = breakdown[item.key];
          const score = val?.score ?? val ?? 50;
          const value = val?.value || '';
          const barColor = score > 65 ? '#ef4444' : score > 35 ? '#f59e0b' : '#22c55e';
          return (
            <div key={item.key} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.8rem' }}>{item.icon} {val?.label || item.label}</span>
                <span style={{ fontSize: '0.75rem', color: '#607d6c' }}>{value} ({score})</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                <div style={{
                  height: '100%', borderRadius: 3, width: `${score}%`,
                  background: barColor, transition: 'width 1s ease'
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendation */}
      <div className="glass-card fade-in fade-in-delay-2" style={{ padding: 18, marginBottom: 12 }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, color: '#81c784' }}>
          💡 {t('borewell.recommendation')}
        </p>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#c8e6c9' }}>
          {recommendation || 'Complete analysis to see recommendations.'}
        </p>
        {estimatedCost && (
          <p style={{
            fontSize: '0.8rem', color: '#f59e0b', marginTop: 10,
            background: 'rgba(245,158,11,0.1)', padding: '8px 12px', borderRadius: 8
          }}>
            💰 {t('borewell.estimatedCost')}: {estimatedCost}
          </p>
        )}
      </div>

      {/* Explanation */}
      {explanation && (
        <div className="glass-card fade-in fade-in-delay-3" style={{ padding: 18 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, color: '#81c784' }}>
            ❓ {t('borewell.whyRisky')}
          </p>
          <p style={{ fontSize: '0.8rem', lineHeight: 1.6, color: '#a5d6a7' }}>{explanation}</p>
        </div>
      )}
    </div>
  );
}
