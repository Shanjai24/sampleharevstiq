import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../context/FarmContext';
import { getMarketPrices, predictYield } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ScienceIcon from '@mui/icons-material/Science';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import StoreIcon from '@mui/icons-material/Store';
import TimerIcon from '@mui/icons-material/Timer';
import ScaleIcon from '@mui/icons-material/Scale';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SecurityIcon from '@mui/icons-material/Security';
import { Card } from '../components/ui';
import { computePmfbyPremium, PMFBY_DISCLAIMER } from '../utils/insurance';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

export default function CropDetail() {
  const { name } = useParams();
  const { farmData } = useContext(FarmContext);
  const navigate = useNavigate();
  const { t: _t } = useTranslation();
  const [marketData, setMarketData] = useState(null);

  // Yield prediction inputs (derived from farmData, used in handlePredict)
  // BUG FIX: this was previously hardcoded to '1.0', meaning every yield
  // prediction and confidence score on this page was computed as if every
  // farm is exactly 1 acre — regardless of the farmer's actual plot size.
  // The Economics section further down already correctly used
  // farmData?.areaAcres; this now matches that same source of truth.
  const area = String(farmData?.areaAcres || 1.0);
  const soilType = farmData?.soil?.soilType || 'loam';
  const soilPh = farmData?.soil?.ph || '6.5';
  const temp = farmData?.weather?.current?.temperature || '30.0';
  const rainfall = farmData?.weather?.rainfall7day || '50.0';
  const humidity = farmData?.weather?.current?.humidity || '60.0';
  const elevation = farmData?.elevation || '200.0';
  const month = new Date().getMonth() + 1;
  const stateName = farmData?.location?.state || 'Tamil Nadu';

  // eslint-disable-next-line no-unused-vars
  const [predictedData, setPredictedData] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [predLoading, setPredLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [predError, setPredError] = useState('');

  const crop = farmData?.crops?.find(c => c.crop === name) || { crop: name, name: name };
  const state = farmData?.location?.state || 'Tamil Nadu';

  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    if (!area || parseFloat(area) <= 0) {
      setPredError('Area must be a positive number');
      return;
    }
    setPredError('');
    setPredLoading(true);
    try {
      const res = await predictYield({
        crop: name,
        soilType,
        soilPh: parseFloat(soilPh),
        temperature: parseFloat(temp),
        rainfall: parseFloat(rainfall),
        humidity: parseFloat(humidity),
        areaAcres: parseFloat(area),
        elevation: parseFloat(elevation),
        state: stateName,
        month: parseInt(month)
      });
      setPredictedData(res);
    } catch (err) {
      console.error(err);
      setPredError('Failed to get yield prediction.');
    } finally {
      setPredLoading(false);
    }
  };

  useEffect(() => {
    if (name && state) {
      getMarketPrices(state, name).then(setMarketData).catch(console.error);
    }
  }, [name, state]);

  useEffect(() => {
    if (farmData && name) {
      handlePredict();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmData, name]);

  const plantWindow = crop.plantMonths?.map(m => monthNames[m - 1]).join(', ') || 'Year-round';
  const priceHistory = marketData?.history || [];
  const trend = marketData?.trend || 'STABLE';
  const trendEmoji = trend === 'UP' ? '📈' : trend === 'DOWN' ? '📉' : '➡️';
  const trendColor = trend === 'UP' ? '#1E5E3A' : trend === 'DOWN' ? '#C85A32' : '#D97706';

  const harvestDaysText = crop.harvestDays ? `${crop.harvestDays} days` : '90 - 120 days';
  const waterText = crop.waterPerDay && !isNaN(parseFloat(crop.waterPerDay))
    ? `${Math.round(parseFloat(crop.waterPerDay) * 4047)} L/acre`
    : '1,200 L/acre';

  const normalizePct = (val, defaultVal = 80) => {
    if (val == null) return defaultVal;
    const num = typeof val === 'number' ? val : parseFloat(val) || defaultVal;
    return num <= 1 ? Math.round(num * 100) : Math.min(100, Math.round(num));
  };

  const matchPct = normalizePct(crop.score, 85);
  const soilMatch = normalizePct(crop.soilMatch, 88);
  const weatherMatch = normalizePct(crop.weatherMatch, 82);

  return (
    <div className="page-container">
      {/* Professional Header with Hero Section */}
      <div className="fade-in" style={{ marginBottom: 28 }}>
        <div className="card-hero" style={{ padding: '28px 32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <IconButton
              onClick={() => navigate(-1)}
              sx={{
                color: '#1E5E3A', background: '#FFFFFF', border: '1px solid #C6E4CF',
                '&:hover': { background: '#F8F7F2', borderColor: '#2E7D4E' },
                transition: 'all 0.2s ease'
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{
                  fontSize: '3.5rem', width: 72, height: 72, borderRadius: 18,
                  background: 'linear-gradient(135deg, #EBF5ED 0%, #C6E4CF 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px -4px rgba(30, 94, 58, 0.15)'
                }}>
                  {getCropEmoji(crop.name || name)}
                </div>
                <div>
                  <h1 style={{ fontSize: '2rem', fontWeight: 800, textTransform: 'capitalize', margin: 0, color: '#182420', letterSpacing: '-0.02em' }}>
                    {crop.name || name} Agronomy Guide
                  </h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <span className="badge-fit-strong" style={{ fontSize: '0.78rem', padding: '4px 12px' }}>
                      {matchPct}% Suitability Match
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#485954', fontWeight: 500 }}>
                      {farmData?.location?.district || 'Selected Region'}, {farmData?.location?.state || 'Tamil Nadu'}
                    </span>
                    <button
                      onClick={() => navigate(`/tasks?generate=true&crop=${encodeURIComponent(crop.name || name)}`)}
                      className="btn-primary"
                      style={{
                        padding: '4px 12px',
                        fontSize: '0.76rem',
                        borderRadius: 12,
                        marginLeft: 4,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      📅 Start Task Calendar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p style={{ color: '#485954', fontSize: '0.92rem', margin: 0, lineHeight: 1.6, maxWidth: '800px' }}>
            Comprehensive agronomic intelligence including fertilizer schedules, expected net revenue, mandi pricing trends, and precision field management recommendations optimized for your soil and micro-climate conditions.
          </p>
        </div>
      </div>

      {/* Professional Quick Stats Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16, marginBottom: 28
      }}>
        <Card className="fade-in fade-in-delay-1" style={{ padding: '20px 24px', borderLeft: '4px solid #1E5E3A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EBF5ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarMonthIcon sx={{ fontSize: 20, color: '#1E5E3A' }} />
            </div>
            <span style={{ fontSize: '0.76rem', color: '#748782', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sowing Window</span>
          </div>
          <p style={{ fontWeight: 800, margin: 0, fontSize: '1.25rem', color: '#182420', lineHeight: 1.2 }}>
            {plantWindow}
          </p>
        </Card>

        <Card className="fade-in fade-in-delay-2" style={{ padding: '20px 24px', borderLeft: '4px solid #D97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TimerIcon sx={{ fontSize: 20, color: '#D97706' }} />
            </div>
            <span style={{ fontSize: '0.76rem', color: '#748782', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Harvest Cycle</span>
          </div>
          <p style={{ fontWeight: 800, margin: 0, fontSize: '1.25rem', color: '#182420', lineHeight: 1.2 }}>
            {harvestDaysText}
          </p>
        </Card>

        <Card className="fade-in fade-in-delay-3" style={{ padding: '20px 24px', borderLeft: '4px solid #0284C7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WaterDropIcon sx={{ fontSize: 20, color: '#0284C7' }} />
            </div>
            <span style={{ fontSize: '0.76rem', color: '#748782', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Daily Water Req.</span>
          </div>
          <p style={{ fontWeight: 800, margin: 0, fontSize: '1.25rem', color: '#0284C7', lineHeight: 1.2 }}>
            {waterText}
          </p>
        </Card>

        <Card className="fade-in fade-in-delay-4" style={{ padding: '20px 24px', borderLeft: '4px solid #C85A32' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FDF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <StoreIcon sx={{ fontSize: 20, color: '#C85A32' }} />
            </div>
            <span style={{ fontSize: '0.76rem', color: '#748782', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Mandi Rate</span>
          </div>
          <p style={{ fontWeight: 800, margin: 0, fontSize: '1.25rem', color: '#C85A32', lineHeight: 1.2 }}>
            ₹{crop.currentPrice?.toLocaleString() || '2,400'} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#748782' }}>/ q</span>
          </p>
        </Card>
      </div>

      {/* Yield Confidence — was fetched (predictedData) but never rendered
          before this fix. Confidence is what the insurance nudge below
          reacts to, so it needs to actually be visible to the farmer,
          not just sit unused in state. */}
      {predictedData?.confidence && (
        <Card
          className="fade-in"
          style={{
            padding: '20px 24px', marginBottom: 20,
            borderLeft: `4px solid ${predictedData.confidence === 'HIGH' ? '#1E5E3A' :
              predictedData.confidence === 'MEDIUM' ? '#D97706' : '#C85A32'
              }`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrendingUpIcon sx={{
                fontSize: 22,
                color: predictedData.confidence === 'HIGH' ? '#1E5E3A' :
                  predictedData.confidence === 'MEDIUM' ? '#D97706' : '#C85A32'
              }} />
              <div>
                <span style={{ fontSize: '0.76rem', color: '#748782', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Model Yield Confidence
                </span>
                <p style={{ fontWeight: 800, margin: '2px 0 0', fontSize: '1.05rem', color: '#182420' }}>
                  {predictedData.confidence === 'HIGH' ? '✅ High — conditions closely match ideal profile' :
                    predictedData.confidence === 'MEDIUM' ? '⚠️ Medium — some conditions are off from ideal' :
                      '🔻 Low — several conditions diverge from ideal for this crop'}
                </p>
              </div>
            </div>
            {predictedData.predictedYieldPerAcre != null && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', color: '#748782', fontWeight: 700 }}>Predicted Yield</span>
                <p style={{ fontWeight: 800, margin: '2px 0 0', fontSize: '1.15rem', color: '#182420' }}>
                  {predictedData.predictedYieldPerAcre} / acre
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Insurance nudge — only surfaced when the model's own confidence
          is not HIGH. Reuses the exact same premium math SchemesAndLoans.jsx
          uses (utils/insurance.js), so this number can't drift from the
          one shown on the Schemes page. */}
      {(predictedData?.confidence === 'LOW' || predictedData?.confidence === 'MEDIUM') && (() => {
        // 'area' now derives from farmData?.areaAcres (fixed above), so this
        // simply uses the same authoritative source the rest of the page uses.
        const areaForCalc = farmData?.areaAcres || parseFloat(area) || 1.0;
        const { premiumPct, premium } = computePmfbyPremium(name, areaForCalc);
        return (
          <div
            className="glass-card fade-in"
            style={{ padding: '18px 22px', marginBottom: 28, borderLeft: '4px solid #C85A32', background: '#FDF3F0' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <SecurityIcon sx={{ color: '#C85A32', fontSize: 26, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 240 }}>
                <p style={{ fontWeight: 800, margin: 0, fontSize: '0.98rem', color: '#182420' }}>
                  Yield confidence is {predictedData.confidence.toLowerCase()} this season — PMFBY crop insurance may reduce your risk
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '0.84rem', color: '#485954' }}>
                  Estimated farmer-paid premium: <strong>₹{premium.toLocaleString()}</strong> ({premiumPct}% of assumed coverage value)
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#748782', lineHeight: 1.5 }}>
                  {PMFBY_DISCLAIMER}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/schemes-loans#pmfby-insurance')}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
              >
                View PMFBY Details →
              </button>
            </div>
          </div>
        );
      })()}

      {/* Professional Economics Section */}
      <div className="card-hero fade-in" style={{ padding: '28px 32px', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #FDF3F0 0%, #F7D0C4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AttachMoneyIcon sx={{ color: '#C85A32', fontSize: 24 }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#182420', letterSpacing: '-0.01em' }}>
                Crop Economics & Net Revenue
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#748782' }}>
                {farmData?.areaAcres || 1.0} Acre Plot • ML-calculated projections
                {crop.yieldSource === 'heuristic_fallback' && <span style={{ color: '#D97706', marginLeft: 6 }}>• (AI service unavailable)</span>}
              </span>
            </div>
          </div>
          <div style={{ background: '#FDF3F0', padding: '8px 16px', borderRadius: 20, border: '1px solid #F7D0C4' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#C85A32' }}>💰 PROFIT ANALYSIS</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: 14, border: '1px solid #E5E2D8', boxShadow: 'var(--shadow-subtle)' }}>
            <span style={{ fontSize: '0.74rem', color: '#748782', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Predicted Yield</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1E5E3A', lineHeight: 1.2 }}>
              {crop.predictedYieldPerAcre || crop.estimatedYieldPerAcre || '2.5'} <span style={{ fontSize: '0.85rem', color: '#748782', fontWeight: 600 }}>t/ac</span>
            </span>
            <div style={{ fontSize: '0.78rem', color: '#485954', marginTop: 6, fontWeight: 600 }}>
              Total: <strong>{crop.totalYield || Math.round((crop.predictedYieldPerAcre || 2.5) * (farmData?.areaAcres || 1.0) * 100) / 100} tons</strong>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: 14, border: '1px solid #E5E2D8', boxShadow: 'var(--shadow-subtle)' }}>
            <span style={{ fontSize: '0.74rem', color: '#748782', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Gross Realization</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#182420', lineHeight: 1.2 }}>
              ₹{(crop.totalEstimatedRevenue || crop.estimatedRevenue || 60000).toLocaleString()}
            </span>
            <div style={{ fontSize: '0.78rem', color: '#485954', marginTop: 6 }}>
              ₹{(crop.estimatedRevenuePerAcre || crop.estimatedRevenue || 60000).toLocaleString()} / acre
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: 14, border: '1px solid #E5E2D8', boxShadow: 'var(--shadow-subtle)' }}>
            <span style={{ fontSize: '0.74rem', color: '#748782', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Input & Labour Cost</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C85A32', lineHeight: 1.2 }}>
              ₹{(crop.totalEstimatedCost || crop.estimatedCost || 18000).toLocaleString()}
            </span>
            <div style={{ fontSize: '0.78rem', color: '#485954', marginTop: 6 }}>
              ₹{(crop.estimatedCostPerAcre || crop.estimatedCost || 18000).toLocaleString()} / acre
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #EBF5ED 0%, #C6E4CF 100%)', padding: '20px', borderRadius: 14, border: '2px solid #C6E4CF', boxShadow: '0 8px 24px -4px rgba(30, 94, 58, 0.15)' }}>
            <span style={{ fontSize: '0.74rem', color: '#1E5E3A', display: 'block', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>EXPECTED NET PROFIT</span>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1E5E3A', lineHeight: 1.2 }}>
              ₹{(crop.totalEstimatedProfit || crop.estimatedProfit || 42000).toLocaleString()}
            </span>
            <div style={{ fontSize: '0.82rem', color: '#1E5E3A', marginTop: 6, fontWeight: 700 }}>
              ₹{(crop.estimatedProfitPerAcre || crop.estimatedProfit || 42000).toLocaleString()} / acre
            </div>
          </div>
        </div>
      </div>

      {/* Fertilizer Schedule Card */}
      {crop.fertilizerPlan && (
        <div className="glass-card fade-in" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <LocalHospitalIcon sx={{ color: '#1E5E3A', fontSize: 24 }} />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                Recommended Fertilizer Dosage & Basal Schedule
              </h3>
              <span style={{ fontSize: '0.74rem', color: '#748782' }}>
                Rule-based NPK replenishment calibrated for {crop.name || name}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 16 }}>
            {(crop.fertilizerPlan.schedule || []).map((item, idx) => (
              <div key={idx} style={{
                background: '#F8F7F2', padding: '16px 18px', borderRadius: 12,
                border: '1px solid #E5E2D8'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: '0.94rem', color: '#182420' }}>{item.fertilizer}</strong>
                  <span style={{ background: '#EBF5ED', color: '#1E5E3A', padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 800, border: '1px solid #C6E4CF' }}>
                    {item.quantityKgPerAcre} kg/ac
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#485954', margin: 0 }}>⏱ Application: <strong>{item.timing}</strong></p>
              </div>
            ))}
          </div>

          {crop.fertilizerPlan.phCorrection && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, background: '#FFF8E7',
              border: '1px solid #FCE4B6', fontSize: '0.84rem', color: '#B45309',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span>💡</span>
              <span><strong>pH Conditioning Note:</strong> {crop.fertilizerPlan.phCorrection}</span>
            </div>
          )}
        </div>
      )}

      {/* Professional 2-Column Section */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 24, marginBottom: 28
      }}>
        {/* Environmental Compatibility Visual Meters */}
        <Card className="fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EBF5ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ScienceIcon sx={{ color: '#1E5E3A', fontSize: 22 }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                  Field & Climate Compatibility
                </h3>
                <span style={{ fontSize: '0.76rem', color: '#748782' }}>Agro-ecological match analysis</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.86rem', color: '#182420', fontWeight: 600 }}>Soil Matrix Match</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1E5E3A' }}>{soilMatch}%</span>
                </div>
                <div className="suitability-meter-track" style={{ height: 8 }}>
                  <div className="suitability-meter-fill meter-fill-strong" style={{ width: `${soilMatch}%`, transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.86rem', color: '#182420', fontWeight: 600 }}>Rainfall & Weather Alignment</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2E7D4E' }}>{weatherMatch}%</span>
                </div>
                <div className="suitability-meter-track" style={{ height: 8 }}>
                  <div className="suitability-meter-fill meter-fill-good" style={{ width: `${weatherMatch}%`, transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 12, background: '#F8F7F2', border: '1px solid #E5E2D8', fontSize: '0.84rem', color: '#485954', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <TipsAndUpdatesIcon sx={{ fontSize: 18, color: '#1E5E3A', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: '#182420' }}>Root Zone Recommendation:</strong>
                <span style={{ marginLeft: 4 }}>{crop.tips && crop.tips.length > 0 ? crop.tips[0] : 'Maintain soil organic matter with farmyard manure or vermicompost for improved aeration and moisture retention.'}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Professional 30-Day Mandi Price Chart */}
        <Card className="fade-in" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FDF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUpIcon sx={{ color: '#C85A32', fontSize: 20 }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                  30-Day Mandi Price Trend
                </h3>
                <span style={{ fontSize: '0.76rem', color: '#748782' }}>Historical price movement analysis</span>
              </div>
            </div>
            <span style={{ color: trendColor, fontWeight: 800, fontSize: '0.82rem', background: '#F8F7F2', padding: '4px 12px', borderRadius: 20, border: '1px solid #E5E2D8' }}>
              {trendEmoji} {trend}
            </span>
          </div>

          {priceHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={priceHistory}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C85A32" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C85A32" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE7DC" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#748782', fontWeight: 500 }} interval={6} axisLine={{ stroke: '#E5E2D8' }} tickLine={{ stroke: '#E5E2D8' }} />
                <YAxis domain={['dataMin - 50', 'dataMax + 50']} tick={{ fontSize: 11, fill: '#748782', fontWeight: 500 }} width={55} axisLine={{ stroke: '#E5E2D8' }} tickLine={{ stroke: '#E5E2D8' }} />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF', border: '1px solid #E5E2D8',
                    borderRadius: 12, fontSize: '0.84rem', boxShadow: 'var(--shadow-card)',
                    padding: '12px 16px'
                  }}
                  labelStyle={{ color: '#1E5E3A', fontWeight: 700, marginBottom: 4 }}
                  itemStyle={{ color: '#182420', fontWeight: 600 }}
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Price']}
                />
                <Area type="monotone" dataKey="price" stroke="#C85A32" strokeWidth={2.5} fillOpacity={1} fill="url(#priceGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#748782', fontSize: '0.88rem', gap: 12, background: '#F8F7F2', borderRadius: 12, border: '1px dashed #E5E2D8' }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: '#CECBC0' }} />
              <span>Mandi price trend chart active when connected to APMC market data.</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}