import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import { getMarketPrices, predictYield } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getMatchBadgeClass = (score) => {
  const pct = Math.round((score || 0) * 100);
  if (pct >= 80) return 'badge-match-high';
  if (pct >= 60) return 'badge-match-medium';
  return 'badge-match-low';
};

export default function CropDetail() {
  const { name } = useParams();
  const { farmData } = useContext(FarmContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [marketData, setMarketData] = useState(null);

  // Yield prediction state
  const [area, setArea] = useState('1.0');
  const [soilType, setSoilType] = useState(farmData?.soil?.soilType || 'loam');
  const [soilPh, setSoilPh] = useState(farmData?.soil?.ph || '6.5');
  const [temp, setTemp] = useState(farmData?.weather?.current?.temperature || '30.0');
  const [rainfall, setRainfall] = useState(farmData?.weather?.rainfall7day || '50.0');
  const [humidity, setHumidity] = useState(farmData?.weather?.current?.humidity || '60.0');
  const [elevation, setElevation] = useState(farmData?.elevation || '200.0');
  const [month] = useState(new Date().getMonth() + 1);
  const [stateName] = useState(farmData?.location?.state || 'Tamil Nadu');

  const [predictedData, setPredictedData] = useState(null);
  const [predLoading, setPredLoading] = useState(false);
  const [predError, setPredError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

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
  }, [farmData, name]);

  const plantWindow = crop.plantMonths?.map(m => monthNames[m - 1]).join(', ') || 'Year-round';
  const priceHistory = marketData?.history || [];
  const trend = marketData?.trend || 'STABLE';
  const trendEmoji = trend === 'UP' ? '📈' : trend === 'DOWN' ? '📉' : '➡️';
  const trendColor = trend === 'UP' ? '#10b981' : trend === 'DOWN' ? '#ef4444' : '#f59e0b';

  const harvestDaysText = crop.harvestDays ? `${crop.harvestDays} days` : '90-120 days';
  const waterText = crop.waterPerDay && !isNaN(parseFloat(crop.waterPerDay))
    ? `${Math.round(parseFloat(crop.waterPerDay) * 4047)} L/acre`
    : '1,200 L/acre';

  const badgeClass = getMatchBadgeClass(crop.score);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ color: '#2dd4bf', background: 'rgba(20, 184, 166, 0.1)' }}>
          <ArrowBackIcon />
        </IconButton>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, textTransform: 'capitalize', margin: 0 }}>
              🌾 {crop.name || name} AgroPredict Insights
            </h1>
            <span
              className={badgeClass}
              title="Match Score: Combines AI neural model confidence, soil composition match, and 7-day weather alignment."
              style={{
                fontSize: '0.8rem', fontWeight: 800, padding: '4px 12px', borderRadius: 20,
                cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 4
              }}
            >
              <span>{Math.round((crop.score || 0.85) * 100)}% Match Score</span>
              <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>ℹ️</span>
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: 2 }}>
            Agronomic insights, fertilizer dosage schedule, mandi economics, & yield predictions
          </p>
        </div>
      </div>

      {/* Quick Stats Grid (4 columns) */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14, marginBottom: 24
      }}>
        <div className="glass-card fade-in fade-in-delay-1" style={{ padding: 18 }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>Best Planting Window</span>
          <p style={{ fontWeight: 800, marginTop: 6, fontSize: '1rem', color: '#f8fafc' }}>🗓 {plantWindow}</p>
        </div>
        <div className="glass-card fade-in fade-in-delay-2" style={{ padding: 18 }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>Harvest Duration</span>
          <p style={{ fontWeight: 800, marginTop: 6, fontSize: '1rem', color: '#f8fafc' }}>⏱ {harvestDaysText}</p>
        </div>
        <div className="glass-card fade-in fade-in-delay-3" style={{ padding: 18 }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>Daily Water Requirement</span>
          <p style={{ fontWeight: 800, marginTop: 6, fontSize: '1rem', color: '#0284c7' }}>💧 {waterText}</p>
        </div>
        <div className="glass-card fade-in fade-in-delay-4" style={{ padding: 18 }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>Current Mandi Price</span>
          <p style={{ fontWeight: 800, marginTop: 6, fontSize: '1rem', color: '#f59e0b' }}>
            ₹{crop.currentPrice?.toLocaleString() || '2,400'} / q
          </p>
        </div>
      </div>

      {/* Step 3: Profit Analysis Card */}
      <div className="glass-card fade-in" style={{ padding: 24, marginBottom: 24, background: 'rgba(217, 119, 6, 0.08)', borderColor: 'rgba(217, 119, 6, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <AttachMoneyIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#f59e0b' }}>
              💰 Crop Economics & Net Profit Analysis
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Calculated from predicted yield × modal mandi rate − cultivation cost</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div style={{ background: 'rgba(11, 18, 16, 0.6)', padding: 14, borderRadius: 12, border: '1px solid rgba(217, 119, 6, 0.2)' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Est. Yield / Acre</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2dd4bf' }}>{crop.estimatedYieldPerAcre || '2.5'} tons/ac</span>
          </div>
          <div style={{ background: 'rgba(11, 18, 16, 0.6)', padding: 14, borderRadius: 12, border: '1px solid rgba(217, 119, 6, 0.2)' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Gross Revenue</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>₹{(crop.estimatedRevenue || 60000).toLocaleString()}</span>
          </div>
          <div style={{ background: 'rgba(11, 18, 16, 0.6)', padding: 14, borderRadius: 12, border: '1px solid rgba(217, 119, 6, 0.2)' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Est. Cultivation Cost</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>₹{(crop.estimatedCost || 18000).toLocaleString()}</span>
          </div>
          <div style={{ background: 'rgba(11, 18, 16, 0.6)', padding: 14, borderRadius: 12, border: '1px solid rgba(217, 119, 6, 0.3)' }}>
            <span style={{ fontSize: '0.7rem', color: '#cbd5e1', display: 'block', fontWeight: 700 }}>Expected Net Profit</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>₹{(crop.estimatedProfit || 42000).toLocaleString()}/ac</span>
          </div>
        </div>
      </div>

      {/* Step 2: Fertilizer Schedule Card */}
      {crop.fertilizerPlan && (
        <div className="glass-card fade-in" style={{ padding: 24, marginBottom: 24, background: 'rgba(20, 184, 166, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <LocalHospitalIcon sx={{ color: '#2dd4bf', fontSize: 26 }} />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#2dd4bf' }}>
                🧪 Recommended Fertilizer Dosage & Application Schedule
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Rule-based NPK deficit correction plan for {crop.name || name}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 16 }}>
            {(crop.fertilizerPlan.schedule || []).map((item, idx) => (
              <div key={idx} style={{ background: 'rgba(11, 18, 16, 0.6)', padding: 16, borderRadius: 12, border: '1px solid rgba(20, 184, 166, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{item.fertilizer}</strong>
                  <span style={{ background: 'rgba(20, 184, 166, 0.2)', color: '#2dd4bf', padding: '2px 8px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 800 }}>
                    {item.quantityKgPerAcre} kg/acre
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>⏱ {item.timing}</p>
              </div>
            ))}
          </div>

          {crop.fertilizerPlan.phCorrection && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.8rem', color: '#f59e0b' }}>
              💡 <strong>pH Correction Advice:</strong> {crop.fertilizerPlan.phCorrection}
            </div>
          )}
        </div>
      )}

      {/* 2-Column Section: Soil/Weather Match & Price Trend */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: 20, marginBottom: 24
      }}>
        {/* Soil & Weather Match Card */}
        <div className="glass-card fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, color: '#2dd4bf' }}>
            🧪 Environmental Compatibility
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Soil Compatibility</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2dd4bf' }}>{crop.soilMatch || 85}%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(11, 18, 16, 0.6)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4, width: `${crop.soilMatch || 85}%`,
                  background: 'linear-gradient(90deg, #0f766e, #2dd4bf)'
                }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Climate & Weather Match</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0284c7' }}>{crop.weatherMatch || 80}%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(11, 18, 16, 0.6)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4, width: `${crop.weatherMatch || 80}%`,
                  background: 'linear-gradient(90deg, #0284c7, #38bdf8)'
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Price Trend Chart */}
        <div className="glass-card fade-in" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#2dd4bf' }}>
              📈 30-Day Mandi Price Trend
            </h3>
            <span style={{ color: trendColor, fontWeight: 800, fontSize: '0.85rem', background: 'rgba(11, 18, 16, 0.5)', padding: '4px 10px', borderRadius: 8, border: `1px solid ${trendColor}40` }}>
              {trendEmoji} {trend}
            </span>
          </div>

          {priceHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(20, 184, 166, 0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={6} />
                <YAxis domain={['dataMin - 50', 'dataMax + 50']} tick={{ fontSize: 10, fill: '#94a3b8' }} width={55} />
                <Tooltip
                  contentStyle={{ background: '#12201c', border: '1px solid rgba(20, 184, 166, 0.3)', borderRadius: 10, fontSize: '0.8rem' }}
                  labelStyle={{ color: '#2dd4bf', fontWeight: 700 }}
                />
                <Line type="monotone" dataKey="price" stroke="#14b8a6" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              Price trend chart available when backend Mandi service is connected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
