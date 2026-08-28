import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import { predictYield, analyseFarm } from '../services/api';
import SoilTierSelector from '../components/SoilTierSelector';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import GrassIcon from '@mui/icons-material/Grass';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ScienceIcon from '@mui/icons-material/Science';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StoreIcon from '@mui/icons-material/Store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarsIcon from '@mui/icons-material/Stars';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ScaleIcon from '@mui/icons-material/Scale';

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

const getCropEmoji = (cropName = '') => {
  const c = cropName.toLowerCase();
  if (c.includes('rice') || c.includes('paddy')) return '🌾';
  if (c.includes('wheat')) return '🌾';
  if (c.includes('cotton')) return '🌱';
  if (c.includes('sugarcane')) return '🎋';
  if (c.includes('maize') || c.includes('corn')) return '🌽';
  if (c.includes('groundnut') || c.includes('peanut')) return '🥜';
  if (c.includes('chili') || c.includes('chilli')) return '🌶️';
  if (c.includes('tomato')) return '🍅';
  if (c.includes('potato')) return '🥔';
  if (c.includes('onion')) return '🧅';
  if (c.includes('banana')) return '🍌';
  if (c.includes('turmeric')) return '🌿';
  if (c.includes('mustard')) return '🌼';
  if (c.includes('gram') || c.includes('pulse')) return '🌱';
  return '🌿';
};

export default function Dashboard() {
  const { farmData, setFarmData, location, sessionAnalyzed, lastAnalyzedAt } = useContext(FarmContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [reanalysing, setReanalysing] = useState(false);

  const handleApplySoilTier = async (options) => {
    if (!location) return;
    setReanalysing(true);
    try {
      const data = await analyseFarm(location.lat, location.lng, options);
      setFarmData(data);
    } catch (err) {
      console.error('Reanalysis with soil tier failed:', err);
    } finally {
      setReanalysing(false);
    }
  };

  if (!farmData) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 80 }}>
        <div className="glass-card" style={{ maxWidth: 520, margin: '0 auto', padding: '44px 28px', border: '1px solid #E5E2D8' }}>
          <div style={{ fontSize: '3.6rem', marginBottom: 16 }}>🌾</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 10, color: '#182420' }}>
            {t('dashboard.noFarmTitle', 'No Farm Plot Analyzed Yet')}
          </h2>
          <p style={{ color: '#485954', fontSize: '0.92rem', marginBottom: 28, lineHeight: 1.6 }}>
            {t('dashboard.noFarmDesc', "Select your farm plot on the interactive map or enable GPS to calculate soil compatibility, groundwater risks, and expected profit.")}
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

  const { weather, borewell, crops, location: loc, soil, soilTierInfo } = farmData;
  const isLoadedFromCache = !sessionAnalyzed;

  const riskLevel = borewell?.riskLevel || 'MODERATE';
  const riskColor = riskLevel === 'HIGH' ? '#C85A32' : riskLevel === 'MODERATE' ? '#D97706' : '#1E5E3A';
  const riskBg = riskLevel === 'HIGH' ? '#FDF3F0' : riskLevel === 'MODERATE' ? '#FFF8E7' : '#EBF5ED';
  const riskBorder = riskLevel === 'HIGH' ? '#F7D0C4' : riskLevel === 'MODERATE' ? '#FCE4B6' : '#C6E4CF';
  const riskEmoji = riskLevel === 'HIGH' ? '🔴' : riskLevel === 'MODERATE' ? '🟡' : '🟢';

  // Sort crops by score / isHighestProfit
  const sortedCrops = [...(crops || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
  const topCrop = crops?.find(c => c.isHighestProfit) || sortedCrops[0] || {};
  const remainingCrops = sortedCrops.filter(c => (c.crop || c.name) !== (topCrop.crop || topCrop.name));

  const getFitBadge = (scoreDecimal, fitTier) => {
    const tier = fitTier || (scoreDecimal >= 0.78 ? 'Strong Fit' : scoreDecimal >= 0.70 ? 'Good Fit' : scoreDecimal >= 0.65 ? 'Moderate Fit' : 'Low Confidence');
    if (tier === 'Strong Fit') return { label: 'Strong Fit', className: 'badge-fit-strong', meterClass: 'meter-fill-strong' };
    if (tier === 'Good Fit') return { label: 'Good Fit', className: 'badge-fit-good', meterClass: 'meter-fill-good' };
    if (tier === 'Moderate Fit') return { label: 'Moderate Fit', className: 'badge-fit-moderate', meterClass: 'meter-fill-moderate' };
    return { label: 'Low Confidence', className: 'badge-fit-low', meterClass: 'meter-fill-low' };
  };

  const topFit = getFitBadge(topCrop.score, topCrop.fitTier);
  const topScorePct = Math.round((topCrop.score || 0.85) * 100);
  const topSoilMatch = Math.round((topCrop.soilMatch || 0.88) * 100);
  const topWeatherMatch = Math.round((topCrop.weatherMatch || 0.82) * 100);

  return (
    <div className="page-container">
      {/* Session / Saved Plot Notification */}
      {isLoadedFromCache && (
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
                Showing Saved Plot Analysis
              </span>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#485954' }}>
                {loc?.district ? `${loc.district}, ${loc.state}` : 'Saved plot from history'} {lastAnalyzedAt ? `• Analyzed ${lastAnalyzedAt}` : ''}
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

      {/* Main Header */}
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#182420', margin: 0, letterSpacing: '-0.02em' }}>
              Farm Intelligence Dashboard
            </h1>
            <span className="badge-live">
              <span className="badge-live-dot" />
              LIVE TELEMETRY & ML
            </span>
          </div>
          <p style={{ color: '#485954', fontSize: '0.88rem', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📍</span>
            <strong>{loc?.district ? `${loc.district}, ${loc.state}` : 'Selected Farm Plot'}</strong>
            <span style={{ color: '#748782' }}>•</span>
            <span style={{ color: '#748782', fontSize: '0.82rem' }}>GPS: {loc?.lat?.toFixed(4)}, {loc?.lng?.toFixed(4)}</span>
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="btn-secondary"
          style={{ fontSize: '0.84rem' }}
        >
          <span>🗺️</span>
          <span>{t('dashboard.changeLocation', 'Select Different Plot')}</span>
        </button>
      </div>

      {/* Soil Data Tier Selector */}
      <div style={{ marginBottom: 24 }}>
        <SoilTierSelector
          currentSoil={soil}
          soilTierInfo={soilTierInfo}
          onApplyTier={handleApplySoilTier}
        />
      </div>

      {/* Quick Telemetry Overview (4 Key Pillars) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 14,
        marginBottom: 26
      }}>
        {/* Borewell / Aquifer Safety */}
        <div
          className="glass-card fade-in fade-in-delay-1"
          onClick={() => navigate('/borewell')}
          style={{
            padding: '18px 20px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            borderLeft: `4px solid ${riskColor}`
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EBF5ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WaterDropIcon sx={{ color: '#1E5E3A', fontSize: 18 }} />
              </div>
              <span style={{ fontSize: '0.8rem', color: '#485954', fontWeight: 700 }}>
                Groundwater Safety
              </span>
            </div>
            <ArrowForwardIcon sx={{ color: '#748782', fontSize: 16 }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '1.25rem' }}>{riskEmoji}</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: riskColor }}>
                {riskLevel === 'HIGH' ? 'High Risk Watch' : riskLevel === 'MODERATE' ? 'Moderate Risk' : 'Low Drilling Risk'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: '#748782' }}>Aquifer Score</span>
              <span style={{
                fontSize: '0.74rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                background: riskBg, color: riskColor, border: `1px solid ${riskBorder}`
              }}>
                {borewell?.riskScore || 0}/100
              </span>
            </div>
          </div>
        </div>

        {/* Live Weather Telemetry */}
        <div
          className="glass-card fade-in fade-in-delay-2"
          onClick={() => navigate('/weather')}
          style={{
            padding: '18px 20px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            borderLeft: '4px solid #D97706'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WbSunnyIcon sx={{ color: '#D97706', fontSize: 18 }} />
              </div>
              <span style={{ fontSize: '0.8rem', color: '#485954', fontWeight: 700 }}>
                Live Weather
              </span>
            </div>
            <ArrowForwardIcon sx={{ color: '#748782', fontSize: 16 }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: '1.5rem' }}>{weatherCodeToEmoji(weather?.current?.weatherCode)}</span>
              <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#182420' }}>
                {weather?.current?.temperature != null ? `${weather.current.temperature}°C` : '30°C'}
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#485954', margin: 0 }}>
              💧 Humidity: <strong>{weather?.current?.humidity || 65}%</strong> • 🌧️ Rain: <strong>{weather?.current?.precipitation || 0}mm</strong>
            </p>
          </div>
        </div>

        {/* APMC Mandi Price Rates */}
        <div
          className="glass-card fade-in fade-in-delay-3"
          onClick={() => navigate('/market')}
          style={{
            padding: '18px 20px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            borderLeft: '4px solid #C85A32'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FDF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <StoreIcon sx={{ color: '#C85A32', fontSize: 18 }} />
              </div>
              <span style={{ fontSize: '0.8rem', color: '#485954', fontWeight: 700 }}>
                APMC Mandi Rates
              </span>
            </div>
            <ArrowForwardIcon sx={{ color: '#748782', fontSize: 16 }} />
          </div>

          <div>
            <p style={{ fontSize: '0.72rem', color: '#748782', margin: '0 0 6px' }}>
              Modal prices in {loc?.state || 'regional'} mandis:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {(crops || []).slice(0, 2).map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#182420', textTransform: 'capitalize' }}>
                    {c.name || c.crop}
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#C85A32' }}>
                    ₹{c.currentPrice?.toLocaleString() || '2,400'}/q
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Soil Health Summary */}
        <div
          className="glass-card fade-in fade-in-delay-4"
          style={{
            padding: '18px 20px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            borderLeft: '4px solid #38761D'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F4F8EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ScienceIcon sx={{ color: '#38761D', fontSize: 18 }} />
              </div>
              <span style={{ fontSize: '0.8rem', color: '#485954', fontWeight: 700 }}>
                Soil Profile
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#748782' }}>
              {soilTierInfo?.confidenceLabel?.split(' ')?.[0] || '75%'} Conf.
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#182420', textTransform: 'capitalize' }}>
                {soil?.soilType || 'Loamy'} Soil
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#D97706' }}>
                pH {soil?.ph || 6.5}
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#485954', margin: 0 }}>
              Depth: <strong>{soil?.depth || 100}cm</strong> • NPK: <strong>{soilTierInfo?.N || 180}/{soilTierInfo?.P || 22}/{soilTierInfo?.K || 190}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HERO SECTION: #1 RECOMMENDED CROP (PRIMARY VISUAL FOCUS) */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <StarsIcon sx={{ color: '#C85A32', fontSize: 24 }} />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#182420' }}>
            Primary Agricultural Recommendation
          </h2>
        </div>

        <div className="hero-card-top-crop fade-in" style={{ padding: '24px 28px' }}>
          {/* Top Banner Tag */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                background: '#C85A32', color: '#FFFFFF',
                fontSize: '0.76rem', fontWeight: 800, padding: '4px 12px', borderRadius: 20,
                display: 'inline-flex', alignItems: 'center', gap: 5, letterSpacing: '0.03em'
              }}>
                👑 #1 RECOMMENDED CROP
              </span>
              <span className={topFit.className}>
                {topFit.label} ({topScorePct}% Suitability)
              </span>
            </div>

            <div className="badge-live">
              <span className="badge-live-dot" />
              <span>Ranked by Profit & Field Fit</span>
            </div>
          </div>

          {/* Core Hero Grid: Crop Info & Profit Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            alignItems: 'center',
            marginBottom: 20
          }}>
            {/* Left: Crop Identity */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                <div style={{
                  fontSize: '2.8rem', width: 64, height: 64, borderRadius: 16,
                  background: '#EBF5ED', border: '1px solid #C6E4CF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-subtle)'
                }}>
                  {getCropEmoji(topCrop.name || topCrop.crop)}
                </div>
                <div>
                  <h3 style={{
                    fontSize: '1.75rem', fontWeight: 800, margin: 0,
                    textTransform: 'capitalize', color: '#182420', lineHeight: 1.15
                  }}>
                    {topCrop.name || topCrop.crop || 'Rice (Paddy)'}
                  </h3>
                  <span style={{ fontSize: '0.84rem', color: '#485954', display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <CalendarMonthIcon sx={{ fontSize: 16, color: '#748782' }} />
                    Growth Cycle: <strong>{topCrop.harvestDays ? `${topCrop.harvestDays} days` : '90 - 120 days'}</strong>
                  </span>
                </div>
              </div>

              <p style={{ color: '#485954', fontSize: '0.86rem', lineHeight: 1.5, margin: '8px 0 0' }}>
                Optimal seasonal choice for your field's soil chemistry, micro-climate rainfall, and current APMC mandi market arrival rates.
              </p>
            </div>

            {/* Right: Net Revenue / Profit Highlight Box */}
            <div style={{
              background: '#FFFFFF',
              border: '2px solid #F7D0C4',
              borderRadius: 14,
              padding: '18px 22px',
              boxShadow: '0 4px 16px rgba(200, 90, 50, 0.08)'
            }}>
              <span style={{ fontSize: '0.74rem', color: '#C85A32', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
                💰 Expected Net Profit
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#1E5E3A', letterSpacing: '-0.02em' }}>
                  ₹{(topCrop.estimatedProfit || 42000).toLocaleString()}
                </span>
                <span style={{ fontSize: '0.88rem', color: '#748782', fontWeight: 600 }}>/ acre</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 10, borderTop: '1px solid #F8E2DC' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#748782', display: 'block' }}>Predicted Yield</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#182420' }}>
                    {topCrop.estimatedYieldPerAcre || '2.8'} tons/ac
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#748782', display: 'block' }}>Mandi Modal Rate</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#C85A32' }}>
                    ₹{topCrop.currentPrice?.toLocaleString() || '2,450'}/q
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Progress Bars (Soil & Climate Fit) */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E5E2D8',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 20
          }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#485954', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Visual Suitability Metrics
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
              {/* Soil Match Meter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.82rem', color: '#182420', fontWeight: 600 }}>
                    🌱 Soil Chemistry Match
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E5E3A' }}>
                    {topSoilMatch}%
                  </span>
                </div>
                <div className="suitability-meter-track">
                  <div
                    className="suitability-meter-fill meter-fill-strong"
                    style={{ width: `${topSoilMatch}%` }}
                  />
                </div>
              </div>

              {/* Climate Match Meter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.82rem', color: '#182420', fontWeight: 600 }}>
                    🌤️ Weather & Water Match
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#2E7D4E' }}>
                    {topWeatherMatch}%
                  </span>
                </div>
                <div className="suitability-meter-track">
                  <div
                    className="suitability-meter-fill meter-fill-good"
                    style={{ width: `${topWeatherMatch}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Hero Action Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => topCrop.crop && navigate(`/crop/${topCrop.crop}`)}
              className="btn-primary"
              style={{ padding: '10px 22px', fontSize: '0.88rem' }}
            >
              <span>Explore Agronomy & Fertilizer Schedule</span>
              <ArrowForwardIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RUNNER-UP CROPS COMPARISON MATRIX */}
      {/* ========================================================================= */}
      {remainingCrops.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                🌾 Alternative Crop Candidates
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#748782' }}>
                Ranked by suitability score and projected revenue
              </span>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 16
          }}>
            {remainingCrops.map((crop, index) => {
              const rank = index + 2;
              const fit = getFitBadge(crop.score, crop.fitTier);
              const scorePct = Math.round((crop.score || 0.70) * 100);
              const harvestDaysText = crop.harvestDays ? `${crop.harvestDays} days` : '90 - 120 days';

              return (
                <div
                  key={crop.crop || index}
                  className="glass-card fade-in"
                  onClick={() => crop.crop && navigate(`/crop/${crop.crop}`)}
                  style={{
                    padding: '20px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}
                >
                  <div>
                    {/* Header with Rank & Fit Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          fontSize: '1.6rem', width: 44, height: 44, borderRadius: 12,
                          background: '#F8F7F2', border: '1px solid #E5E2D8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {getCropEmoji(crop.name || crop.crop)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontSize: '0.68rem', fontWeight: 800, color: '#748782',
                              background: '#F4F3EE', padding: '1px 6px', borderRadius: 4
                            }}>
                              #{rank}
                            </span>
                            <h3 style={{ fontWeight: 800, textTransform: 'capitalize', fontSize: '1.1rem', margin: 0, color: '#182420' }}>
                              {crop.name || crop.crop}
                            </h3>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#748782' }}>⏱ {harvestDaysText}</span>
                        </div>
                      </div>

                      <span className={fit.className} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                        {fit.label}
                      </span>
                    </div>

                    {/* Compact Suitability Meter */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#485954', marginBottom: 4 }}>
                        <span>Overall Fit</span>
                        <strong style={{ color: '#1E5E3A' }}>{scorePct}%</strong>
                      </div>
                      <div className="suitability-meter-track" style={{ height: 6 }}>
                        <div
                          className={`suitability-meter-fill ${fit.meterClass}`}
                          style={{ width: `${scorePct}%` }}
                        />
                      </div>
                    </div>

                    {/* Economics Grid */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
                      background: '#F8F7F2', padding: '12px 14px', borderRadius: 10,
                      border: '1px solid #E5E2D8'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#748782', display: 'block' }}>Expected Profit</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1E5E3A' }}>
                          ₹{(crop.estimatedProfit || 35000).toLocaleString()}<span style={{ fontSize: '0.7rem', color: '#748782', fontWeight: 500 }}>/ac</span>
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#748782', display: 'block' }}>Estimated Yield</span>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#182420' }}>
                          {crop.estimatedYieldPerAcre || '2.2'} t/ac
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mandi Rate & Arrow footer */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: 14, paddingTop: 10, borderTop: '1px solid #E5E2D8'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#748782' }}>
                      Market Rate: <strong style={{ color: '#C85A32' }}>₹{crop.currentPrice?.toLocaleString() || '2,200'}/q</strong>
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#1E5E3A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      Details <ArrowForwardIcon sx={{ fontSize: 14 }} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN GRID: SOIL PROFILE & INTERACTIVE ML YIELD PREDICTOR */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 20,
        marginBottom: 28
      }}>
        {/* Soil Chemistry Profile Card */}
        <div className="glass-card fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EBF5ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ScienceIcon sx={{ color: '#1E5E3A' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                    Soil Chemistry Profile
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#748782' }}>
                    {soilTierInfo?.source || 'Regional Geospatial Soil Matrix'}
                  </span>
                </div>
              </div>

              <span className={soilTierInfo?.tier === 1 ? 'badge-live' : 'badge-estimated'}>
                {soilTierInfo?.confidenceLabel || '75% Govt DB'}
              </span>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
              background: '#F8F7F2', padding: 16, borderRadius: 12,
              border: '1px solid #E5E2D8'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#748782', display: 'block', marginBottom: 2 }}>Soil Type</span>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', textTransform: 'capitalize', color: '#1E5E3A' }}>
                  {soil?.soilType || 'Loam'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#748782', display: 'block', marginBottom: 2 }}>pH Level</span>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#D97706' }}>
                  {soil?.ph || 6.5}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#748782', display: 'block', marginBottom: 2 }}>Root Depth</span>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#182420' }}>
                  {soil?.depth || 100} cm
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#748782', display: 'block', marginBottom: 2 }}>Nitrogen (N)</span>
                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1E5E3A' }}>
                  {soilTierInfo?.N || 180} <span style={{ fontSize: '0.68rem', fontWeight: 500, color: '#748782' }}>kg/ha</span>
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#748782', display: 'block', marginBottom: 2 }}>Phosphorus (P)</span>
                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1E5E3A' }}>
                  {soilTierInfo?.P || 22} <span style={{ fontSize: '0.68rem', fontWeight: 500, color: '#748782' }}>kg/ha</span>
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#748782', display: 'block', marginBottom: 2 }}>Potassium (K)</span>
                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1E5E3A' }}>
                  {soilTierInfo?.K || 190} <span style={{ fontSize: '0.68rem', fontWeight: 500, color: '#748782' }}>kg/ha</span>
                </span>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 10,
            background: '#EBF5ED', border: '1px solid #C6E4CF',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <CheckCircleIcon sx={{ color: '#1E5E3A', fontSize: 18 }} />
            <p style={{ fontSize: '0.78rem', color: '#182420', margin: 0, lineHeight: 1.4 }}>
              To enhance yield precision, upload your lab Soil Health Card in the selector above for <strong>100% field confidence</strong>.
            </p>
          </div>
        </div>

        {/* AI Crop Yield Predictor Widget */}
        <DashboardYieldPredictor crops={crops} farmData={farmData} />
      </div>
    </div>
  );
}

function DashboardYieldPredictor({ crops, farmData }) {
  const [selectedCrop, setSelectedCrop] = useState(crops?.[0]?.crop || 'rice');
  const [area, setArea] = useState('1.0');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    if (!area || parseFloat(area) <= 0) {
      setError('Area must be a positive number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await predictYield({
        crop: selectedCrop,
        soilType: farmData?.soil?.soilType || 'loam',
        soilPh: parseFloat(farmData?.soil?.ph || 6.5),
        temperature: parseFloat(farmData?.weather?.current?.temperature || 30.0),
        rainfall: parseFloat(farmData?.weather?.rainfall7day || 50.0),
        humidity: parseFloat(farmData?.weather?.current?.humidity || 60.0),
        areaAcres: parseFloat(area),
        elevation: parseFloat(farmData?.elevation || 200.0),
        state: farmData?.location?.state || 'Tamil Nadu',
        month: new Date().getMonth() + 1
      });
      setResult(data);
    } catch (err) {
      setError('Failed to compute yield prediction.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCrop) {
      handlePredict();
    }
  }, [selectedCrop, farmData]);

  return (
    <div className="glass-card fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FDF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ScaleIcon sx={{ color: '#C85A32' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                AI Crop Yield Calculator
              </h3>
              <span style={{ fontSize: '0.74rem', color: '#748782' }}>Machine Learning Harvest Estimate</span>
            </div>
          </div>

          <span className="badge-live" style={{ background: '#FDF3F0', borderColor: '#F7D0C4', color: '#C85A32' }}>
            ML MODEL ACTIVE
          </span>
        </div>

        <form onSubmit={handlePredict} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.76rem', color: '#485954', display: 'block', marginBottom: 6, fontWeight: 700 }}>
                Select Crop
              </label>
              <select
                value={selectedCrop}
                onChange={e => setSelectedCrop(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: '#F8F7F2', border: '1px solid #E5E2D8',
                  color: '#182420', fontSize: '0.88rem', outline: 'none', fontWeight: 700
                }}
              >
                {(crops || []).map((c, idx) => (
                  <option key={idx} value={c.crop}>{c.name || c.crop}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', color: '#485954', display: 'block', marginBottom: 6, fontWeight: 700 }}>
                Farm Area (Acres)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={area}
                onChange={e => setArea(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: '#F8F7F2', border: '1px solid #E5E2D8',
                  color: '#182420', fontSize: '0.88rem', outline: 'none', fontWeight: 700
                }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-accent"
            style={{ width: '100%', padding: '11px', fontSize: '0.88rem', opacity: loading ? 0.75 : 1 }}
          >
            {loading ? 'Calculating Output...' : 'Recalculate Predicted Yield'}
          </button>
        </form>

        {error && <p style={{ color: '#C85A32', fontSize: '0.8rem', marginTop: 10 }}>⚠️ {error}</p>}
      </div>

      {!loading && result && (
        <div className="fade-in" style={{
          marginTop: 16,
          background: '#EBF5ED', border: '1px solid #C6E4CF',
          borderRadius: 12, padding: '14px 18px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#485954', fontWeight: 600 }}>Yield per Acre</span>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E5E3A', margin: '2px 0 0' }}>
              {result.predictedYieldPerAcre} <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#748782' }}>tons/ac</span>
            </p>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#485954', fontWeight: 600 }}>Total Harvest ({area} ac)</span>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#C85A32', margin: '2px 0 0' }}>
              {result.totalYield} <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#748782' }}>tons</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
