import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import { getBorewellRisk } from '../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import TerrainIcon from '@mui/icons-material/Terrain';
import LayersIcon from '@mui/icons-material/Layers';
import OpacityIcon from '@mui/icons-material/Opacity';
import WavesIcon from '@mui/icons-material/Waves';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';

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
        setError('Failed to fetch groundwater risk analysis. Please verify backend service connectivity.');
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
        <div className="skeleton" style={{ height: 48, width: '45%', marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
          <div className="skeleton" style={{ height: 240 }} />
          <div className="skeleton" style={{ height: 240 }} />
        </div>
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div className="glass-card" style={{ maxWidth: 500, margin: '0 auto', padding: 40 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>⚠️</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#182420', marginBottom: 8 }}>Analysis Unavailable</h3>
          <p style={{ color: '#C85A32', fontSize: '0.9rem', fontWeight: 600, marginBottom: 20, lineHeight: 1.5 }}>
            {error}
          </p>
          <button onClick={location ? fetchBorewellRisk : () => navigate('/')} className="btn-accent">
            {location ? 'Retry Risk Assessment' : 'Select Farm on Map'}
          </button>
        </div>
      </div>
    );
  }

  if (!riskData) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 80 }}>
        <div className="glass-card" style={{ maxWidth: 520, margin: '0 auto', padding: '44px 28px', border: '1px solid #E5E2D8' }}>
          <div style={{ fontSize: '3.6rem', marginBottom: 16 }}>💧</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 10, color: '#182420' }}>
            {t('borewell.title', 'Groundwater Risk Assessment')}
          </h2>
          <p style={{ color: '#485954', fontSize: '0.92rem', marginBottom: 28, lineHeight: 1.6 }}>
            Select your farm plot on the map to evaluate hydrogeological aquifer depth, clay layer resistance, and drilling failure probability.
          </p>
          <button onClick={() => navigate('/')} className="btn-accent" style={{ width: '100%', padding: '12px 24px', fontSize: '0.95rem' }}>
            📍 {t('home.title', 'Select Farm on Map')}
          </button>
        </div>
      </div>
    );
  }

  const { riskScore = 55, riskLevel = 'MODERATE', breakdown = {}, recommendation, estimatedCost } = riskData;
  const isHigh = riskLevel === 'HIGH';
  const isMod = riskLevel === 'MODERATE';
  const color = isHigh ? '#C85A32' : isMod ? '#D97706' : '#1E5E3A';
  const bgSoft = isHigh ? '#FDF3F0' : isMod ? '#FFF8E7' : '#EBF5ED';
  const borderSoft = isHigh ? '#F7D0C4' : isMod ? '#FCE4B6' : '#C6E4CF';
  const riskTitle = isHigh ? 'High Drilling Risk' : isMod ? 'Moderate Drilling Watch' : 'Low Drilling Risk (Favorable)';
  const locDistrict = farmData?.location?.district || 'Selected Plot';
  const locState = farmData?.location?.state || '';

  const breakdownItems = [
    { key: 'soilDepth', icon: <LayersIcon sx={{ fontSize: 20, color: '#1E5E3A' }} />, label: 'Soil Clay Depth' },
    { key: 'elevation', icon: <TerrainIcon sx={{ fontSize: 20, color: '#D97706' }} />, label: 'Elevation Profile' },
    { key: 'rainfall', icon: <OpacityIcon sx={{ fontSize: 20, color: '#0284c7' }} />, label: 'Annual Rainfall' },
    { key: 'waterDistance', icon: <WavesIcon sx={{ fontSize: 20, color: '#C85A32' }} />, label: 'Proximity to Water Bodies' }
  ];

  return (
    <div className="page-container">
      {/* Session Plot Notification */}
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
                Groundwater Assessment for Saved Plot
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
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            color: '#1E5E3A', background: '#FFFFFF', border: '1px solid #E5E2D8',
            '&:hover': { background: '#F8F7F2' }
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: '#182420', letterSpacing: '-0.02em' }}>
              Groundwater & Borewell Risk
            </h1>
            <span className="badge-live">
              <span className="badge-live-dot" />
              LIVE GEOSPATIAL ANALYSIS
            </span>
          </div>
          <p style={{ color: '#485954', fontSize: '0.88rem', margin: '2px 0 0' }}>
            Hydro-geological failure risk calculated for {locDistrict}{locState ? `, ${locState}` : ''}
          </p>
        </div>
      </div>

      {/* Hero Section: Risk Dial & Agronomist Recommendation */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20, marginBottom: 24
      }}>
        {/* Risk Dial Card */}
        <div className="hero-card-top-crop fade-in" style={{
          padding: '30px 24px', textAlign: 'center',
          background: bgSoft, borderColor: borderSoft,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          {/* Radial Ring Gauge */}
          <div style={{
            width: 140, height: 140, borderRadius: '50%', margin: '0 auto 16px',
            border: `6px solid ${color}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(24, 36, 32, 0.08)'
          }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color, lineHeight: 1 }}>
              {riskScore}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#748782', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginTop: 2 }}>
              / 100 Risk
            </span>
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color, margin: '0 0 6px' }}>
            {riskTitle}
          </h2>

          <p style={{ fontSize: '0.86rem', color: '#485954', margin: 0, maxWidth: 280 }}>
            {isHigh
              ? 'High probability of dry-bore drilling. Artificial recharge or survey advised.'
              : isMod
                ? 'Moderate groundwater table. Drilling requires localized geo-resistivity test.'
                : 'Favorable geological conditions for sustainable aquifer yield.'}
          </p>
        </div>

        {/* Financial & Hydro Recommendation Card */}
        <div className="glass-card fade-in fade-in-delay-1" style={{
          padding: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <LightbulbOutlinedIcon sx={{ color: '#1E5E3A', fontSize: 22 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#182420', margin: 0 }}>
                Agronomist Hydrogeology Advice
              </h3>
            </div>

            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#182420', margin: '0 0 16px' }}>
              {recommendation || 'Borewell drilling in this geological zone may yield seasonal water. Ensure you conduct a 2D resistivity survey before commissioning heavy drilling rigs.'}
            </p>
          </div>

          {estimatedCost && (
            <div style={{
              padding: '14px 18px', borderRadius: 12,
              background: '#FFF8E7', border: '1px solid #FCE4B6',
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <WarningAmberIcon sx={{ color: '#D97706', fontSize: 24, flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '0.72rem', color: '#748782', display: 'block', fontWeight: 600 }}>
                  Potential Dry-Bore Financial Loss Exposure
                </span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#B45309' }}>
                  {estimatedCost}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Geological Factor Breakdown Grid */}
      <div className="glass-card fade-in fade-in-delay-2" style={{ padding: 26, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#182420' }}>
            📊 Hydrogeological Factor Analysis
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#748782' }}>
            Weighted factors contributing to failure risk
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {breakdownItems.map(item => {
            const val = breakdown[item.key];
            const score = val?.score ?? val ?? 50;
            const value = val?.value || '';
            const isHighFactor = score > 65;
            const isModFactor = score > 35;
            const barColor = isHighFactor ? '#C85A32' : isModFactor ? '#D97706' : '#1E5E3A';
            const meterClass = isHighFactor ? 'meter-fill-low' : isModFactor ? 'meter-fill-moderate' : 'meter-fill-strong';

            return (
              <div key={item.key} style={{
                background: '#F8F7F2', padding: '16px 18px', borderRadius: 12,
                border: '1px solid #E5E2D8'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: '#FFFFFF',
                      border: '1px solid #E5E2D8', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {item.icon}
                    </div>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#182420' }}>
                      {val?.label || item.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: barColor, fontWeight: 800 }}>
                    {score}/100
                  </span>
                </div>

                <div className="suitability-meter-track" style={{ height: 7, marginBottom: 8 }}>
                  <div
                    className={`suitability-meter-fill ${meterClass}`}
                    style={{ width: `${score}%` }}
                  />
                </div>

                <span style={{ fontSize: '0.74rem', color: '#485954', fontWeight: 600 }}>
                  Telemetry Metric: <strong>{value || `${score}% index`}</strong>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Artificial Aquifer Recharge Guidance */}
      <div className="glass-card fade-in" style={{ padding: 26, background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <CheckCircleOutlineIcon sx={{ color: '#1E5E3A', fontSize: 22 }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#182420' }}>
            Aquifer Recharge & Groundwater Sustainability Techniques
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div style={{ padding: '16px', borderRadius: 10, background: '#F8F7F2', border: '1px solid #E5E2D8' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E5E3A', display: 'block', marginBottom: 4 }}>
              🌧️ Farm Pond & Bund Catchment
            </span>
            <p style={{ fontSize: '0.78rem', color: '#485954', margin: 0, lineHeight: 1.5 }}>
              Excavate a 10x10m farm pond in the lowest slope corner to harvest monsoon runoff and recharge unconfined shallow aquifers.
            </p>
          </div>

          <div style={{ padding: '16px', borderRadius: 10, background: '#F8F7F2', border: '1px solid #E5E2D8' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#D97706', display: 'block', marginBottom: 4 }}>
              ⚙️ Direct Casing Recharge Filter
            </span>
            <p style={{ fontSize: '0.78rem', color: '#485954', margin: 0, lineHeight: 1.5 }}>
              Fit dry or low-yield borewells with a coarse sand-gravel filter pit around the casing to channel rooftop or silt-free canal runoff.
            </p>
          </div>

          <div style={{ padding: '16px', borderRadius: 10, background: '#F8F7F2', border: '1px solid #E5E2D8' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#C85A32', display: 'block', marginBottom: 4 }}>
              🌾 Low-Water Crop Transition
            </span>
            <p style={{ fontSize: '0.78rem', color: '#485954', margin: 0, lineHeight: 1.5 }}>
              If groundwater risk is High (&gt;65), consider shifting 40% of acreage from flood-irrigated paddy to drip-fed pulses, millets, or groundnut.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
