import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import { getBorewellRisk } from '../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import WaterDropIcon from '@mui/icons-material/WaterDrop';

export default function Borewell() {
  const { farmData, location, sessionAnalyzed, lastAnalyzedAt } = useContext(FarmContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBorewellRisk = () => {
    if (!location) return;
    setLoading(true);
    setError('');
    getBorewellRisk(location.lat, location.lng)
      .then(data => {
        setRiskData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to fetch groundwater risk analysis. Please verify that backend services are active.');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (farmData?.borewell) {
      setRiskData(farmData.borewell);
      setLoading(false);
    } else if (location) {
      fetchBorewellRisk();
    } else {
      setLoading(false);
    }
  }, [farmData, location]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: 40, width: '40%', marginBottom: 20 }} />
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', marginBottom: 20 }}>
          <div className="skeleton" style={{ width: 140, height: 140, borderRadius: '50%', margin: '0 auto 20px' }} />
          <div className="skeleton" style={{ height: 24, width: '30%', margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div className="glass-card" style={{ maxWidth: 500, margin: '0 auto', padding: 40 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>⚠️</div>
          <p style={{ color: '#ef4444', fontSize: '1rem', fontWeight: 600, marginBottom: 20, lineHeight: 1.5 }}>
            {error}
          </p>
          <button onClick={location ? fetchBorewellRisk : () => navigate('/')} className="btn-accent">
            {location ? 'Retry Analysis' : 'Go to Map'}
          </button>
        </div>
      </div>
    );
  }

  if (!riskData) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div className="glass-card" style={{ maxWidth: 500, margin: '0 auto', padding: 40 }}>
          <WaterDropIcon sx={{ fontSize: 50, color: '#0284c7', marginBottom: 2 }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>{t('borewell.title', 'Groundwater Risk Assessment')}</h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: 24 }}>
            Please select your farm location on the map to calculate hydrogeological borewell failure risk.
          </p>
          <button onClick={() => navigate('/')} className="btn-accent pulse-glow" style={{ width: '100%' }}>
            📍 {t('home.title', 'Select Farm on Map')}
          </button>
        </div>
      </div>
    );
  }

  const { riskScore = 55, riskLevel = 'MODERATE', breakdown = {}, recommendation, explanation, estimatedCost } = riskData;
  const riskColors = { HIGH: '#C85A32', MODERATE: '#D97706', LOW: '#2E6F40' };
  const riskBg = { HIGH: '#FDF3F0', MODERATE: '#FFF8E7', LOW: '#EBF4ED' };
  const color = riskColors[riskLevel] || '#D97706';
  const humanRiskLabel = riskLevel === 'HIGH' ? 'Requires Attention' : riskLevel === 'MODERATE' ? 'Moderate Watch' : 'Good Condition';

  const breakdownItems = [
    { key: 'soilDepth', icon: '🧱', label: 'Soil Depth' },
    { key: 'elevation', icon: '⛰️', label: 'Elevation Profile' },
    { key: 'rainfall', icon: '🌧️', label: 'Annual Rainfall' },
    { key: 'waterDistance', icon: '🏞️', label: 'Distance to Water Body' }
  ];

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
                Groundwater Risk for Selected Plot
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
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ color: '#2E6F40', background: '#EBF4ED' }}>
          <ArrowBackIcon />
        </IconButton>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#1C2826' }}>
            💧 Groundwater & Aquifer Analytics
          </h1>
          <p style={{ color: '#788A85', fontSize: '0.85rem', marginTop: 2 }}>
            Hydro-geological assessment based on terrain elevation, soil depth, & seasonal rainfall
          </p>
        </div>
      </div>

      {/* Hero Section: Gauge & Score */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20, marginBottom: 24
      }}>
        {/* Risk Badge Dial Card */}
        <div className="glass-card fade-in" style={{
          padding: 32, textAlign: 'center',
          background: riskBg[riskLevel], borderColor: '#E6E4DC',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            width: 130, height: 130, borderRadius: '50%', margin: '0 auto 16px',
            border: `4px solid ${color}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: '#FFFFFF'
          }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{riskScore}</span>
            <span style={{ fontSize: '0.68rem', color: '#788A85', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Score</span>
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color, marginBottom: 4 }}>
            {humanRiskLabel}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#4A5D58' }}>
            Borewell Drilling Failure Risk Index: <strong>{riskScore}/100</strong>
          </p>
        </div>

        {/* Financial & Hydro Recommendation Card */}
        <div className="glass-card fade-in fade-in-delay-1" style={{ padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2E6F40', marginBottom: 12 }}>
              💡 Agronomist Recommendation
            </h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#1C2826', margin: 0 }}>
              {recommendation || 'Borewell drilling may succeed, but consider conducting a hydro-geological survey before heavy investment.'}
            </p>
          </div>

          {estimatedCost && (
            <div style={{
              marginTop: 20, padding: '14px 18px', borderRadius: 10,
              background: '#FFF8E7', border: '1px solid #FCE4B6'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#788A85', display: 'block', marginBottom: 2 }}>Estimated Dry-Bore Loss Exposure</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#D97706' }}>
                💰 Estimated Cost of Dry Bore: {estimatedCost}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="glass-card fade-in fade-in-delay-2" style={{ padding: 28, marginBottom: 24 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, color: '#1C2826' }}>
          📊 Geological Risk Factors Breakdown
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {breakdownItems.map(item => {
            const val = breakdown[item.key];
            const score = val?.score ?? val ?? 50;
            const value = val?.value || '';
            const barColor = score > 65 ? '#C85A32' : score > 35 ? '#D97706' : '#2E6F40';
            return (
              <div key={item.key} style={{ background: '#FAF9F5', padding: 16, borderRadius: 10, border: '1px solid #E6E4DC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1C2826' }}>{item.icon} {val?.label || item.label}</span>
                  <span style={{ fontSize: '0.8rem', color: '#788A85', fontWeight: 700 }}>{value} ({score}/100)</span>
                </div>
                <div style={{ height: 8, background: '#E6E4DC', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, width: `${score}%`,
                    background: barColor, transition: 'width 1s ease'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
