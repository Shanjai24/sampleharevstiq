import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../context/FarmContext';
import { getMarketPrices, predictYield } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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
  const area = '1.0';
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
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, textTransform: 'capitalize', margin: 0, color: '#182420', letterSpacing: '-0.02em' }}>
              {getCropEmoji(crop.name || name)} {crop.name || name} Agronomy Guide
            </h1>
            <span className="badge-fit-strong">
              {matchPct}% Suitability Match
            </span>
          </div>
          <p style={{ color: '#485954', fontSize: '0.88rem', margin: '2px 0 0' }}>
            Fertilizer schedules, expected net revenue, mandi pricing, & field management
          </p>
        </div>
      </div>

      {/* Quick Stats Grid (4 columns) */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14, marginBottom: 24
      }}>
        <div className="glass-card fade-in fade-in-delay-1" style={{ padding: '18px 20px', borderLeft: '4px solid #1E5E3A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <CalendarMonthIcon sx={{ fontSize: 18, color: '#1E5E3A' }} />
            <span style={{ fontSize: '0.74rem', color: '#748782', fontWeight: 700 }}>Sowing Window</span>
          </div>
          <p style={{ fontWeight: 800, margin: 0, fontSize: '1.15rem', color: '#182420' }}>
            {plantWindow}
          </p>
        </div>

        <div className="glass-card fade-in fade-in-delay-2" style={{ padding: '18px 20px', borderLeft: '4px solid #D97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <TimerIcon sx={{ fontSize: 18, color: '#D97706' }} />
            <span style={{ fontSize: '0.74rem', color: '#748782', fontWeight: 700 }}>Harvest Cycle</span>
          </div>
          <p style={{ fontWeight: 800, margin: 0, fontSize: '1.15rem', color: '#182420' }}>
            {harvestDaysText}
          </p>
        </div>

        <div className="glass-card fade-in fade-in-delay-3" style={{ padding: '18px 20px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <WaterDropIcon sx={{ fontSize: 18, color: '#0284c7' }} />
            <span style={{ fontSize: '0.74rem', color: '#748782', fontWeight: 700 }}>Daily Water Req.</span>
          </div>
          <p style={{ fontWeight: 800, margin: 0, fontSize: '1.15rem', color: '#0284c7' }}>
            {waterText}
          </p>
        </div>

        <div className="glass-card fade-in fade-in-delay-4" style={{ padding: '18px 20px', borderLeft: '4px solid #C85A32' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <StoreIcon sx={{ fontSize: 18, color: '#C85A32' }} />
            <span style={{ fontSize: '0.74rem', color: '#748782', fontWeight: 700 }}>Current Mandi Rate</span>
          </div>
          <p style={{ fontWeight: 800, margin: 0, fontSize: '1.15rem', color: '#C85A32' }}>
            ₹{crop.currentPrice?.toLocaleString() || '2,400'} <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#748782' }}>/ q</span>
          </p>
        </div>
      </div>

      {/* Profit & Economics Highlight Banner */}
      <div className="hero-card-top-crop fade-in" style={{ padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <AttachMoneyIcon sx={{ color: '#C85A32', fontSize: 26 }} />
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#182420' }}>
              Crop Economics & Projected Net Revenue ({farmData?.areaAcres || 1.0} Acre Plot)
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#748782' }}>
              Calculated from ML predicted yield × regional modal price − estimated cultivation cost
              {crop.yieldSource === 'heuristic_fallback' ? ' • (estimated — AI service unavailable)' : ''}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: 12, border: '1px solid #E5E2D8', boxShadow: 'var(--shadow-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: '#748782', display: 'block', fontWeight: 600 }}>Predicted Yield</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1E5E3A' }}>
              {crop.predictedYieldPerAcre || crop.estimatedYieldPerAcre || '2.5'} <span style={{ fontSize: '0.8rem', color: '#748782', fontWeight: 500 }}>tons/ac</span>
            </span>
            <div style={{ fontSize: '0.75rem', color: '#485954', marginTop: 2, fontWeight: 700 }}>
              Total: {crop.totalYield || Math.round((crop.predictedYieldPerAcre || 2.5) * (farmData?.areaAcres || 1.0) * 100) / 100} tons
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: 12, border: '1px solid #E5E2D8', boxShadow: 'var(--shadow-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: '#748782', display: 'block', fontWeight: 600 }}>Gross Realization</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#182420' }}>
              ₹{(crop.totalEstimatedRevenue || crop.estimatedRevenue || 60000).toLocaleString()}
            </span>
            <div style={{ fontSize: '0.75rem', color: '#485954', marginTop: 2 }}>
              ₹{(crop.estimatedRevenuePerAcre || crop.estimatedRevenue || 60000).toLocaleString()} / acre
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: 12, border: '1px solid #E5E2D8', boxShadow: 'var(--shadow-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: '#748782', display: 'block', fontWeight: 600 }}>Est. Input & Labour Cost</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#C85A32' }}>
              ₹{(crop.totalEstimatedCost || crop.estimatedCost || 18000).toLocaleString()}
            </span>
            <div style={{ fontSize: '0.75rem', color: '#485954', marginTop: 2 }}>
              ₹{(crop.estimatedCostPerAcre || crop.estimatedCost || 18000).toLocaleString()} / acre
            </div>
          </div>

          <div style={{ background: '#EBF5ED', padding: '16px', borderRadius: 12, border: '1px solid #C6E4CF', boxShadow: 'var(--shadow-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: '#1E5E3A', display: 'block', fontWeight: 800 }}>EXPECTED NET PROFIT</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1E5E3A' }}>
              ₹{(crop.totalEstimatedProfit || crop.estimatedProfit || 42000).toLocaleString()}
            </span>
            <div style={{ fontSize: '0.78rem', color: '#1E5E3A', marginTop: 2, fontWeight: 700 }}>
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

      {/* 2-Column Section: Environmental Compatibility & Price Trend */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 20, marginBottom: 24
      }}>
        {/* Environmental Compatibility Visual Meters */}
        <div className="glass-card fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <ScienceIcon sx={{ color: '#1E5E3A', fontSize: 22 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                Field & Climate Compatibility
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.84rem', color: '#182420', fontWeight: 600 }}>Soil Matrix Match</span>
                  <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#1E5E3A' }}>{soilMatch}%</span>
                </div>
                <div className="suitability-meter-track">
                  <div className="suitability-meter-fill meter-fill-strong" style={{ width: `${soilMatch}%` }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.84rem', color: '#182420', fontWeight: 600 }}>Rainfall & Weather Alignment</span>
                  <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#2E7D4E' }}>{weatherMatch}%</span>
                </div>
                <div className="suitability-meter-track">
                  <div className="suitability-meter-fill meter-fill-good" style={{ width: `${weatherMatch}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 10, background: '#F8F7F2', border: '1px solid #E5E2D8', fontSize: '0.8rem', color: '#485954' }}>
            🌱 <strong>Root Zone Recommendation:</strong> Maintain soil organic matter with farmyard manure or vermicompost for improved aeration and moisture retention.
          </div>
        </div>

        {/* 30-Day Mandi Price Chart */}
        <div className="glass-card fade-in" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#182420' }}>
              30-Day Mandi Price Trend
            </h3>
            <span style={{ color: trendColor, fontWeight: 800, fontSize: '0.82rem', background: '#F8F7F2', padding: '3px 8px', borderRadius: 6, border: '1px solid #E5E2D8' }}>
              {trendEmoji} {trend}
            </span>
          </div>

          {priceHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE7DC" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#748782' }} interval={6} />
                <YAxis domain={['dataMin - 50', 'dataMax + 50']} tick={{ fontSize: 10, fill: '#748782' }} width={50} />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF', border: '1px solid #E5E2D8',
                    borderRadius: 10, fontSize: '0.82rem', boxShadow: 'var(--shadow-card)'
                  }}
                  labelStyle={{ color: '#1E5E3A', fontWeight: 700 }}
                />
                <Line type="monotone" dataKey="price" stroke="#C85A32" strokeWidth={2.6} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#748782', fontSize: '0.86rem' }}>
              Mandi price trend chart active when connected to APMC market data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
