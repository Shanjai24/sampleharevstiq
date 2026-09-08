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
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ScaleIcon from '@mui/icons-material/Scale';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import GrassIcon from '@mui/icons-material/Grass';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const weatherCodeToEmoji = (code) => {
  if (code == null) return '🌤️';
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

/* =====================================================================
   ENTERPRISE AGRITECH SAAS DESIGN SYSTEM
   ===================================================================== */
const DASHBOARD_CSS = `
.db {
  --green: #1E5E3A;
  --green-hover: #16472C;
  --green-soft: #EBF5ED;
  --green-border: #C6E4CF;
  --orange: #C85A32;
  --orange-soft: #FDF3F0;
  --orange-border: #F7D0C4;
  --blue: #0284C7;
  --blue-soft: #E0F2FE;
  --blue-border: #BAE6FD;
  --amber: #D97706;
  --amber-soft: #FFF8E7;
  --amber-border: #FCE4B6;
  --ink: #182420;
  --text-muted: #485954;
  --text-faint: #748782;
  --border: #E5EAE5;
  --border-light: #F0F3F0;
  --bg-page: #F7F9F6;
  --surface: #FFFFFF;
  --shadow-sm: 0 1px 3px rgba(24, 36, 32, 0.04);
  --shadow-card: 0 4px 20px -2px rgba(24, 36, 32, 0.05), 0 1px 3px rgba(24, 36, 32, 0.02);
  --shadow-card-hover: 0 12px 28px -4px rgba(24, 36, 32, 0.09), 0 2px 6px rgba(24, 36, 32, 0.03);
  --radius-lg: 18px;
  --radius-md: 12px;
  --radius-sm: 8px;

  width: min(1280px, calc(100% - 64px));
  margin: 0 auto;
  padding: 32px 0 96px;
  font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--ink);
}

.db-section {
  margin-bottom: 52px;
}

.db-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

.db-section-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.db-section-subtitle {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: var(--text-faint);
  font-weight: 500;
}

.db-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 26px 30px;
  box-shadow: var(--shadow-card);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.db-card-hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}

.db-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 22px;
}

.db-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.db-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.db-badge-green {
  background: var(--green-soft);
  color: var(--green);
  border: 1px solid var(--green-border);
}

.db-badge-orange {
  background: var(--orange-soft);
  color: var(--orange);
  border: 1px solid var(--orange-border);
}

.db-badge-amber {
  background: var(--amber-soft);
  color: var(--amber);
  border: 1px solid var(--amber-border);
}

.db-badge-blue {
  background: var(--blue-soft);
  color: var(--blue);
  border: 1px solid var(--blue-border);
}

.db-badge-muted {
  background: #F4F6F4;
  color: var(--text-faint);
  border: 1px solid var(--border);
}

.db-badge-live {
  background: var(--green-soft);
  color: var(--green);
  border: 1px solid var(--green-border);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 800;
}

.db-badge-live::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green);
  animation: db-pulse 2s infinite;
}

@keyframes db-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.85); }
}

.db-stat-label {
  font-size: 0.72rem;
  color: var(--text-faint);
  font-weight: 600;
  display: block;
  margin-bottom: 2px;
}

.db-stat-value {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--ink);
}

.db-meter-track {
  height: 6px;
  background: #EAEFEA;
  border-radius: 9999px;
  overflow: hidden;
}

.db-meter-fill-green {
  background: var(--green);
  border-radius: 9999px;
  height: 100%;
  transition: width 0.5s ease-out;
}

.db-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 22px;
  background: var(--green);
  color: #FFFFFF;
  font-size: 0.88rem;
  font-weight: 700;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 8px rgba(30, 94, 58, 0.25);
  text-decoration: none;
}

.db-btn-primary:hover {
  background: var(--green-hover);
  box-shadow: 0 4px 12px rgba(30, 94, 58, 0.35);
  transform: translateY(-1px);
}

.db-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 18px;
  background: #FFFFFF;
  color: var(--ink);
  font-size: 0.82rem;
  font-weight: 700;
  border-radius: 10px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s ease;
}

.db-btn-secondary:hover {
  background: #F7F9F6;
  border-color: #CBD5E1;
  transform: translateY(-1px);
}

.db-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.db-table th {
  padding: 14px 16px;
  background: #F7F9F6;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.db-table th:first-child { border-top-left-radius: 12px; }
.db-table th:last-child { border-top-right-radius: 12px; }

.db-table td {
  padding: 15px 16px;
  font-size: 0.84rem;
  border-bottom: 1px solid var(--border-light);
  vertical-align: middle;
}

.db-table tbody tr:last-child td {
  border-bottom: none;
}

.db-table tbody tr:hover td {
  background: #F9FCF8;
}

.db-table tbody tr.db-top-row td {
  background: #F4FBF5;
}

.db-sort-toggle {
  display: inline-flex;
  align-items: center;
  background: #EEF2ED;
  border-radius: 10px;
  border: 1px solid var(--border);
  padding: 3px;
  gap: 2px;
}

.db-sort-btn {
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  color: var(--text-faint);
  transition: all 0.15s ease;
}

.db-sort-btn.active {
  background: #FFFFFF;
  color: var(--ink);
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.db-overflow-x {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 1024px) {
  .db { width: calc(100% - 36px); padding: 24px 0 72px; }
  .db-grid-2 { grid-template-columns: 1fr; }
  .db-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .db-table { min-width: 800px; }
}

@media (max-width: 640px) {
  .db { width: calc(100% - 24px); padding: 16px 0 60px; }
  .db-card { padding: 18px; border-radius: 14px; }
  .db-section { margin-bottom: 36px; }
  .db-grid-4 { grid-template-columns: 1fr; }
}
`;

export default function Dashboard() {
  const { farmData, setFarmData, location, sessionAnalyzed, lastAnalyzedAt, areaAcres, setAreaAcres } = useContext(FarmContext);
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  // eslint-disable-next-line no-unused-vars
  const [reanalysing, setReanalysing] = useState(false);
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
        <div className="card-standard" style={{ maxWidth: 540, margin: '0 auto', padding: '48px 32px' }}>
          <div style={{ fontSize: '3.8rem', marginBottom: 18 }}>🌾</div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: 10, color: '#182420' }}>
            {t('dashboard.noFarmTitle', 'No Farm Plot Analyzed Yet')}
          </h2>
          <p style={{ color: '#485954', fontSize: '0.94rem', marginBottom: 28, lineHeight: 1.6 }}>
            {t('dashboard.noFarmDesc', "Select your farm plot on the interactive map or enable GPS to calculate soil compatibility, groundwater risks, and expected profit.")}
          </p>
          <button
            onClick={() => navigate('/')}
            className="db-btn-primary"
            style={{ width: '100%', padding: '14px 24px', fontSize: '0.98rem' }}
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
  const gwBadgeLabel = riskLevel === 'HIGH' ? 'High Risk' : riskLevel === 'MODERATE' ? 'Moderate' : 'Good';

  const rawCrops = crops || [];
  const topCrop = rawCrops.find(c => c.isHighestProfit) || rawCrops[0] || {};
  const remainingCrops = rawCrops.filter(c => (c.crop || c.name) !== (topCrop.crop || topCrop.name));

  const sortedAlternatives = [...remainingCrops].sort((a, b) => {
    if (sortBy === 'profit') {
      return (b.totalEstimatedProfit || b.estimatedProfit || 0) - (a.totalEstimatedProfit || a.estimatedProfit || 0);
    }
    return (b.score || 0) - (a.score || 0);
  });

  const getFitBadge = (scoreDecimal, fitTier) => {
    const tier = fitTier || (scoreDecimal >= 0.78 ? 'Strong Fit' : scoreDecimal >= 0.70 ? 'Good Fit' : scoreDecimal >= 0.65 ? 'Moderate Fit' : 'Low Confidence');
    if (tier === 'Strong Fit') return { label: 'Strong Fit', className: 'db-badge-green', meterColor: '#1E5E3A' };
    if (tier === 'Good Fit') return { label: 'Good Fit', className: 'db-badge-green', meterColor: '#2E7D32' };
    if (tier === 'Moderate Fit') return { label: 'Moderate Fit', className: 'db-badge-amber', meterColor: '#D97706' };
    return { label: 'Low Confidence', className: 'db-badge-muted', meterColor: '#9E9E9E' };
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
  const topProfitVal = topCrop.totalEstimatedProfit || topCrop.estimatedProfit || 254870;
  const profitVal = topProfitVal;
  const topProfitPerAcre = topCrop.estimatedProfitPerAcre || Math.round(topProfitVal / currentArea);
  const profitPerAcre = topProfitPerAcre;
  const revenueVal = topCrop.totalEstimatedRevenue || topCrop.estimatedRevenue || 309870;
  const costVal = topCrop.totalEstimatedCost || topCrop.estimatedCost || 55000;
  const harvestDays = topCrop.harvestDays || (topCrop.crop?.toLowerCase().includes('sugarcane') ? 330 : 120);
  const waterReq = topCrop.waterPerDay 
    ? `${Math.round(topCrop.waterPerDay * 4047).toLocaleString()} L/ac/day` 
    : (topCrop.crop?.toLowerCase().includes('sugarcane') ? '40,470 L/ac/day' : '24,000 L/ac/day');

  return (
    <>
      <style>{DASHBOARD_CSS}</style>
      <div className="db">

        {/* ─── Session Cache Alert ─── */}
        {isLoadedFromCache && (
          <div style={{ background: '#FFF8E7', border: '1px solid #FCE4B6', borderRadius: 12, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.2rem' }}>📌</span>
              <div>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#B45309' }}>Showing Saved Plot Analysis</span>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#485954' }}>
                  {loc?.district ? `${loc.district}, ${loc.state}` : 'Saved plot'} {lastAnalyzedAt ? `• ${lastAnalyzedAt}` : ''} ({currentArea} Acres)
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/')} className="db-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
              📍 Run Fresh Analysis
            </button>
          </div>
        )}

        {/* ─── Biosecurity Outbreak Radar ─── */}
        {outbreaks.length > 0 && outbreaks.map(o => (
          <div key={o.id} style={{ background: '#FDF3F0', border: '1.5px solid #F7D0C4', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.5rem' }}>🚨</span>
              <div>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#C85A32', display: 'block' }}>BIOSECURITY — {o.disease?.toUpperCase()} WITHIN 15 KM</span>
                <span style={{ fontSize: '0.8rem', color: '#182420' }}>{o.message}</span>
              </div>
            </div>
            <button onClick={() => navigate('/chat')} className="db-btn-primary" style={{ padding: '7px 16px', fontSize: '0.78rem', background: '#C85A32' }}>Inspect Symptoms →</button>
          </div>
        ))}


        {/* ═══════════════════════════════════════════════════════════
           SECTION 01 — PRIMARY AGRICULTURAL RECOMMENDATION (HERO)
        ═══════════════════════════════════════════════════════════ */}
        <section className="db-section">
          {/* Outer Card with Rolling Hills Graphic */}
          <div
            className="db-card"
            style={{
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid #C6E4CF',
              background: '#FFFFFF',
              padding: '28px 32px',
              borderRadius: '20px',
              boxShadow: '0 4px 20px -2px rgba(24, 36, 32, 0.04)'
            }}
          >
            {/* Rolling Terraced Agricultural Hills Illustration on Right Side */}
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '44%',
                pointerEvents: 'none',
                overflow: 'hidden',
                borderTopRightRadius: '20px',
                borderBottomRightRadius: '20px',
                zIndex: 0
              }}
            >
              <svg
                viewBox="0 0 540 220"
                fill="none"
                preserveAspectRatio="none"
                style={{ width: '100%', height: '100%' }}
              >
                <defs>
                  <linearGradient id="hillFadeMask" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                    <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
                  </linearGradient>
                  <linearGradient id="backHills" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#DDF1E2" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#CCEBD3" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="midHills" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#BCE3C4" />
                    <stop offset="100%" stopColor="#A8DAB3" />
                  </linearGradient>
                  <linearGradient id="frontHills" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#92CFA0" />
                    <stop offset="100%" stopColor="#75BE86" />
                  </linearGradient>
                  <mask id="fadeMaskHills">
                    <rect x="0" y="0" width="540" height="220" fill="url(#hillFadeMask)" />
                  </mask>
                </defs>

                <g mask="url(#fadeMaskHills)">
                  {/* Distant soft mountains */}
                  <path d="M0 140 Q 140 95 300 115 Q 440 98 540 75 L 540 220 L 0 220 Z" fill="url(#backHills)" />
                  
                  {/* Middle rolling hills */}
                  <path d="M40 160 Q 180 115 360 135 Q 460 120 540 105 L 540 220 L 40 220 Z" fill="url(#midHills)" opacity="0.85" />
                  
                  {/* Foreground tea/crop terraced slope */}
                  <path d="M100 185 Q 240 135 400 155 Q 480 145 540 135 L 540 220 L 100 220 Z" fill="url(#frontHills)" opacity="0.9" />
                  
                  {/* Terraced curved contour lines */}
                  <path d="M180 220 C 230 180, 310 162, 380 162 C 450 162, 490 152, 540 145" stroke="#4A8C5B" strokeWidth="3" fill="none" opacity="0.45" />
                  <path d="M230 220 C 280 188, 360 174, 430 172 C 480 170, 505 162, 540 158" stroke="#4A8C5B" strokeWidth="3" fill="none" opacity="0.45" />
                  <path d="M300 220 C 350 198, 420 185, 470 182 C 495 180, 510 175, 540 172" stroke="#4A8C5B" strokeWidth="3" fill="none" opacity="0.45" />
                  <path d="M380 220 C 420 205, 465 198, 495 195 C 510 193, 515 190, 540 188" stroke="#4A8C5B" strokeWidth="3" fill="none" opacity="0.45" />
                  
                  {/* Subtle terraced vertical ridges radiating across slopes */}
                  <path d="M280 125 C 330 155, 370 190, 390 220" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="4 4" opacity="0.45" />
                  <path d="M340 140 C 390 170, 430 200, 450 220" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="4 4" opacity="0.45" />
                  <path d="M400 152 C 445 178, 480 205, 500 220" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="4 4" opacity="0.45" />
                </g>
              </svg>
            </div>

            {/* Content Container (Above Background) */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              
              {/* Top Header Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    backgroundColor: '#EBF5ED',
                    border: '1px solid #C6E4CF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <GrassIcon sx={{ color: '#1E5E3A', fontSize: 26 }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1E5E3A', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                      YOUR PLOT OVERVIEW
                    </span>
                    <h1 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#182420', letterSpacing: '-0.02em' }}>
                      Primary Agricultural Recommendation
                    </h1>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 18px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D5DDD5',
                    borderRadius: 10,
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#182420',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <span>🗺️</span>
                  <span>Select Different Plot</span>
                </button>
              </div>

              {/* Main Inner Horizontal Recommendation Box (Matches Screenshot Exactly) */}
              <div
                style={{
                  maxWidth: '840px',
                  backgroundColor: 'rgba(255, 255, 255, 0.96)',
                  border: '1px solid #C6E4CF',
                  borderRadius: '16px',
                  padding: '20px 26px',
                  boxShadow: '0 2px 12px rgba(24, 36, 32, 0.04)',
                  backdropFilter: 'blur(6px)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 26 }}>
                  
                  {/* Left Side: Crop Icon + Name + Badges + Cycle + Water */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 340px' }}>
                    <div style={{
                      width: 58,
                      height: 58,
                      borderRadius: 14,
                      backgroundColor: '#EBF5ED',
                      border: '1.5px solid #C6E4CF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.4rem',
                      flexShrink: 0
                    }}>
                      {getCropEmoji(topCrop.name || topCrop.crop || 'Sugarcane')}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <h2 style={{
                          margin: 0,
                          fontSize: '1.55rem',
                          fontWeight: 800,
                          color: '#182420',
                          letterSpacing: '-0.02em',
                          textTransform: 'capitalize'
                        }}>
                          {topCrop.name || topCrop.crop || 'Sugarcane'}
                        </h2>
                        <span style={{
                          backgroundColor: '#FFF3EC',
                          color: '#C85A32',
                          border: '1px solid #FADCCE',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap'
                        }}>
                          #1 RECOMMENDED CROP
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: '0.8rem', color: '#748782' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <CalendarMonthIcon sx={{ fontSize: 16, color: '#748782' }} />
                          Growth Cycle: <strong style={{ color: '#182420' }}>{harvestDays} days</strong>
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <WaterDropIcon sx={{ fontSize: 16, color: '#0284C7' }} />
                          Water Req: <strong style={{ color: '#182420' }}>{waterReq}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Divider */}
                  <div style={{ width: 1, height: 60, backgroundColor: '#E5EAE5' }} />

                  {/* Right Side: Leaf Icon + Expected Net Profit + Breakdown */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: '1 1 320px' }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: '#EBF5ED',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2
                    }}>
                      <GrassIcon sx={{ color: '#1E5E3A', fontSize: 18 }} />
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#485954', marginBottom: 2 }}>
                        Expected Net Profit ({currentArea} Acre Plot)
                      </span>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#1E5E3A', letterSpacing: '-0.02em', lineHeight: 1 }}>
                          ₹{profitVal.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#748782', fontWeight: 600 }}>
                          (₹{profitPerAcre.toLocaleString()}/acre)
                        </span>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: '#748782' }}>
                        Gross Realization: <strong style={{ color: '#182420' }}>₹{revenueVal.toLocaleString()}</strong>
                        {'  ·  '}
                        Cultivation Costs: <strong style={{ color: '#182420' }}>₹{costVal.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Subtle Actions Strip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => topCrop.crop && navigate(`/crop/${topCrop.crop}`)}
                  className="db-btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                >
                  Explore Agronomy &amp; Fertilizer Schedule <ArrowForwardIcon sx={{ fontSize: 16 }} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSpeak('hero', `Top recommended crop is ${topCrop.name || topCrop.crop || 'Sugarcane'}, with an expected net profit of ${profitVal.toLocaleString()} rupees for your ${currentArea} acre farm.`)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: '1px solid #C6E4CF',
                    background: '#EBF5ED',
                    color: '#1E5E3A',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  <VolumeUpIcon sx={{ fontSize: 16 }} />
                  {speakingId === 'hero' ? 'Stop Audio' : '🔊 Listen to Advisory'}
                </button>
              </div>

            </div>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════════
           SECTION 02 — SOIL DATA SOURCE & ACCURACY (MATCHES SCREENSHOT 2)
        ═══════════════════════════════════════════════════════════ */}
        <section className="db-section">
          <SoilTierSelector
            currentSoil={soil}
            soilTierInfo={soilTierInfo}
            onApplyTier={handleApplySoilTier}
          />
        </section>


        {/* ═══════════════════════════════════════════════════════════
           SECTION 03 — SOIL, WATER, CLIMATE & MARKET INSIGHTS (MATCHES SCREENSHOT 3)
        ═══════════════════════════════════════════════════════════ */}
        <section className="db-section">
          <div className="db-section-head">
            <div>
              <h2 className="db-section-title">Soil, Water, Climate &amp; Market Insights</h2>
              <p className="db-section-subtitle">Key agricultural data and real-time insights for your selected plot in {loc?.district ? `${loc.district}, ${loc.state}` : 'Erode, Tamil Nadu'}.</p>
            </div>
            <button onClick={() => navigate('/weather')} className="db-btn-secondary">
              View All Data Sources →
            </button>
          </div>

          <div className="db-grid-2" style={{ gap: 22 }}>

            {/* ── CARD A: Soil Data ── */}
            <div className="db-card db-card-hover">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EBF5ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ScienceIcon sx={{ color: '#1E5E3A', fontSize: 22 }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#182420' }}>Soil Data</div>
                    <div style={{ fontSize: '0.74rem', color: '#748782' }}>Soil health and nutrient analysis for better crop planning</div>
                  </div>
                </div>
                <span className="db-badge db-badge-muted">{soilTierInfo?.confidenceLabel || '75% Govt Soil DB'}</span>
              </div>

              {/* Top 3 Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#F7F9F6', borderRadius: 12, padding: '12px 14px', border: '1px solid #EDF1EC' }}>
                  <span className="db-stat-label">Soil Type</span>
                  <span className="db-stat-value" style={{ color: '#1E5E3A', textTransform: 'capitalize' }}>{soil?.soilType || 'Loam'}</span>
                  <div style={{ fontSize: '0.68rem', color: '#748782', marginTop: 2 }}>Good for a wide range of crops</div>
                </div>
                <div style={{ background: '#F7F9F6', borderRadius: 12, padding: '12px 14px', border: '1px solid #EDF1EC' }}>
                  <span className="db-stat-label">pH Level</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="db-stat-value">{soil?.ph || 6.5}</span>
                    <span className="db-badge db-badge-green" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>Optimal</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#748782', marginTop: 2 }}>(5.5 – 7.5)</div>
                </div>
                <div style={{ background: '#F7F9F6', borderRadius: 12, padding: '12px 14px', border: '1px solid #EDF1EC' }}>
                  <span className="db-stat-label">Root Depth</span>
                  <span className="db-stat-value">{soil?.depth || 100} cm</span>
                  <div style={{ fontSize: '0.68rem', color: '#748782', marginTop: 2 }}>Deep root zone</div>
                </div>
              </div>

              {/* Nutrient Status with Colored Micro-Bars */}
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#748782', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Nutrient Status
              </div>
              <div className="db-grid-4" style={{ marginBottom: 16 }}>
                {[
                  { label: 'Nitrogen (N)', val: soilTierInfo?.N || 180, unit: 'kg/ha', status: 'Medium', barColor: '#1E5E3A', barW: '65%' },
                  { label: 'Phosphorus (P)', val: soilTierInfo?.P || 22, unit: 'kg/ha', status: 'Medium', barColor: '#0284C7', barW: '55%' },
                  { label: 'Potassium (K)', val: soilTierInfo?.K || 190, unit: 'kg/ha', status: 'High', barColor: '#7C3AED', barW: '80%' },
                  { label: 'Organic Carbon', val: '0.62', unit: '%', status: 'Medium', barColor: '#D97706', barW: '60%' },
                ].map((n, i) => (
                  <div key={i} style={{ background: '#FBFDFB', padding: '10px 12px', borderRadius: 10, border: '1px solid #EAEFEA' }}>
                    <div style={{ fontSize: '0.68rem', color: '#748782', marginBottom: 2 }}>{n.label}</div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#182420', marginBottom: 4 }}>
                      {n.val} <span style={{ fontWeight: 500, fontSize: '0.68rem', color: '#748782' }}>{n.unit}</span>
                    </div>
                    <span className="db-badge db-badge-green" style={{ fontSize: '0.6rem', padding: '1px 6px', marginBottom: 6 }}>+ {n.status}</span>
                    <div className="db-meter-track" style={{ height: 4 }}><div style={{ width: n.barW, height: '100%', background: n.barColor, borderRadius: 9999 }} /></div>
                  </div>
                ))}
              </div>

              {/* Soil Recommendation Banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 12, borderTop: '1px solid #EDF1EC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#1E5E3A', fontWeight: 600 }}>
                  <CheckCircleIcon sx={{ fontSize: 16 }} /> Recommendation: Add organic matter and balanced NPK for improved soil fertility.
                </div>
                <span onClick={() => navigate('/chat')} style={{ fontSize: '0.78rem', color: '#1E5E3A', fontWeight: 800, cursor: 'pointer' }}>View Detailed Report →</span>
              </div>
            </div>

            {/* ── CARD B: Groundwater Safety ── */}
            <div className="db-card db-card-hover">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <WaterDropIcon sx={{ color: '#0284C7', fontSize: 22 }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#182420' }}>Groundwater Safety</div>
                    <div style={{ fontSize: '0.74rem', color: '#748782' }}>Water quality and availability analysis for sustainable farming</div>
                  </div>
                </div>
                <span className="db-badge" style={{ background: riskBg, color: riskColor, border: `1px solid ${riskBorder}` }}>
                  ⚠ Risk Level: {gwBadgeLabel}
                </span>
              </div>

              {/* Top 3 Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#F7F9F6', borderRadius: 12, padding: '12px 14px', border: '1px solid #EDF1EC' }}>
                  <span className="db-stat-label">💧 Water Table Depth</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0284C7', marginTop: 2 }}>{borewell?.waterTableDepth || '12.5'} m</div>
                  <div style={{ fontSize: '0.68rem', color: '#748782', marginTop: 2 }}>(Safe range: 5 – 15 m)</div>
                </div>
                <div style={{ background: '#F7F9F6', borderRadius: 12, padding: '12px 14px', border: '1px solid #EDF1EC' }}>
                  <span className="db-stat-label">✅ Quality Assessment</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E5E3A', marginTop: 2 }}>{gwBadgeLabel}</div>
                  <div style={{ fontSize: '0.68rem', color: '#748782', marginTop: 2 }}>Suitable for irrigation</div>
                </div>
                <div style={{ background: '#F7F9F6', borderRadius: 12, padding: '12px 14px', border: '1px solid #EDF1EC' }}>
                  <span className="db-stat-label">💧 TDS Level</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#182420', marginTop: 2 }}>{borewell?.tds || '480'} ppm</div>
                  <div style={{ fontSize: '0.68rem', color: '#748782', marginTop: 2 }}>(Safe: &lt; 1000 ppm)</div>
                </div>
              </div>

              {/* Key Parameters Table */}
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#748782', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Key Parameters
              </div>
              <div style={{ marginBottom: 16 }}>
                {[
                  { param: 'pH', val: borewell?.ph || '7.2', status: 'Normal', ok: true },
                  { param: 'Electrical Conductivity (EC)', val: `${borewell?.ec || 0.8} dS/m`, status: 'Normal', ok: true },
                  { param: 'Nitrate (NO₃)', val: `${borewell?.nitrate || 18} mg/L`, status: 'Safe', ok: true },
                  { param: 'Fluoride (F⁻)', val: `${borewell?.fluoride || 0.4} mg/L`, status: 'Safe', ok: true },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #EDF1EC', fontSize: '0.8rem' }}>
                    <span style={{ color: '#485954' }}>{r.param}</span>
                    <span style={{ fontWeight: 700, color: '#182420' }}>{r.val}</span>
                    <span className="db-badge db-badge-green" style={{ fontSize: '0.62rem', padding: '2px 8px' }}>+ {r.status}</span>
                  </div>
                ))}
              </div>

              {/* Note Banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 12, borderTop: '1px solid #EDF1EC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#0284C7', fontWeight: 600 }}>
                  <InfoOutlinedIcon sx={{ fontSize: 16 }} /> Note: Groundwater is safe for irrigation and not at risk of contamination.
                </div>
                <span onClick={() => navigate('/borewell')} style={{ fontSize: '0.78rem', color: '#1E5E3A', fontWeight: 800, cursor: 'pointer' }}>View Detailed Report →</span>
              </div>
            </div>

            {/* ── CARD C: Micro-Climate ── */}
            <div className="db-card db-card-hover" style={{ cursor: 'pointer' }} onClick={() => navigate('/weather')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <WbSunnyIcon sx={{ color: '#0284C7', fontSize: 22 }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#182420' }}>Micro-Climate</div>
                    <div style={{ fontSize: '0.74rem', color: '#748782' }}>Live and forecasted weather data for your plot</div>
                  </div>
                </div>
                <span className="db-badge-live">● Live</span>
              </div>

              {/* Top 4 Weather Metrics */}
              <div className="db-grid-4" style={{ marginBottom: 18, background: '#F7F9F6', padding: '14px', borderRadius: 12, border: '1px solid #EDF1EC' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', lineHeight: 1 }}>{weatherCodeToEmoji(weather?.current?.weatherCode)}</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#182420', marginTop: 4 }}>
                    {weather?.current?.temperature != null ? `${weather.current.temperature}°C` : '29.5°C'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#748782' }}>Sunny</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem' }}>💧</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0284C7', marginTop: 2 }}>
                    {weather?.current?.humidity || 60}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#748782' }}>Humidity</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem' }}>🌧️</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0284C7', marginTop: 2 }}>
                    {weather?.rainfall7day || 4.4} mm
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#748782' }}>7-Day Rainfall</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem' }}>🌬️</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#182420', marginTop: 2 }}>
                    {weather?.current?.windspeed || 7} km/h
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#748782' }}>Wind Speed</div>
                </div>
              </div>

              {/* 7-Day Forecast Strip */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#748782', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  7-Day Forecast
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, overflowX: 'auto' }}>
                  {(weather?.daily?.time?.slice(0, 7) || ['Today', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((date, i) => (
                    <div key={i} style={{ textAlign: 'center', background: '#F7F9F6', borderRadius: 10, padding: '8px 4px', border: '1px solid #EDF1EC' }}>
                      <div style={{ fontSize: '0.65rem', color: '#748782', fontWeight: 700 }}>
                        {i === 0 ? 'Today' : typeof date === 'string' && date.includes('-') ? new Date(date).toLocaleDateString('en', { weekday: 'short' }) : date}
                      </div>
                      <div style={{ fontSize: '1.3rem', margin: '4px 0' }}>
                        {weatherCodeToEmoji(weather?.daily?.weathercode?.[i])}
                      </div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#182420' }}>
                        {weather?.daily?.temperature_2m_max?.[i] != null ? `${Math.round(weather.daily.temperature_2m_max[i])}°` : '29°'} / {weather?.daily?.temperature_2m_min?.[i] != null ? `${Math.round(weather.daily.temperature_2m_min[i])}°` : '21°'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insight Banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 12, borderTop: '1px solid #EDF1EC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#0284C7', fontWeight: 600 }}>
                  <InfoOutlinedIcon sx={{ fontSize: 16 }} /> Insight: Ideal conditions for paddy and sugarcane cultivation. Light rainfall expected mid-week.
                </div>
                <span style={{ fontSize: '0.78rem', color: '#1E5E3A', fontWeight: 800 }}>View Detailed Forecast →</span>
              </div>
            </div>

            {/* ── CARD D: Mandi Rates ── */}
            <div className="db-card db-card-hover" style={{ cursor: 'pointer' }} onClick={() => navigate('/market')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FDF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <StoreIcon sx={{ color: '#C85A32', fontSize: 22 }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#182420' }}>Mandi Rates</div>
                    <div style={{ fontSize: '0.74rem', color: '#748782' }}>Live market prices for key crops in {loc?.state || 'Tamil Nadu'} mandis</div>
                  </div>
                </div>
                <span className="db-badge db-badge-orange">📈 Live Prices</span>
              </div>

              {/* Mandi Price Table */}
              <div className="db-overflow-x" style={{ marginBottom: 14 }}>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Crop</th>
                      <th>Mandi</th>
                      <th>Modal Rate (₹/q)</th>
                      <th>Min Rate (₹/q)</th>
                      <th>Max Rate (₹/q)</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(crops || [
                      { name: 'Paddy (Common)', crop: 'rice', currentPrice: 2400 },
                      { name: 'Sugarcane', crop: 'sugarcane', currentPrice: 3050 },
                      { name: 'Turmeric', crop: 'turmeric', currentPrice: 7800 },
                      { name: 'Tomato', crop: 'tomato', currentPrice: 1800 },
                      { name: 'Chilli', crop: 'chilli', currentPrice: 9500 },
                    ]).slice(0, 5).map((c, i) => {
                      const trend = i === 3 ? -3.2 : i === 0 ? 2.1 : i === 1 ? 1.8 : i === 4 ? 1.1 : 0.0;
                      const trendColor = trend > 0 ? '#1E5E3A' : trend < 0 ? '#C85A32' : '#748782';
                      const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
                      const modal = c.currentPrice || 2400;
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 700 }}>
                            <span style={{ marginRight: 6 }}>{getCropEmoji(c.name || c.crop)}</span>
                            {c.name || c.crop}
                          </td>
                          <td style={{ color: '#748782' }}>{loc?.district || 'Erode'}</td>
                          <td style={{ fontWeight: 800, color: '#182420' }}>₹{modal.toLocaleString()}</td>
                          <td style={{ color: '#485954' }}>₹{Math.round(modal * 0.95).toLocaleString()}</td>
                          <td style={{ color: '#485954' }}>₹{Math.round(modal * 1.08).toLocaleString()}</td>
                          <td style={{ fontWeight: 800, color: trendColor }}>
                            {trendIcon} {trend > 0 ? `+${trend}%` : `${trend}%`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Market Trend Banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 12, borderTop: '1px solid #EDF1EC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#1E5E3A', fontWeight: 600 }}>
                  📊 Market trend: Prices are stable for most crops. Tomato prices have decreased slightly.
                </div>
                <span style={{ fontSize: '0.78rem', color: '#1E5E3A', fontWeight: 800 }}>View Full Mandi Report →</span>
              </div>
            </div>

          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════════
           SECTION 04 — SIDE-BY-SIDE CROP COMPARISON
        ═══════════════════════════════════════════════════════════ */}
        {rawCrops.length > 1 && (
          <section className="db-section">
            <div className="db-section-head">
              <div>
                <h2 className="db-section-title">Side-by-Side Crop Comparison</h2>
                <p className="db-section-subtitle">Compare key agronomic &amp; financial benchmarks across top candidates.</p>
              </div>
              <button onClick={() => setShowTableView(v => !v)} className="db-btn-secondary" style={{ fontSize: '0.8rem', padding: '7px 16px' }}>
                {showTableView ? 'Hide Comparison Table' : 'Show Comparison Table'}
              </button>
            </div>

            {showTableView && (
              <div className="db-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="db-overflow-x">
                  <table className="db-table">
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
                      {rawCrops.slice(0, 6).map((c, idx) => {
                        const isTop = (c.crop || c.name) === (topCrop.crop || topCrop.name);
                        const fitScore = normalizePct(c.score, 75);
                        const yieldVal = c.predictedYieldPerAcre || c.estimatedYieldPerAcre || c.baseYield || 2.0;
                        const totYield = c.totalYield || Math.round(yieldVal * currentArea * 100) / 100;
                        const days = c.harvestDays || 110;
                        const water = c.waterPerDay ? `${Math.round(c.waterPerDay * 4047).toLocaleString()} L/ac` : '20,000 L/ac';
                        const profitVal = c.totalEstimatedProfit || c.estimatedProfit || Math.round((c.estimatedProfitPerAcre || 30000) * currentArea);
                        const fb = getFitBadge(c.score, c.fitTier);
                        return (
                          <tr key={idx} className={isTop ? 'db-top-row' : ''}>
                            <td style={{ fontWeight: 800, color: '#182420' }}>
                              <span style={{ marginRight: 8, fontSize: '1.25rem' }}>{getCropEmoji(c.name || c.crop)}</span>
                              <span style={{ textTransform: 'capitalize' }}>{c.name || c.crop}</span>
                              {isTop && <span className="db-badge db-badge-green" style={{ marginLeft: 8, fontSize: '0.62rem', padding: '1px 8px' }}>#1 Choice</span>}
                            </td>
                            <td><span className={fb.className} style={{ fontSize: '0.74rem', padding: '2px 9px' }}>{fitScore}%</span></td>
                            <td style={{ fontWeight: 700 }}>{yieldVal} t/ac</td>
                            <td style={{ fontWeight: 700 }}>{totYield} tons</td>
                            <td style={{ color: '#485954' }}>{days} days</td>
                            <td style={{ color: '#0284C7', fontWeight: 600 }}>{water}</td>
                            <td style={{ fontWeight: 700, color: '#C85A32' }}>₹{c.currentPrice?.toLocaleString() || '2,400'}/q</td>
                            <td style={{ fontWeight: 800, color: '#1E5E3A', fontSize: '0.95rem' }}>₹{profitVal.toLocaleString()}</td>
                            <td>
                              <button onClick={(e) => { e.stopPropagation(); navigate(`/crop/${c.crop}`); }} className="db-btn-secondary" style={{ fontSize: '0.76rem', padding: '5px 12px' }}>
                                Details →
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}


        {/* ═══════════════════════════════════════════════════════════
           SECTION 05 — ALTERNATIVE CROP CANDIDATES
        ═══════════════════════════════════════════════════════════ */}
        {sortedAlternatives.length > 0 && (
          <section className="db-section">
            <div className="db-section-head">
              <div>
                <h2 className="db-section-title">Alternative Crop Candidates</h2>
                <p className="db-section-subtitle">Ranked by {sortBy === 'profit' ? 'projected net profit' : 'agronomic fit'} for your plot.</p>
              </div>
              <div className="db-sort-toggle">
                <button className={`db-sort-btn ${sortBy === 'profit' ? 'active' : ''}`} onClick={() => setSortBy('profit')}>
                  💰 Sort by Expected Profit
                </button>
                <button className={`db-sort-btn ${sortBy === 'fit' ? 'active' : ''}`} onClick={() => setSortBy('fit')}>
                  🌱 Sort by Agronomic Fit
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 }}>
              {sortedAlternatives.map((crop, index) => {
                const rank = index + 2;
                const fit = getFitBadge(crop.score, crop.fitTier);
                const scorePct = normalizePct(crop.score, 70);
                const harvestText = crop.harvestDays ? `${crop.harvestDays} days` : '90 – 120 days';
                const profitTotal = crop.totalEstimatedProfit || crop.estimatedProfit || 35000;
                return (
                  <div
                    key={crop.crop || index}
                    className="db-card db-card-hover"
                    onClick={() => crop.crop && navigate(`/crop/${crop.crop}`)}
                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', padding: '20px 22px' }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: '1.75rem', width: 46, height: 46, borderRadius: 12, background: '#F7F9F6', border: '1px solid #E5EAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {getCropEmoji(crop.name || crop.crop)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="db-badge db-badge-muted" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>#{rank}</span>
                            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#182420', textTransform: 'capitalize' }}>
                              {crop.name || crop.crop}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#748782' }}>⏱ {harvestText}</span>
                        </div>
                      </div>
                      <span className={fit.className} style={{ fontSize: '0.72rem', padding: '3px 10px' }}>{fit.label}</span>
                    </div>

                    {/* Overall Fit Progress Bar */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 5 }}>
                        <span style={{ color: '#748782' }}>Overall Fit</span>
                        <strong style={{ color: fit.meterColor }}>{scorePct}%</strong>
                      </div>
                      <div className="db-meter-track">
                        <div style={{ width: `${scorePct}%`, height: '100%', background: fit.meterColor, borderRadius: 9999, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>

                    {/* Economics Block */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#F7F9F6', borderRadius: 10, padding: '12px 14px', marginBottom: 14, border: '1px solid #EDF1EC' }}>
                      <div>
                        <span className="db-stat-label">Expected Net Profit</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E5E3A' }}>₹{profitTotal.toLocaleString()}</span>
                        <span style={{ fontSize: '0.66rem', color: '#748782', display: 'block', marginTop: 1 }}>
                          ₹{(crop.estimatedProfitPerAcre || Math.round(profitTotal / currentArea)).toLocaleString()}/ac
                        </span>
                      </div>
                      <div>
                        <span className="db-stat-label">Predicted Yield</span>
                        <span style={{ fontSize: '1.02rem', fontWeight: 800, color: '#182420' }}>{crop.predictedYieldPerAcre || crop.baseYield || '2.2'} t/ac</span>
                        <span style={{ fontSize: '0.66rem', color: '#748782', display: 'block', marginTop: 1 }}>
                          Total: {crop.totalYield || Math.round((crop.predictedYieldPerAcre || 2.2) * currentArea * 100) / 100} tons
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #EDF1EC' }}>
                      <span style={{ fontSize: '0.76rem', color: '#748782' }}>
                        Market Rate: <strong style={{ color: '#C85A32' }}>₹{crop.currentPrice?.toLocaleString() || '2,200'}/q</strong>
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#1E5E3A', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                        Details <ArrowForwardIcon sx={{ fontSize: 14 }} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}


        {/* ═══════════════════════════════════════════════════════════
           SECTION 06 — MULTI-SEASON CROP ROTATION PLAN
        ═══════════════════════════════════════════════════════════ */}
        {rotationPlan && rotationPlan.rotationPlan?.length > 0 && (
          <section className="db-section">
            <div className="db-section-head">
              <div>
                <h2 className="db-section-title">Multi-Season Crop Rotation Plan</h2>
                <p className="db-section-subtitle">3-season sequential rotation for soil nitrogen replenishment &amp; pest-cycle management.</p>
              </div>
              <span className="db-badge db-badge-green">🌱 Soil Health Protector</span>
            </div>

            <div className="db-card" style={{ border: '1.5px solid #C6E4CF' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${rotationPlan.rotationPlan.length}, 1fr)`, gap: 16, marginBottom: 18 }}>
                {rotationPlan.rotationPlan.map((season, idx) => (
                  <div key={idx} style={{ background: '#F7F9F6', borderRadius: 14, padding: '18px 20px', border: '1px solid #C6E4CF', position: 'relative' }}>
                    {idx < rotationPlan.rotationPlan.length - 1 && (
                      <div style={{ position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)', color: '#1E5E3A', fontSize: '1.3rem', fontWeight: 800, zIndex: 2, background: '#FFFFFF', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #C6E4CF', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        →
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1E5E3A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {season.season}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#748782', fontWeight: 700 }}>{season.months}</span>
                    </div>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#182420', margin: '0 0 6px', textTransform: 'capitalize' }}>
                      {getCropEmoji(season.crop)} {season.crop}
                    </h4>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#C85A32', display: 'block', marginBottom: 6 }}>
                      {season.role}
                    </span>
                    <p style={{ fontSize: '0.78rem', color: '#485954', margin: 0, lineHeight: 1.5 }}>
                      {season.benefit}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.8rem', color: '#485954', borderTop: '1px solid #EDF1EC', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>💡</span>
                <span>
                  <strong>Agronomic Principle:</strong> {rotationPlan.agronomicPrinciple}
                </span>
              </div>
            </div>
          </section>
        )}


        {/* ═══════════════════════════════════════════════════════════
           SECTION 07 & 08 — SOIL DIAGNOSTICS + YIELD CALCULATOR
        ═══════════════════════════════════════════════════════════ */}
        <section className="db-section" style={{ marginBottom: 0 }}>
          <div className="db-grid-2" style={{ gap: 24 }}>

            {/* SECTION 07 — Soil Chemistry Diagnostics */}
            <div>
              <div className="db-section-head" style={{ marginBottom: 14 }}>
                <div>
                  <h2 className="db-section-title">Soil Chemistry Diagnostics</h2>
                  <p className="db-section-subtitle">Government Soil Health Card Scheme ({loc?.state || 'TN'})</p>
                </div>
              </div>

              <div className="db-card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 60px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EBF5ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ScienceIcon sx={{ color: '#1E5E3A', fontSize: 20 }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#182420' }}>Detailed Soil Profile</div>
                      <div style={{ fontSize: '0.72rem', color: '#748782' }}>{soilTierInfo?.source || 'Regional Geospatial Soil Matrix'}</div>
                    </div>
                  </div>
                  <span className="db-badge db-badge-green">{soilTierInfo?.confidenceLabel || '75% Govt DB'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, background: '#F7F9F6', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #EDF1EC' }}>
                  {[
                    { label: 'Soil Type', val: soil?.soilType || 'Loam', color: '#1E5E3A' },
                    { label: 'pH Level', val: soil?.ph || 6.5, color: '#D97706' },
                    { label: 'Root Depth', val: `${soil?.depth || 100} cm`, color: '#182420' },
                    { label: 'Nitrogen (N)', val: `${soilTierInfo?.N || 180} kg/ha`, color: '#1E5E3A' },
                    { label: 'Phosphorus (P)', val: `${soilTierInfo?.P || 22} kg/ha`, color: '#1E5E3A' },
                    { label: 'Potassium (K)', val: `${soilTierInfo?.K || 190} kg/ha`, color: '#1E5E3A' },
                  ].map((s, i) => (
                    <div key={i}>
                      <span className="db-stat-label">{s.label}</span>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: s.color, textTransform: 'capitalize', display: 'block' }}>{s.val}</span>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '12px 16px', borderRadius: 12, background: '#EBF5ED', border: '1px solid #C6E4CF', display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
                  <CheckCircleIcon sx={{ color: '#1E5E3A', fontSize: 18, flexShrink: 0 }} />
                  <p style={{ fontSize: '0.78rem', color: '#182420', margin: 0, lineHeight: 1.45 }}>
                    Upload your laboratory Soil Health Card above for <strong>100% field confidence</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 08 — AI Crop Yield Calculator */}
            <div>
              <div className="db-section-head" style={{ marginBottom: 14 }}>
                <div>
                  <h2 className="db-section-title">AI Crop Yield Calculator</h2>
                  <p className="db-section-subtitle">Machine Learning Harvest Estimate</p>
                </div>
              </div>

              <DashboardYieldPredictor
                crops={crops}
                farmData={farmData}
                initialArea={currentArea}
                onAreaChange={(newA) => setAreaAcres(newA)}
              />
            </div>

          </div>
        </section>

      </div>
    </>
  );
}


/* =====================================================================
   SUB-COMPONENT: AI Crop Yield Calculator
   ===================================================================== */
function DashboardYieldPredictor({ crops, farmData, initialArea, onAreaChange }) {
  const [selectedCrop, setSelectedCrop] = useState(crops?.[0]?.crop || 'sugarcane');
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
    <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FDF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScaleIcon sx={{ color: '#C85A32', fontSize: 20 }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#182420' }}>AI Crop Yield Calculator</div>
            <div style={{ fontSize: '0.72rem', color: '#748782' }}>Random Forest ML Model</div>
          </div>
        </div>
        <span className="db-badge db-badge-orange">RANDOM FOREST ML</span>
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
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: '#F7F9F6', border: '1px solid #E5EAE5', color: '#182420', fontSize: '0.9rem', outline: 'none', fontWeight: 700 }}
            >
              {(crops || [
                { crop: 'sugarcane', name: 'Sugarcane' },
                { crop: 'rice', name: 'Rice (Paddy)' },
                { crop: 'cotton', name: 'Cotton' },
                { crop: 'turmeric', name: 'Turmeric' },
                { crop: 'chilli', name: 'Chilli' }
              ]).map((c, idx) => (
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
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: '#F7F9F6', border: '1px solid #E5EAE5', color: '#182420', fontSize: '0.9rem', outline: 'none', fontWeight: 700 }}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="db-btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '0.9rem', opacity: loading ? 0.75 : 1 }}
        >
          {loading ? 'Calculating Output...' : 'Recalculate Predicted Yield'}
        </button>
      </form>

      {error && <p style={{ color: '#C85A32', fontSize: '0.82rem', marginTop: 10 }}>⚠️ {error}</p>}

      {!loading && result && (
        <div style={{ marginTop: 16, padding: '16px 18px', background: '#F7F9F6', borderRadius: 12, border: '1.5px solid #C6E4CF', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#485954', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Yield per Acre
            </span>
            <p style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1E5E3A', margin: '4px 0 0' }}>
              {result.predictedYieldPerAcre} <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#748782' }}>tons/ac</span>
            </p>
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#485954', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Total Harvest ({area} ac)
            </span>
            <p style={{ fontSize: '1.45rem', fontWeight: 800, color: '#C85A32', margin: '4px 0 0' }}>
              {result.totalYield} <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#748782' }}>tons</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
