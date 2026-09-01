import { useState, useContext, useEffect } from 'react';
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
      <div className="fade-in mb-[22px] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
            <h1 className="m-0 text-[1.85rem] font-extrabold tracking-tight text-text-primary">
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
          <p className="m-0 text-[0.88rem] text-text-secondary">
            Daily arrival prices & 30-day commodity trends across {district ? `${district}, ` : ''}{state} mandis
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-[220px]">
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
            className="btn-secondary min-h-[38px] px-3 py-2"
            title="Refresh prices"
            type="button"
          >
            <RefreshIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-accent-border bg-accent-soft px-5 py-3.5 text-[0.86rem] text-accent">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-[18px]">
            <div className="skeleton h-[140px]" />
            <div className="skeleton h-[140px]" />
          </div>
          <div className="skeleton h-[260px]" />
        </div>
      ) : data ? (
        <>
          <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-[18px]">
            {data.bestMandi && (
              <div className="hero-card-top-crop fade-in px-6 py-[22px]">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft">
                      <StoreIcon sx={{ color: '#1E5E3A', fontSize: 18 }} />
                    </div>
                    <span className="text-xs font-extrabold tracking-wide text-primary uppercase">
                      Highest Price Mandi
                    </span>
                  </div>
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[0.7rem] font-extrabold text-primary">
                    TOP REALIZATION
                  </span>
                </div>

                <h3 className="my-1 text-[1.35rem] font-extrabold text-text-primary">
                  🏪 {data.bestMandi.market} APMC
                </h3>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-[1.85rem] leading-none font-extrabold text-primary">
                    ₹{data.bestMandi.modalPrice?.toLocaleString()}
                  </span>
                  <span className="text-[0.82rem] font-semibold text-text-muted">/ quintal (Modal)</span>
                </div>
              </div>
            )}

            <div className="glass-card fade-in fade-in-delay-1 flex flex-col justify-between px-6 py-[22px]">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF8E7]">
                    <TrendingUpIcon sx={{ color: '#D97706', fontSize: 18 }} />
                  </div>
                  <span className="text-xs font-bold text-text-secondary">
                    Market Momentum & Strategy
                  </span>
                </div>
                <span className={`${data.trend === 'UP' ? 'badge-fit-strong' : 'badge-fit-moderate'} px-2 py-0.5 text-[0.7rem]`}>
                  {data.trend === 'UP' ? 'Bullish Trend' : 'Stable Rate'}
                </span>
              </div>

              <div>
                <h4 className={`my-0.5 text-[1.15rem] font-extrabold ${data.trend === 'UP' ? 'text-primary' : 'text-risk-moderate'}`}>
                  {data.trend === 'UP' ? '📈 Rising Demand Momentum' : '➡️ Steady Market Price Range'}
                </h4>
                <p className="m-0 text-[0.82rem] leading-normal text-text-secondary">
                  {data.trend === 'UP'
                    ? 'Arrivals are tightening while wholesale demand remains strong. Favorable window to sell high-grade lots.'
                    : 'Prices are holding steady across regional mandis. Safe to sell regularly or hold dry produce.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-5">
            <div className="glass-card fade-in fade-in-delay-2 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AccountBalanceIcon sx={{ color: '#1E5E3A', fontSize: 20 }} />
                  <h3 className="m-0 text-[1.05rem] font-extrabold text-text-primary">
                    Nearest Mandi Price Spread
                  </h3>
                </div>
                <span className="text-xs text-text-muted">
                  {crop.toUpperCase()} Rates
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="px-2 py-2.5 text-left text-xs font-bold text-text-muted">Mandi Market</th>
                      <th className="px-2 py-2.5 text-right text-xs font-bold text-text-muted">Min ₹</th>
                      <th className="px-2 py-2.5 text-right text-xs font-bold text-text-muted">Max ₹</th>
                      <th className="px-2 py-2.5 text-right text-xs font-bold text-text-muted">Modal Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.prices || []).map((p, i) => (
                      <tr key={i} className="border-b border-[#F0EEE6]">
                        <td className="px-2 py-3 text-[0.86rem] font-bold text-text-primary">
                          {p.market}
                        </td>
                        <td className="px-2 py-3 text-right text-sm text-text-secondary">
                          ₹{p.minPrice?.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-right text-sm text-text-secondary">
                          ₹{p.maxPrice?.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-right text-[0.92rem] font-extrabold text-accent">
                          ₹{p.modalPrice?.toLocaleString()}<span className="text-[0.7rem] font-medium text-text-muted">/q</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {data.history && data.history.length > 0 && (
              <div className="glass-card fade-in fade-in-delay-3 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShowChartIcon sx={{ color: '#C85A32', fontSize: 20 }} />
                    <h3 className="m-0 text-[1.05rem] font-extrabold text-text-primary">
                      30-Day Mandi Price Trend
                    </h3>
                  </div>
                  <span className="text-xs text-text-muted">₹ / Quintal</span>
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
        <p className="mt-[60px] text-center text-text-muted">No mandi price data available</p>
      )}
    </div>
  );
}
