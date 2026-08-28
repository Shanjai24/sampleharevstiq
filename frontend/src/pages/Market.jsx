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
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import RefreshIcon from '@mui/icons-material/Refresh';

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
  const district = farmData?.location?.district || '';

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

  const isLive = data?.prices && data.prices.length > 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#182420', margin: 0, letterSpacing: '-0.02em' }}>
              Mandi Market Intelligence
            </h1>
            {isLive ? (
              <span className="badge-live">
                <span className="badge-live-dot" />
                LIVE APMC MANDI RATES
              </span>
            ) : (
              <span className="badge-estimated">
                ⚡ ESTIMATED APMC BENCHMARK
              </span>
            )}
          </div>
          <p style={{ color: '#485954', fontSize: '0.88rem', margin: 0 }}>
            Daily arrival prices & 30-day commodity trends across {district ? `${district}, ` : ''}{state} mandis
          </p>
        </div>

        {/* Crop Select Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 220 }}>
            <FormControl fullWidth size="small">
              <Select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                sx={{
                  background: '#FFFFFF', color: '#182420',
                  borderRadius: '10px', fontWeight: 700,
                  fontSize: '0.88rem',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E2D8' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CECBC0' }
                }}
              >
                {cropOptions.map(c => (
                  <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.86rem' }}>
                    🌾 {c.charAt(0).toUpperCase() + c.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          <button
            onClick={fetchPrices}
            className="btn-secondary"
            style={{ padding: '8px 12px', minHeight: 38 }}
            title="Refresh prices"
          >
            <RefreshIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '14px 20px', borderRadius: 12,
          background: '#FDF3F0', border: '1px solid #F7D0C4',
          color: '#C85A32', fontSize: '0.86rem', marginBottom: 24
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
            <div className="skeleton" style={{ height: 140 }} />
            <div className="skeleton" style={{ height: 140 }} />
          </div>
          <div className="skeleton" style={{ height: 260 }} />
        </div>
      ) : data ? (
        <>
          {/* Top Banner Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 18,
            marginBottom: 24
          }}>
            {/* Recommended Best Mandi Highlight */}
            {data.bestMandi && (
              <div className="hero-card-top-crop fade-in" style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: '#EBF5ED',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <StoreIcon sx={{ color: '#1E5E3A', fontSize: 18 }} />
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#1E5E3A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Highest Price Mandi
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 800, background: '#EBF5ED',
                    color: '#1E5E3A', padding: '3px 8px', borderRadius: 20
                  }}>
                    TOP REALIZATION
                  </span>
                </div>

                <h3 style={{ fontWeight: 800, fontSize: '1.35rem', margin: '4px 0 8px', color: '#182420' }}>
                  🏪 {data.bestMandi.market} APMC
                </h3>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontWeight: 800, color: '#1E5E3A', fontSize: '1.85rem', lineHeight: 1 }}>
                    ₹{data.bestMandi.modalPrice?.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#748782', fontWeight: 600 }}>/ quintal (Modal)</span>
                </div>
              </div>
            )}

            {/* Price Trend Summary */}
            <div className="glass-card fade-in fade-in-delay-1" style={{
              padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: '#FFF8E7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <TrendingUpIcon sx={{ color: '#D97706', fontSize: 18 }} />
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#485954', fontWeight: 700 }}>
                    Market Momentum & Strategy
                  </span>
                </div>
                <span className={data.trend === 'UP' ? 'badge-fit-strong' : 'badge-fit-moderate'} style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                  {data.trend === 'UP' ? 'Bullish Trend' : 'Stable Rate'}
                </span>
              </div>

              <div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: data.trend === 'UP' ? '#1E5E3A' : '#D97706', margin: '2px 0 4px' }}>
                  {data.trend === 'UP' ? '📈 Rising Demand Momentum' : '➡️ Steady Market Price Range'}
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#485954', margin: 0, lineHeight: 1.5 }}>
                  {data.trend === 'UP'
                    ? 'Arrivals are tightening while wholesale demand remains strong. Favorable window to sell high-grade lots.'
                    : 'Prices are holding steady across regional mandis. Safe to sell regularly or hold dry produce.'}
                </p>
              </div>
            </div>
          </div>

          {/* Main Grid: Price Table & Trend Chart */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 20,
            marginBottom: 24
          }}>
            {/* Price Table Card */}
            <div className="glass-card fade-in fade-in-delay-2" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AccountBalanceIcon sx={{ color: '#1E5E3A', fontSize: 20 }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                    Nearest Mandi Price Spread
                  </h3>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#748782' }}>
                  {crop.toUpperCase()} Rates
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E2D8' }}>
                      <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: '0.75rem', color: '#748782', fontWeight: 700 }}>Mandi Market</th>
                      <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '0.75rem', color: '#748782', fontWeight: 700 }}>Min ₹</th>
                      <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '0.75rem', color: '#748782', fontWeight: 700 }}>Max ₹</th>
                      <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '0.75rem', color: '#748782', fontWeight: 700 }}>Modal Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.prices || []).map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F0EEE6' }}>
                        <td style={{ padding: '12px 8px', fontSize: '0.86rem', fontWeight: 700, color: '#182420' }}>
                          {p.market}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '0.84rem', color: '#485954' }}>
                          ₹{p.minPrice?.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '0.84rem', color: '#485954' }}>
                          ₹{p.maxPrice?.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '0.92rem', fontWeight: 800, color: '#C85A32' }}>
                          ₹{p.modalPrice?.toLocaleString()}<span style={{ fontSize: '0.7rem', color: '#748782', fontWeight: 500 }}>/q</span>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShowChartIcon sx={{ color: '#C85A32', fontSize: 20 }} />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                      30-Day Mandi Price Trend
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#748782' }}>₹ / Quintal</span>
                </div>

                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAE7DC" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#748782' }} interval={5} />
                    <YAxis domain={['dataMin - 50', 'dataMax + 50']} tick={{ fontSize: 10, fill: '#748782' }} width={50} />
                    <Tooltip
                      contentStyle={{
                        background: '#FFFFFF', border: '1px solid #E5E2D8',
                        borderRadius: 10, fontSize: '0.82rem', boxShadow: 'var(--shadow-card)'
                      }}
                      labelStyle={{ color: '#1E5E3A', fontWeight: 700 }}
                    />
                    <Line type="monotone" dataKey="price" stroke="#C85A32" strokeWidth={2.8} dot={false} activeDot={{ r: 5, fill: '#C85A32' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      ) : (
        <p style={{ color: '#748782', textAlign: 'center', marginTop: 60 }}>No mandi price data available</p>
      )}
    </div>
  );
}
