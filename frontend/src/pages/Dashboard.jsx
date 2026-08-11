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
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

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

const getMatchBadgeClass = (score) => {
  const pct = Math.round((score || 0) * 100);
  if (pct >= 80) return 'badge-match-high';
  if (pct >= 60) return 'badge-match-medium';
  return 'badge-match-low';
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
        <div className="glass-card" style={{ maxWidth: 500, margin: '0 auto', padding: 40 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🌾</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>{t('dashboard.noFarmTitle', 'No Farm Analyzed Yet')}</h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.5 }}>
            {t('dashboard.noFarmDesc', "Select your farm site on the interactive map to trigger AgroPredict's multi-layered crop intelligence & risk analysis.")}
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-accent pulse-glow"
            style={{ width: '100%' }}
          >
            📍 {t('home.title', 'Analyse My Farm')}
          </button>
        </div>
      </div>
    );
  }

  const { weather, borewell, crops, location: loc, soil, soilTierInfo } = farmData;
  const isLoadedFromCache = !sessionAnalyzed;

  const riskLevel = borewell?.riskLevel || 'MODERATE';
  const riskColor = riskLevel === 'HIGH' ? '#ef4444' : riskLevel === 'MODERATE' ? '#f59e0b' : '#2E6F40';
  const riskBg = riskLevel === 'HIGH' ? 'rgba(239, 68, 68, 0.15)' : riskLevel === 'MODERATE' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(46, 111, 64, 0.15)';
  const riskEmoji = riskLevel === 'HIGH' ? '🔴' : riskLevel === 'MODERATE' ? '🟡' : '🟢';

  const highestProfitCrop = crops?.find(c => c.isHighestProfit) || crops?.[0];

  const getFitBadge = (scoreDecimal, fitTier) => {
    const tier = fitTier || (scoreDecimal >= 0.78 ? 'Strong Fit' : scoreDecimal >= 0.70 ? 'Good Fit' : scoreDecimal >= 0.65 ? 'Moderate Fit' : 'Low Confidence');
    if (tier === 'Strong Fit') return { label: 'Strong Fit', className: 'badge-fit-strong' };
    if (tier === 'Good Fit') return { label: 'Good Fit', className: 'badge-fit-good' };
    if (tier === 'Moderate Fit') return { label: 'Moderate Fit', className: 'badge-fit-moderate' };
    return { label: 'Low Confidence', className: 'badge-fit-low' };
  };

  return (
    <div className="page-container">
      {isLoadedFromCache && (
        <div style={{
          background: '#FFF8E7', border: '1px solid #FCE4B6', borderRadius: 10,
          padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.1rem' }}>📌</span>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#D97706' }}>
                Showing Saved Analysis for your Land Plot
              </span>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#4A5D58' }}>
                {loc?.district ? `${loc.district}, ${loc.state}` : 'Previous session plot'} {lastAnalyzedAt ? `(Analyzed ${lastAnalyzedAt})` : ''}
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

      <div className="fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1C2826' }}>
              Farm Decision Dashboard
            </h1>
            <span style={{
              background: '#EBF4ED', border: '1px solid #C8E6C9',
              color: '#2E6F40', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20
            }}>
              LIVE ANALYSIS
            </span>
          </div>
          <p style={{ color: '#4A5D58', fontSize: '0.85rem' }}>
            📍 {loc?.district ? `${loc.district}, ${loc.state}` : 'Farm Location'} • Coordinates: {loc?.lat?.toFixed(4)}, {loc?.lng?.toFixed(4)}
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="btn-secondary"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem'
          }}
        >
          <span>📍</span>
          <span>{t('dashboard.changeLocation', 'Select Different Location')}</span>
        </button>
      </div>

      <SoilTierSelector
        currentSoil={soil}
        soilTierInfo={soilTierInfo}
        onApplyTier={handleApplySoilTier}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div
          className="glass-card fade-in fade-in-delay-1"
          onClick={() => navigate('/borewell')}
          style={{ padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#EBF4ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WaterDropIcon sx={{ color: '#2E6F40', fontSize: 20 }} />
              </div>
              <span style={{ fontSize: '0.82rem', color: '#4A5D58', fontWeight: 700 }}>
                Groundwater Safety
              </span>
            </div>
            <ArrowForwardIcon sx={{ color: '#788A85', fontSize: 18 }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: '1.6rem' }}>{riskEmoji}</span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: riskColor }}>
                {riskLevel === 'HIGH' ? 'Requires Attention' : riskLevel === 'MODERATE' ? 'Moderate Watch' : 'Good Condition'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#4A5D58' }}>Aquifer Risk Index</span>
              <span style={{
                fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                background: riskBg, color: riskColor
              }}>
                {borewell?.riskScore || 0}/100
              </span>
            </div>
          </div>
        </div>

        <div
          className="glass-card fade-in fade-in-delay-2"
          onClick={() => navigate('/weather')}
          style={{ padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WbSunnyIcon sx={{ color: '#D97706', fontSize: 20 }} />
              </div>
              <span style={{ fontSize: '0.82rem', color: '#4A5D58', fontWeight: 700 }}>
                Weather Today
              </span>
            </div>
            <ArrowForwardIcon sx={{ color: '#788A85', fontSize: 18 }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: '1.8rem' }}>{weatherCodeToEmoji(weather?.current?.weatherCode)}</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1C2826' }}>
                {weather?.current?.temperature || '--'}°C
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#4A5D58' }}>
              💧 Humidity: <strong>{weather?.current?.humidity || '--'}%</strong> • 🌧️ Rain: <strong>{weather?.current?.precipitation || 0}mm</strong>
            </p>
          </div>
        </div>

        <div
          className="glass-card fade-in fade-in-delay-3"
          onClick={() => highestProfitCrop && navigate(`/crop/${highestProfitCrop.crop}`)}
          style={{ padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#FDF3F0', borderColor: '#F8D2C6' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FDF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AttachMoneyIcon sx={{ color: '#C85A32', fontSize: 22 }} />
              </div>
              <span style={{ fontSize: '0.82rem', color: '#C85A32', fontWeight: 700 }}>
                Top Crop Recommendation
              </span>
            </div>
            <ArrowForwardIcon sx={{ color: '#C85A32', fontSize: 18 }} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'capitalize', color: '#C85A32', margin: '2px 0 4px' }}>
              ⭐ {highestProfitCrop?.name || highestProfitCrop?.crop || 'Rice'}
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#4A5D58' }}>Expected Net Revenue</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2E6F40' }}>
                ₹{highestProfitCrop?.estimatedProfit?.toLocaleString() || '42,000'}/acre
              </span>
            </div>
          </div>
        </div>

        <div
          className="glass-card fade-in fade-in-delay-4"
          onClick={() => navigate('/market')}
          style={{ padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#EBF4ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <StoreIcon sx={{ color: '#2E6F40', fontSize: 20 }} />
              </div>
              <span style={{ fontSize: '0.82rem', color: '#4A5D58', fontWeight: 700 }}>
                APMC Mandi Price Highlights
              </span>
            </div>
            <ArrowForwardIcon sx={{ color: '#788A85', fontSize: 18 }} />
          </div>

          <div>
            <p style={{ fontSize: '0.72rem', color: '#788A85', marginBottom: 6 }}>
              Current market rates for {loc?.state || 'regional'} mandis:
            </p>
            {(crops || []).slice(0, 2).map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: '0.82rem', textTransform: 'capitalize', color: '#1C2826' }}>
                  {c.name || c.crop}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#C85A32' }}>
                  ₹{c.currentPrice?.toLocaleString() || '—'}/q
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1C2826' }}>
              🌾 Crop Decision Matrix
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#788A85' }}>
              Ranked by Soil-Climate Compatibility & Expected Net Revenue
            </span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16
        }}>
          {(crops || []).map((crop, i) => {
            const harvestDaysText = crop.harvestDays ? `${crop.harvestDays} days` : '90-120 days';
            const fitInfo = getFitBadge(crop.score, crop.fitTier);
            const scorePct = Math.round((crop.score || 0) * 100);

            return (
              <div
                key={i}
                className="glass-card fade-in"
                onClick={() => navigate(`/crop/${crop.crop}`)}
                style={{
                  padding: 20, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  border: crop.isHighestProfit ? '2px solid #C85A32' : '1px solid #E6E4DC',
                  background: crop.isHighestProfit ? '#FDF3F0' : '#FFFFFF'
                }}
              >
                <div>
                  {crop.isHighestProfit && (
                    <div style={{
                      background: '#C85A32', color: '#fff',
                      fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                      display: 'inline-block', marginBottom: 10
                    }}>
                      ⭐ HIGHEST EXPECTED PROFIT
                    </div>
                  )}

                      <div>
                        <h3 style={{ fontWeight: 800, textTransform: 'capitalize', fontSize: '1.1rem', margin: 0, color: '#1C2826' }}>
                          {crop.name || crop.crop}
                        </h3>
                        <span style={{ fontSize: '0.72rem', color: '#788A85' }}>⏱ {harvestDaysText} harvest</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        className={fitInfo.className}
                        style={{
                          fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                          display: 'inline-block', marginBottom: 4
                        }}
                      >
                        {fitInfo.label}
                      </span>
                      <div style={{ fontSize: '0.7rem', color: '#4A5D58' }}>
                        {scorePct}% Suitability
                      </div>
                    </div>
                  </div>

                  {/* Economics Side-by-Side */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14,
                    background: '#FAF9F5', padding: 12, borderRadius: 8,
                    border: '1px solid #E6E4DC'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#788A85', display: 'block' }}>Predicted Yield</span>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#2E6F40' }}>
                        {crop.estimatedYieldPerAcre || '2.5'} tons/ac
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#788A85', display: 'block' }}>Expected Net Revenue</span>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#2E6F40' }}>
                        ₹{(crop.estimatedProfit || 35000).toLocaleString()}/ac
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #E6E4DC' }}>
                  <span style={{ fontSize: '0.75rem', color: '#788A85' }}>Mandi Rate</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#C85A32' }}>
                    ₹{crop.currentPrice?.toLocaleString() || '2,400'} / q
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Soil Profile & AI Yield Predictor */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 20,
        marginBottom: 28
      }}>
        {/* Soil Chemistry Profile Card */}
        <div className="glass-card fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EBF4ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ScienceIcon sx={{ color: '#2E6F40' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#1C2826' }}>Soil Chemistry Profile</h3>
                <span style={{ fontSize: '0.72rem', color: '#788A85' }}>{soilTierInfo?.source || 'Geospatial matrix'}</span>
              </div>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
              background: '#FAF9F5', padding: 16, borderRadius: 10,
              border: '1px solid #E6E4DC'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#788A85', display: 'block', marginBottom: 2 }}>Soil Type</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', textTransform: 'capitalize', color: '#2E6F40' }}>{soil?.soilType || 'Loam'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#788A85', display: 'block', marginBottom: 2 }}>pH Level</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#D97706' }}>{soil?.ph || 6.5}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: 2 }}>Root Depth</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{soil?.depth || 100} cm</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: 2 }}>Nitrogen (N)</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2dd4bf' }}>{soilTierInfo?.N || 180} kg/ha</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: 2 }}>Phosphorus (P)</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2dd4bf' }}>{soilTierInfo?.P || 22} kg/ha</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: 2 }}>Potassium (K)</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2dd4bf' }}>{soilTierInfo?.K || 190} kg/ha</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(20, 184, 166, 0.08)', border: '1px solid rgba(20, 184, 166, 0.15)' }}>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>
              💡 Confidence Score: <strong>{soilTierInfo?.confidenceLabel || '75% Govt DB'}</strong>.
            </p>
          </div>
        </div>

        {/* AI Yield Predictor Widget */}
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
    <div className="glass-card fade-in" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#2dd4bf' }}>
          🤖 AI Crop Yield Predictor
        </h3>
        <span style={{ fontSize: '0.68rem', background: 'rgba(20, 184, 166, 0.12)', color: '#2dd4bf', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>
          ML ENGINE ACTIVE
        </span>
      </div>

      <form onSubmit={handlePredict} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: 6, fontWeight: 600 }}>Select Crop</label>
            <select
              value={selectedCrop}
              onChange={e => setSelectedCrop(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: 10,
                background: '#12201c', border: '1px solid rgba(20, 184, 166, 0.25)',
                color: '#f8fafc', fontSize: '0.85rem', outline: 'none', fontWeight: 600
              }}
            >
              {(crops || []).map((c, idx) => (
                <option key={idx} value={c.crop}>{c.name || c.crop}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: 6, fontWeight: 600 }}>Farm Area (Acres)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={area}
              onChange={e => setArea(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(20, 184, 166, 0.25)',
                color: '#f8fafc', fontSize: '0.85rem', outline: 'none', fontWeight: 600
              }}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-accent"
          style={{ padding: '10px 20px', fontSize: '0.85rem', maxWidth: 240, margin: '4px auto 0', display: 'block', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Calculating Output...' : 'Calculate Predicted Yield'}
        </button>
      </form>

      {error && <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 10 }}>⚠️ {error}</p>}

      {!loading && result && (
        <div className="fade-in" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
            background: 'rgba(20, 184, 166, 0.08)', padding: 14, borderRadius: 10,
            border: '1px solid rgba(20, 184, 166, 0.2)'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Yield per Acre</span>
              <p style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2dd4bf', margin: '2px 0 0' }}>
                {result.predictedYieldPerAcre} tons/ac
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Total Yield ({area} ac)</span>
              <p style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0284c7', margin: '2px 0 0' }}>
                {result.totalYield} tons
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
