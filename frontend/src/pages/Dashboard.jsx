import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { FarmContext } from '../context/FarmContext';
import { predictYield, analyseFarm } from '../services/api';
import { speakText, stopSpeaking } from '../services/voice';
import SoilTierSelector from '../components/SoilTierSelector';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ScienceIcon from '@mui/icons-material/Science';
import StoreIcon from '@mui/icons-material/Store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarsIcon from '@mui/icons-material/Stars';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ScaleIcon from '@mui/icons-material/Scale';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import LandscapeIcon from '@mui/icons-material/Landscape';
import TableChartIcon from '@mui/icons-material/TableChart';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  const { farmData, setFarmData, location, sessionAnalyzed, lastAnalyzedAt, areaAcres, setAreaAcres } = useContext(FarmContext);
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  // eslint-disable-next-line no-unused-vars
  const [reanalysing, setReanalysing] = useState(false);
  const [gwExpanded, setGwExpanded] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [outbreaks, setOutbreaks] = useState([]);
  const [rotationPlan, setRotationPlan] = useState(null);
  const [sortBy, setSortBy] = useState('profit'); // 'profit' | 'fit'
  const [showTableView, setShowTableView] = useState(true);

  useEffect(() => {
    if (farmData?.location?.lat && farmData?.location?.lng) {
      // 1. Fetch Outbreak Radar alerts
      axios.get(`${API_BASE}/api/alerts/outbreaks`, {
        params: { lat: farmData.location.lat, lng: farmData.location.lng, radiusKm: 15 }
      }).then(r => setOutbreaks(r.data.activeOutbreaks || [])).catch(() => {});

      // 2. Fetch Multi-Season Crop Rotation Plan
      const topCropName = farmData.crops?.[0]?.crop || 'rice';
      const state = farmData.location.state || 'Tamil Nadu';
      const soilType = farmData.soil?.soilType || 'loam';
      axios.get(`${API_BASE}/api/crops/rotation`, {
        params: { state, soilType, currentCrop: topCropName }
      }).then(r => setRotationPlan(r.data)).catch(() => {});
    }
  }, [farmData]);

  const handleReportBorewellOutcome = async () => {
    const depthStr = prompt("Enter actual drilled depth in feet (e.g. 350):", "300");
    if (!depthStr) return;
    const depth = parseFloat(depthStr);
    const success = confirm("Did borewell drilling succeed in striking water?\n\nOK = Yes (Success)\nCancel = No (Dry bore)");
    const costStr = prompt("Enter total drilling cost in INR (optional):", "65000");
    
    try {
      await axios.post(`${API_BASE}/api/borewell/feedback`, {
        lat: farmData?.location?.lat,
        lng: farmData?.location?.lng,
        district: farmData?.location?.district,
        state: farmData?.location?.state,
        actualDepthFt: depth,
        succeeded: success,
        actualCost: parseFloat(costStr) || 0
      });
      alert("✅ Drilling outcome reported successfully! Ground truth has been logged into the learning pipeline.");
    } catch {
      alert("⚠️ Failed to record outcome.");
    }
  };

  const handleSpeak = (id, text) => {
    if (speakingId === id) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    stopSpeaking();
    setSpeakingId(id);
    speakText(text, i18n.language || 'en', { onEnd: () => setSpeakingId(null), onError: () => setSpeakingId(null) });
  };

  const handleApplySoilTier = async (options) => {
    if (!location) return;
    setReanalysing(true);
    try {
      const data = await analyseFarm(location.lat, location.lng, { ...options, areaAcres: areaAcres || 1.0 });
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
        <div className="card-standard" style={{ maxWidth: 520, margin: '0 auto', padding: '44px 28px' }}>
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
  const currentArea = farmData?.areaAcres || areaAcres || 1.0;

  const riskLevel = borewell?.riskLevel || 'MODERATE';
  const riskColor = riskLevel === 'HIGH' ? '#C85A32' : riskLevel === 'MODERATE' ? '#D97706' : '#1E5E3A';
  const riskBg = riskLevel === 'HIGH' ? '#FDF3F0' : riskLevel === 'MODERATE' ? '#FFF8E7' : '#EBF5ED';
  const riskBorder = riskLevel === 'HIGH' ? '#F7D0C4' : riskLevel === 'MODERATE' ? '#FCE4B6' : '#C6E4CF';
  const riskEmoji = riskLevel === 'HIGH' ? '🔴' : riskLevel === 'MODERATE' ? '🟡' : '🟢';
  const gwBadgeLabel = riskLevel === 'HIGH' ? 'Risk' : riskLevel === 'MODERATE' ? 'Moderate' : 'Good';
  const gwStatusText = riskLevel === 'HIGH'
    ? `High drilling risk. Aquifer score ${borewell?.riskScore || 70}/100. Consider drip irrigation.`
    : riskLevel === 'MODERATE'
      ? `Moderate aquifer safety. Score ${borewell?.riskScore || 50}/100. Hydro-geological survey recommended.`
      : `Good groundwater conditions. Low drilling risk. Score ${borewell?.riskScore || 25}/100.`;
  const weatherSource = farmData?.weather?.source || farmData?.dataSources?.weather || 'live';

  const rawCrops = crops || [];
  const topCrop = rawCrops.find(c => c.isHighestProfit) || rawCrops[0] || {};
  const remainingCrops = rawCrops.filter(c => (c.crop || c.name) !== (topCrop.crop || topCrop.name));

  // Dynamic sorting for alternative candidates
  const sortedAlternatives = [...remainingCrops].sort((a, b) => {
    if (sortBy === 'profit') {
      return (b.totalEstimatedProfit || b.estimatedProfit || 0) - (a.totalEstimatedProfit || a.estimatedProfit || 0);
    }
    return (b.score || 0) - (a.score || 0);
  });

  const getFitBadge = (scoreDecimal, fitTier) => {
    const tier = fitTier || (scoreDecimal >= 0.78 ? 'Strong Fit' : scoreDecimal >= 0.70 ? 'Good Fit' : scoreDecimal >= 0.65 ? 'Moderate Fit' : 'Low Confidence');
    if (tier === 'Strong Fit') return { label: 'Strong Fit', className: 'badge-fit-strong', meterClass: 'meter-fill-strong' };
    if (tier === 'Good Fit') return { label: 'Good Fit', className: 'badge-fit-good', meterClass: 'meter-fill-good' };
    if (tier === 'Moderate Fit') return { label: 'Moderate Fit', className: 'badge-fit-moderate', meterClass: 'meter-fill-moderate' };
    return { label: 'Low Confidence', className: 'badge-fit-low', meterClass: 'meter-fill-low' };
  };

  const normalizePct = (val, defaultVal = 80) => {
    if (val == null) return defaultVal;
    const num = typeof val === 'number' ? val : parseFloat(val) || defaultVal;
    return num <= 1 ? Math.round(num * 100) : Math.min(100, Math.round(num));
  };

  const topFit = getFitBadge(topCrop.score, topCrop.fitTier);
  const topScorePct = normalizePct(topCrop.score, 88);
  const topSoilMatch = normalizePct(topCrop.soilMatch, 90);
  const topWeatherMatch = normalizePct(topCrop.weatherMatch, 85);

  return (
    <div className="page-container">
      {/* Session Notification Banner */}
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
                {loc?.district ? `${loc.district}, ${loc.state}` : 'Saved plot from history'} {lastAnalyzedAt ? `• Analyzed ${lastAnalyzedAt}` : ''} ({currentArea} Acres)
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
          <p style={{ color: '#485954', fontSize: '0.88rem', margin: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span>📍</span>
            <strong>{loc?.district ? `${loc.district}, ${loc.state}` : 'Selected Farm Plot'}</strong>
            <span style={{ color: '#748782' }}>•</span>
            <span style={{ color: '#748782', fontSize: '0.82rem' }}>Plot Size: <strong>{currentArea} Acres</strong></span>
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

      {/* Biosecurity Outbreak Radar Alert Card */}
      {outbreaks.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {outbreaks.map(o => (
            <div
              key={o.id}
              className="fade-in"
              style={{
                background: '#FDF3F0', border: '1.5px solid #F7D0C4', borderRadius: 12,
                padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 12, marginBottom: 10, boxShadow: 'var(--shadow-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>🚨</span>
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#C85A32', display: 'block' }}>
                    BIOSECURITY RADAR — {o.disease?.toUpperCase()} DETECTED WITHIN 15 KM
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#182420', lineHeight: 1.45 }}>
                    {o.message}
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate('/chat')}
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.78rem', background: '#C85A32' }}
              >
                Inspect Symptoms & Get Remedy
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Soil Data Tier Selector */}
      <div style={{ marginBottom: 24 }}>
        <SoilTierSelector
          currentSoil={soil}
          soilTierInfo={soilTierInfo}
          onApplyTier={handleApplySoilTier}
        />
      </div>

      {/* De-duplicated Farm Readiness Vitals (4 Distinct Pillars) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 14,
        marginBottom: 26
      }}>
        {/* 1. Groundwater Safety */}
        <div
          className="card-standard fade-in fade-in-delay-1"
          style={{
            padding: '18px 20px',
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
            <span style={{
              fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: 12,
              background: riskBg, color: riskColor, border: `1px solid ${riskBorder}`
            }}>
              {riskEmoji} {gwBadgeLabel}
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: riskColor }}>
                {riskLevel === 'HIGH' ? 'High Drilling Risk' : riskLevel === 'MODERATE' ? 'Moderate Aquifer' : 'Good Aquifer'}
              </span>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#748782' }}>{borewell?.riskScore || 0}/100</span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#485954', margin: '0 0 8px', lineHeight: 1.45 }}>
              {riskLevel === 'HIGH' ? '⚠️ High risk of dry bore. Micro-drip irrigation advised.' : riskLevel === 'MODERATE' ? '🔍 Hydro-geological survey advised before drilling.' : '✅ Favourable conditions for borewell drilling.'}
            </p>

            <button
              onClick={() => setGwExpanded(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.74rem', color: '#1E5E3A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {gwExpanded ? '▲ Hide Details' : '▾ View Factor Breakdown'}
            </button>

            {gwExpanded && (
              <div className="fade-in" style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.entries(borewell?.breakdown || {}).map(([key, val]) => (
                  <div key={key} className="card-well" style={{ padding: '8px 10px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#748782', display: 'block' }}>{val.label || key}</span>
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#182420' }}>{val.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => handleSpeak('gw', gwStatusText)}
                title="Listen to groundwater advisory"
                style={{
                  background: 'none', border: `1px solid ${riskBorder}`,
                  borderRadius: 8, cursor: 'pointer', padding: '4px 10px',
                  fontSize: '0.72rem', color: riskColor, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <VolumeUpIcon sx={{ fontSize: 14 }} />
                {speakingId === 'gw' ? 'Stop' : '🔊 Listen'}
              </button>

              <button
                onClick={handleReportBorewellOutcome}
                title="Report ground truth borewell drilling result"
                style={{
                  background: '#F8F7F2', border: '1px solid #E5E2D8',
                  borderRadius: 8, cursor: 'pointer', padding: '4px 10px',
                  fontSize: '0.72rem', color: '#182420', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <span>📝 Report Outcome</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Micro-Climate & Rain Telemetry */}
        <div
          className="card-standard fade-in fade-in-delay-2"
          onClick={() => navigate('/weather')}
          style={{
            padding: '18px 20px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 12,
            borderLeft: '4px solid #0284C7'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WbSunnyIcon sx={{ color: '#0284C7', fontSize: 18 }} />
              </div>
              <span style={{ fontSize: '0.8rem', color: '#485954', fontWeight: 700 }}>
                Micro-Climate
              </span>
            </div>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ fontSize:'0.65rem', fontWeight:700, padding:'2px 7px', borderRadius:8, background: weatherSource==='live'?'#EBF5ED':'#F8F7F2', color: weatherSource==='live'?'#1E5E3A':'#748782', border: weatherSource==='live'?'1px solid #C6E4CF':'1px solid #E5E2D8' }}>
                {weatherSource==='live'? '📡 Live':'📋 Est.'}
              </span>
              <ArrowForwardIcon sx={{ color: '#748782', fontSize: 16 }} />
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: '1.5rem' }}>{weatherCodeToEmoji(weather?.current?.weatherCode)}</span>
              <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#182420' }}>
                {weather?.current?.temperature != null ? `${weather.current.temperature}°C` : '30°C'}
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#485954', margin: 0 }}>
              💧 Humidity: <strong>{weather?.current?.humidity || 65}%</strong> • 🌧️ 7-Day Rain: <strong>{weather?.rainfall7day || 0}mm</strong>
            </p>
          </div>
        </div>

        {/* 3. APMC Mandi Price Rates */}
        <div
          className="card-standard fade-in fade-in-delay-3"
          onClick={() => navigate('/market')}
          style={{
            padding: '18px 20px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 12,
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
              Modal rates in {loc?.state || 'regional'} mandis:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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

        {/* 4. Plot Readiness & Data Trust (Non-redundant) */}
        <div
          className="card-standard fade-in fade-in-delay-4"
          style={{
            padding: '18px 20px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            borderLeft: '4px solid #1E5E3A'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EBF5ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LandscapeIcon sx={{ color: '#1E5E3A', fontSize: 18 }} />
              </div>
              <span style={{ fontSize: '0.8rem', color: '#485954', fontWeight: 700 }}>
                Plot Readiness
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#1E5E3A', fontWeight: 700 }}>
              {topScorePct}% Fit Index
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#182420' }}>
                {currentArea} Acre Plot
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#748782' }}>
                {farmData?.elevation || 200}m ASL
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#485954', margin: 0 }}>
              Data Tier: <strong>{soilTierInfo?.confidenceLabel || '75% Regional Govt DB'}</strong> • Soil: <strong style={{ textTransform: 'capitalize' }}>{soil?.soilType || 'Loam'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HERO SECTION: #1 RECOMMENDED CROP (DOMINANT VISUAL ANCHOR) */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarsIcon sx={{ color: '#C85A32', fontSize: 24 }} />
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#182420' }}>
              Primary Agricultural Recommendation
            </h2>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#748782', fontWeight: 600 }}>
            Calculated for {currentArea} Acre Field
          </span>
        </div>

        <div className="card-hero fade-in" style={{ padding: '26px 30px' }}>
          {/* Top Banner Tag */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                background: '#C85A32', color: '#FFFFFF',
                fontSize: '0.76rem', fontWeight: 800, padding: '4px 14px', borderRadius: 20,
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
              <span>Highest Net Farmer Profit</span>
            </div>
          </div>

          {/* Core Hero Grid: Identity & Financial Callout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 26,
            alignItems: 'center',
            marginBottom: 22
          }}>
            {/* Left: Crop Identity */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                <div style={{
                  fontSize: '3rem', width: 70, height: 70, borderRadius: 18,
                  background: '#EBF5ED', border: '1.5px solid #C6E4CF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-subtle)'
                }}>
                  {getCropEmoji(topCrop.name || topCrop.crop)}
                </div>
                <div>
                  <h3 style={{
                    fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                    fontSize: '2rem', fontWeight: 800, margin: 0,
                    textTransform: 'capitalize', color: '#182420', lineHeight: 1.15
                  }}>
                    {topCrop.name || topCrop.crop || 'Rice (Paddy)'}
                  </h3>
                  <span style={{ fontSize: '0.86rem', color: '#485954', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <CalendarMonthIcon sx={{ fontSize: 17, color: '#748782' }} />
                    Growth Cycle: <strong>{topCrop.harvestDays || 120} days</strong>
                    <span style={{ color: '#C85A32', fontWeight: 700 }}>•</span>
                    Water Req: <strong>{topCrop.waterPerDay ? `${Math.round(topCrop.waterPerDay * 4047).toLocaleString()} L/ac/day` : '24,000 L/ac/day'}</strong>
                  </span>
                </div>
              </div>

              <p style={{ color: '#485954', fontSize: '0.88rem', lineHeight: 1.55, margin: '10px 0 0' }}>
                Scientifically optimized for your field's soil chemistry, regional micro-climate rainfall, and real-time APMC Mandi wholesale pricing.
              </p>
            </div>

            {/* Right: Net Farmer Profit Spotlight Box */}
            <div style={{
              background: '#FFFFFF',
              border: '2px solid #F7D0C4',
              borderRadius: 14,
              padding: '20px 24px',
              boxShadow: '0 8px 24px -4px rgba(200, 90, 50, 0.12)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.76rem', color: '#C85A32', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  💰 Expected Net Farmer Profit ({currentArea} Acre Plot)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <span className="metric-hero">
                  ₹{(topCrop.totalEstimatedProfit || topCrop.estimatedProfit || 42000).toLocaleString()}
                </span>
                <span style={{ fontSize: '0.88rem', color: '#485954', fontWeight: 700 }}>
                  (₹{(topCrop.estimatedProfitPerAcre || Math.round((topCrop.estimatedProfit || 42000) / currentArea)).toLocaleString()}/acre)
                </span>
              </div>

              {/* Explicit Financial Breakdown */}
              <div style={{ fontSize: '0.76rem', color: '#748782', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #F8E2DC' }}>
                Gross Realization: <strong style={{ color: '#182420' }}>₹{(topCrop.totalEstimatedRevenue || topCrop.estimatedRevenue || 0).toLocaleString()}</strong>
                {' — '}
                Cultivation Costs: <strong style={{ color: '#748782' }}>₹{(topCrop.totalEstimatedCost || topCrop.estimatedCost || 0).toLocaleString()}</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#748782', display: 'block' }}>Predicted Yield</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#182420' }}>
                    {topCrop.predictedYieldPerAcre || topCrop.estimatedYieldPerAcre || topCrop.baseYield || '2.5'} t/ac
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#485954', display: 'block' }}>
                    Total Harvest: <strong>{topCrop.totalYield || Math.round((topCrop.predictedYieldPerAcre || 2.5) * currentArea * 100) / 100} tons</strong>
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#748782', display: 'block' }}>Mandi Modal Rate</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#C85A32' }}>
                    ₹{topCrop.currentPrice?.toLocaleString() || '2,450'}/q
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#485954', display: 'block' }}>
                    Market: <strong>{topCrop.market || 'Local APMC'}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Progress Meters */}
          <div className="card-well" style={{ padding: '16px 20px', marginBottom: 22 }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#485954', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Agro-Ecological Suitability Score Breakdown
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
              {/* Soil Match Meter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.82rem', color: '#182420', fontWeight: 600 }}>
                    🌱 Soil Chemistry Compatibility
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
                    🌤️ Micro-Climate & Rain Match
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

          {/* Hero Action Row: Voice + Navigate */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <button
              onClick={() => handleSpeak('hero', `Top crop recommendation for your farm: ${topCrop.name || topCrop.crop}. Expected net profit: ${(topCrop.totalEstimatedProfit || topCrop.estimatedProfit || 42000).toLocaleString()} rupees. Estimated yield: ${topCrop.predictedYieldPerAcre || 2.5} tons per acre. Mandi market rate: ${topCrop.currentPrice || 2450} rupees per quintal.`)}
              title="Listen to crop recommendation"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 10, border: '1px solid #C6E4CF',
                background: '#EBF5ED', color: '#1E5E3A', fontWeight: 700, fontSize: '0.84rem',
                cursor: 'pointer', transition: 'all 0.15s ease'
              }}
            >
              <VolumeUpIcon sx={{ fontSize: 17 }} />
              {speakingId === 'hero' ? 'Stop Speaking' : '🔊 Listen to Advisory'}
            </button>

            <button
              onClick={() => topCrop.crop && navigate(`/crop/${topCrop.crop}`)}
              className="btn-primary"
              style={{ padding: '10px 24px', fontSize: '0.9rem' }}
            >
              <span>Explore Complete Agronomy & Fertilizer Schedule</span>
              <ArrowForwardIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SIDE-BY-SIDE CROP COMPARISON TABLE */}
      {/* ========================================================================= */}
      {rawCrops.length > 1 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TableChartIcon sx={{ color: '#1E5E3A', fontSize: 22 }} />
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                  Side-by-Side Crop Comparison Table
                </h2>
                <span style={{ fontSize: '0.78rem', color: '#748782' }}>
                  Compare key agronomic & financial benchmarks across top candidates
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowTableView(v => !v)}
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '6px 14px', minHeight: 34 }}
            >
              {showTableView ? 'Hide Comparison Table' : 'Show Comparison Table'}
            </button>
          </div>

          {showTableView && (
            <div className="card-standard fade-in" style={{ overflowX: 'auto', padding: 0 }}>
              <table className="table-comparison">
                <thead>
                  <tr>
                    <th>Crop</th>
                    <th>Fit Score</th>
                    <th>Predicted Yield</th>
                    <th>Total Harvest</th>
                    <th>Harvest Cycle</th>
                    <th>Daily Water</th>
                    <th>Mandi Rate</th>
                    <th>Expected Net Profit</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rawCrops.slice(0, 5).map((c, idx) => {
                    const isTop = (c.crop || c.name) === (topCrop.crop || topCrop.name);
                    const fitScore = normalizePct(c.score, 75);
                    const yieldVal = c.predictedYieldPerAcre || c.estimatedYieldPerAcre || c.baseYield || 2.0;
                    const totYield = c.totalYield || Math.round(yieldVal * currentArea * 100) / 100;
                    const days = c.harvestDays || 110;
                    const water = c.waterPerDay ? `${Math.round(c.waterPerDay * 4047).toLocaleString()} L/ac` : '20,000 L/ac';
                    const profitVal = c.totalEstimatedProfit || c.estimatedProfit || Math.round((c.estimatedProfitPerAcre || 30000) * currentArea);

                    return (
                      <tr key={idx} style={{ background: isTop ? '#FAFDFB' : undefined }}>
                        <td style={{ fontWeight: 800, color: '#182420' }}>
                          <span style={{ marginRight: 8, fontSize: '1.2rem' }}>{getCropEmoji(c.name || c.crop)}</span>
                          <span style={{ textTransform: 'capitalize' }}>{c.name || c.crop}</span>
                          {isTop && (
                            <span style={{ marginLeft: 8, background: '#EBF5ED', color: '#1E5E3A', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: 6, border: '1px solid #C6E4CF' }}>
                              #1 CHOICE
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={getFitBadge(c.score).className} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                            {fitScore}%
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{yieldVal} t/ac</td>
                        <td style={{ fontWeight: 700, color: '#182420' }}>{totYield} tons</td>
                        <td style={{ color: '#485954' }}>{days} days</td>
                        <td style={{ color: '#0284C7', fontWeight: 600 }}>{water}</td>
                        <td style={{ fontWeight: 700, color: '#C85A32' }}>₹{c.currentPrice?.toLocaleString() || '2,400'}/q</td>
                        <td style={{ fontWeight: 800, color: '#1E5E3A', fontSize: '0.92rem' }}>
                          ₹{profitVal.toLocaleString()}
                        </td>
                        <td>
                          <button
                            onClick={() => navigate(`/crop/${c.crop}`)}
                            className="btn-secondary"
                            style={{ fontSize: '0.74rem', padding: '4px 10px', minHeight: 30 }}
                          >
                            Details →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALTERNATIVE CROP CANDIDATES WITH INTERACTIVE SORT TOGGLE */}
      {/* ========================================================================= */}
      {remainingCrops.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                🌾 Alternative Crop Candidates
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#748782' }}>
                Ranked by {sortBy === 'profit' ? 'projected net profit' : 'agro-ecological fit'} for your plot
              </span>
            </div>

            {/* Sorting Toggle Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8F7F2', padding: 3, borderRadius: 10, border: '1px solid #E5E2D8' }}>
              <button
                onClick={() => setSortBy('profit')}
                style={{
                  border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
                  background: sortBy === 'profit' ? '#FFFFFF' : 'transparent',
                  color: sortBy === 'profit' ? '#C85A32' : '#748782',
                  boxShadow: sortBy === 'profit' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                💰 Sort by Expected Profit
              </button>
              <button
                onClick={() => setSortBy('fit')}
                style={{
                  border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
                  background: sortBy === 'fit' ? '#FFFFFF' : 'transparent',
                  color: sortBy === 'fit' ? '#1E5E3A' : '#748782',
                  boxShadow: sortBy === 'fit' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                🌱 Sort by Agro-Ecological Fit
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 16
          }}>
            {sortedAlternatives.map((crop, index) => {
              const rank = index + 2;
              const fit = getFitBadge(crop.score, crop.fitTier);
              const scorePct = normalizePct(crop.score, 70);
              const harvestDaysText = crop.harvestDays ? `${crop.harvestDays} days` : '90 - 120 days';
              const profitTotal = crop.totalEstimatedProfit || crop.estimatedProfit || 35000;

              return (
                <div
                  key={crop.crop || index}
                  className="card-standard fade-in"
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
                    <div className="card-well" style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
                      padding: '12px 14px', marginBottom: 6
                    }}>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#748782', display: 'block' }}>Expected Net Profit</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E5E3A' }}>
                          ₹{profitTotal.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#748782', display: 'block' }}>
                          ₹{(crop.estimatedProfitPerAcre || Math.round(profitTotal / currentArea)).toLocaleString()}/ac
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#748782', display: 'block' }}>Predicted Yield</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#182420' }}>
                          {crop.predictedYieldPerAcre || crop.estimatedYieldPerAcre || crop.baseYield || '2.2'} t/ac
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#748782', display: 'block' }}>
                          Total: {crop.totalYield || Math.round((crop.predictedYieldPerAcre || 2.2) * currentArea * 100) / 100} tons
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
      {/* 3-SEASON CROP ROTATION PLAN CARD */}
      {/* ========================================================================= */}
      {rotationPlan && rotationPlan.rotationPlan?.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="card-standard fade-in" style={{ padding: '24px 28px', border: '1px solid #C6E4CF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.6rem' }}>🔄</span>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                    Multi-Season Crop Rotation Plan
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#748782' }}>
                    3-season sequential rotation for soil nitrogen replenishment & pest cycle breaking in {rotationPlan.state}
                  </span>
                </div>
              </div>

              <span style={{ background: '#EBF5ED', color: '#1E5E3A', fontSize: '0.74rem', fontWeight: 800, padding: '4px 12px', borderRadius: 20, border: '1px solid #C6E4CF' }}>
                🌱 Soil Health Protector
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 14 }}>
              {rotationPlan.rotationPlan.map((season, idx) => (
                <div key={idx} className="card-well" style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1E5E3A', textTransform: 'uppercase' }}>
                      {season.season}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#748782', fontWeight: 700 }}>
                      {season.months}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#182420', margin: '0 0 4px', textTransform: 'capitalize' }}>
                    {getCropEmoji(season.crop)} {season.crop}
                  </h4>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#C85A32', display: 'block', marginBottom: 6 }}>
                    {season.role}
                  </span>
                  <p style={{ fontSize: '0.78rem', color: '#485954', margin: 0, lineHeight: 1.4 }}>
                    {season.benefit}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '0.76rem', color: '#748782', fontStyle: 'italic', borderTop: '1px solid #F0EFEA', paddingTop: 10 }}>
              💡 <strong>Agronomic Principle:</strong> {rotationPlan.agronomicPrinciple}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOIL CHEMISTRY DIAGNOSTICS & INTERACTIVE ML YIELD CALCULATOR */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 20,
        marginBottom: 28
      }}>
        {/* Soil Chemistry Profile Card */}
        <div className="card-standard fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EBF5ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ScienceIcon sx={{ color: '#1E5E3A' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                    Soil Chemistry Diagnostics
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

            <div className="card-well" style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
              padding: 16, marginBottom: 14
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
            marginTop: 10, padding: '12px 16px', borderRadius: 10,
            background: '#EBF5ED', border: '1px solid #C6E4CF',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <CheckCircleIcon sx={{ color: '#1E5E3A', fontSize: 18 }} />
            <p style={{ fontSize: '0.78rem', color: '#182420', margin: 0, lineHeight: 1.4 }}>
              To maximize precision, upload your lab Soil Health Card in the selector above for <strong>100% field confidence</strong>.
            </p>
          </div>
        </div>

        {/* AI Crop Yield Predictor Widget */}
        <DashboardYieldPredictor crops={crops} farmData={farmData} initialArea={currentArea} onAreaChange={(newA) => setAreaAcres(newA)} />
      </div>
    </div>
  );
}

function DashboardYieldPredictor({ crops, farmData, initialArea, onAreaChange }) {
  const [selectedCrop, setSelectedCrop] = useState(crops?.[0]?.crop || 'rice');
  const [area, setArea] = useState(String(initialArea || 1.0));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    const parsedArea = parseFloat(area);
    if (!area || parsedArea <= 0) {
      setError('Area must be a positive number');
      return;
    }
    setError('');
    setLoading(true);
    if (onAreaChange) onAreaChange(parsedArea);

    try {
      const data = await predictYield({
        crop: selectedCrop,
        soilType: farmData?.soil?.soilType || 'loam',
        soilPh: parseFloat(farmData?.soil?.ph || 6.5),
        temperature: parseFloat(farmData?.weather?.current?.temperature || 30.0),
        rainfall: parseFloat(farmData?.weather?.rainfall7day || 50.0),
        humidity: parseFloat(farmData?.weather?.current?.humidity || 60.0),
        areaAcres: parsedArea,
        elevation: parseFloat(farmData?.elevation || 200.0),
        state: farmData?.location?.state || 'Tamil Nadu',
        month: new Date().getMonth() + 1
      });
      setResult(data);
    } catch {
      setError('Failed to compute yield prediction.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCrop) {
      handlePredict();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCrop, farmData]);

  return (
    <div className="card-standard fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
            RANDOM FOREST ML
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
        <div className="fade-in card-well" style={{
          marginTop: 16, padding: '14px 18px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
          border: '1.5px solid #C6E4CF'
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
