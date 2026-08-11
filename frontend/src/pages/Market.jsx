import { useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import { getMarketPrices } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StoreIcon from '@mui/icons-material/Store';

const cropOptions = [
  'rice', 'wheat', 'groundnut', 'cotton', 'sugarcane', 'maize',
  'soybean', 'tomato', 'onion', 'turmeric', 'chickpea', 'mustard',
  'banana', 'millet', 'chilli'
];

export default function Market() {
  const { farmData } = useContext(FarmContext);
  const { t } = useTranslation();
  const [crop, setCrop] = useState('rice');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const state = farmData?.location?.state || 'Tamil Nadu';

  const fetchPrices = () => {
    setLoading(true);
    setError('');
    getMarketPrices(state, crop)
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to fetch Mandi price data. Please ensure backend services are online.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPrices();
  }, [crop, state]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
            📈 Mandi Market Intelligence
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>
            Real-time APMC Mandi rates & 30-day commodity price trends for {state}
          </p>
        </div>

        {/* Crop Select Menu */}
        <div style={{ width: 220 }}>
          <FormControl fullWidth size="small">
            <Select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              sx={{
                background: '#12201c', color: '#f8fafc',
                borderRadius: 2.5, fontWeight: 700,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(20,184,166,0.3)' }
              }}
            >
              {cropOptions.map(c => (
                <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
                  🌾 {c.charAt(0).toUpperCase() + c.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '14px 20px', borderRadius: 12,
          background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171', fontSize: '0.85rem', marginBottom: 24
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />)}
        </div>
      ) : data ? (
        <>
          {/* Top Banner Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
            {/* Best Mandi Highlight */}
            {data.bestMandi && (
              <div className="glass-card fade-in" style={{
                padding: 24, background: 'rgba(20, 184, 166, 0.08)', borderColor: 'rgba(20, 184, 166, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <StoreIcon sx={{ color: '#2dd4bf' }} />
                  <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700 }}>Recommended Mandi</span>
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1.25rem', margin: '4px 0 8px' }}>
                  🏪 {data.bestMandi.market}
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontWeight: 800, color: '#2dd4bf', fontSize: '1.6rem' }}>
                    ₹{data.bestMandi.modalPrice?.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>/ quintal</span>
                </div>
              </div>
            )}

            {/* Price Trend Summary */}
            <div className="glass-card fade-in fade-in-delay-1" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <TrendingUpIcon sx={{ color: '#f59e0b' }} />
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700 }}>Market Momentum</span>
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: data.trend === 'UP' ? '#10b981' : '#f59e0b', margin: 0 }}>
                  {data.trend === 'UP' ? '📈 Rising Demand Trend' : '➡️ Stable Market Conditions'}
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                  Calculated based on 30-day rolling price variance in nearest APMC mandis.
                </p>
              </div>
            </div>
          </div>

          {/* Main Grid: Price Table & Trend Chart */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
            {/* Price Table Card */}
            <div className="glass-card fade-in fade-in-delay-2" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, color: '#2dd4bf' }}>
                🏢 Nearest Mandi Rates ({crop.toUpperCase()})
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(20,184,166,0.2)' }}>
                      <th style={{ textAlign: 'left', padding: '10px 6px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Mandi Market</th>
                      <th style={{ textAlign: 'right', padding: '10px 6px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Min ₹</th>
                      <th style={{ textAlign: 'right', padding: '10px 6px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Max ₹</th>
                      <th style={{ textAlign: 'right', padding: '10px 6px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Modal ₹</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.prices || []).map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(20,184,166,0.08)' }}>
                        <td style={{ padding: '12px 6px', fontSize: '0.85rem', fontWeight: 600 }}>{p.market}</td>
                        <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                          ₹{p.minPrice?.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                          ₹{p.maxPrice?.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '0.9rem', fontWeight: 800, color: '#f59e0b' }}>
                          ₹{p.modalPrice?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Price Trend Chart Card */}
            {data.history && data.history.length > 0 && (
              <div className="glass-card fade-in fade-in-delay-3" style={{ padding: 24 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, color: '#2dd4bf' }}>
                  📊 30-Day Mandi Price Chart
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,184,166,0.1)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={5} />
                    <YAxis domain={['dataMin - 50', 'dataMax + 50']} tick={{ fontSize: 10, fill: '#94a3b8' }} width={55} />
                    <Tooltip
                      contentStyle={{ background: '#12201c', border: '1px solid rgba(20,184,166,0.3)', borderRadius: 10, fontSize: '0.8rem' }}
                      labelStyle={{ color: '#2dd4bf', fontWeight: 700 }}
                    />
                    <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      ) : (
        <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: 60 }}>No mandi price data available</p>
      )}
    </div>
  );
}
