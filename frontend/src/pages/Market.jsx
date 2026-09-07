import { useState, useContext, useEffect, useCallback } from 'react';
import { FarmContext } from '../context/FarmContext';
import { getMarketPrices } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StoreIcon from '@mui/icons-material/Store';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Badge, Card, EmptyState, ErrorBanner, SkeletonBlock } from '../components/ui';

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

  const fetchPrices = useCallback(() => {
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
  }, [state, crop]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPrices();
  }, [fetchPrices]);

  const isLive = data?.prices && data.prices.length > 0;

  return (
    <div className="page-container">
      <div className="fade-in mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[1.85rem] font-extrabold tracking-tight text-text-primary">
              Mandi Market Intelligence
            </h1>
            {isLive ? (
              <Badge variant="live" className="whitespace-nowrap">LIVE APMC MANDI RATES</Badge>
            ) : (
              <Badge variant="estimated" className="whitespace-nowrap">⚡ ESTIMATED APMC BENCHMARK</Badge>
            )}
          </div>
          <p className="m-0 text-[0.88rem] text-text-secondary">
            Daily arrival prices & 30-day commodity trends across {district ? `${district}, ` : ''}{state} mandis
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
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
            className="btn-secondary flex h-[38px] w-[38px] items-center justify-center p-0"
            title="Refresh prices"
            type="button"
          >
            <RefreshIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      <ErrorBanner className="mb-6">{error}</ErrorBanner>

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
            <SkeletonBlock height={140} />
            <SkeletonBlock height={140} />
          </div>
          <SkeletonBlock height={260} />
        </div>
      ) : data ? (
        <>
          <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-stretch gap-5">
            {data.bestMandi && (
              <Card
                variant="hero"
                className="fade-in relative flex flex-col justify-between px-7 py-6"
                style={{ background: 'linear-gradient(135deg, #EBF5ED 0%, #FFFFFF 100%)' }}
              >
                <span className="absolute right-5 top-5 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-[0.68rem] font-extrabold leading-none text-white shadow-sm">
                  TOP REALIZATION
                </span>

                <div className="mb-4 flex items-center gap-3 pr-32">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft shadow-sm">
                    <StoreIcon sx={{ color: '#1E5E3A', fontSize: 22 }} />
                  </div>
                  <div>
                    <span className="block text-xs font-extrabold uppercase tracking-wide text-primary">
                      Highest Price Mandi
                    </span>
                    <span className="text-[0.74rem] font-medium text-text-muted">
                      Top regional realization
                    </span>
                  </div>
                </div>

                <h3 className="my-2 text-[1.45rem] font-extrabold tracking-tight text-text-primary">
                  🏪 {data.bestMandi.market} APMC
                </h3>

                <div className="flex items-baseline gap-2">
                  <span className="text-[2rem] font-extrabold leading-none text-primary">
                    ₹{data.bestMandi.modalPrice?.toLocaleString()}
                  </span>
                  <span className="text-[0.86rem] font-semibold text-text-muted">/ quintal (Modal)</span>
                </div>
              </Card>
            )}

            <Card className="fade-in fade-in-delay-1 flex flex-col justify-between px-7 py-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#FFF8E7] shadow-sm">
                    <TrendingUpIcon sx={{ color: '#D97706', fontSize: 22 }} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase text-text-secondary">
                      Market Momentum
                    </span>
                    <span className="text-[0.74rem] font-medium text-text-muted">
                      Price trend analysis
                    </span>
                  </div>
                </div>
                <Badge
                  variant={data.trend === 'UP' ? 'fit-strong' : 'fit-moderate'}
                  className="flex-shrink-0 whitespace-nowrap px-3 py-1 text-[0.7rem]"
                >
                  {data.trend === 'UP' ? 'Bullish Trend' : 'Stable Rate'}
                </Badge>
              </div>

              <div>
                <h4 className={`my-1 text-[1.25rem] font-extrabold ${data.trend === 'UP' ? 'text-primary' : 'text-risk-moderate'}`}>
                  {data.trend === 'UP' ? '📈 Rising Demand Momentum' : '➡️ Steady Market Price Range'}
                </h4>
                <p className="m-0 text-[0.86rem] leading-relaxed text-text-secondary">
                  {data.trend === 'UP'
                    ? 'Arrivals are tightening while wholesale demand remains strong. Favorable window to sell high-grade lots.'
                    : 'Prices are holding steady across regional mandis. Safe to sell regularly or hold dry produce.'}
                </p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] items-stretch gap-5">
            <Card className="fade-in fade-in-delay-2 flex flex-col p-7">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft shadow-sm">
                    <AccountBalanceIcon sx={{ color: '#1E5E3A', fontSize: 22 }} />
                  </div>
                  <div>
                    <h3 className="m-0 text-[1.15rem] font-extrabold text-text-primary">
                      Nearest Mandi Price Spread
                    </h3>
                    <span className="text-[0.74rem] font-medium text-text-muted">
                      Regional APMC comparison
                    </span>
                  </div>
                </div>
                <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-primary-soft px-3 py-1 text-[0.72rem] font-extrabold text-primary">
                  {crop.toUpperCase()}
                </span>
              </div>

              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-text-muted">Mandi Market</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-text-muted">Min ₹</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-text-muted">Max ₹</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-text-muted">Modal Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.prices || []).map((p, i) => (
                      <tr key={i} className="border-b border-[#F0EEE6] transition-colors last:border-b-0 hover:bg-[#F8F7F2]">
                        <td className="px-3 py-4 text-[0.9rem] font-bold text-text-primary">
                          {p.market}
                        </td>
                        <td className="px-3 py-4 text-right align-middle text-sm text-text-secondary">
                          ₹{p.minPrice?.toLocaleString()}
                        </td>
                        <td className="px-3 py-4 text-right align-middle text-sm text-text-secondary">
                          ₹{p.maxPrice?.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right align-middle text-[0.96rem] font-extrabold text-accent">
                          ₹{p.modalPrice?.toLocaleString()}<span className="ml-0.5 text-[0.72rem] font-medium text-text-muted">/q</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {data.history && data.history.length > 0 && (
              <div className="glass-card fade-in fade-in-delay-3 flex flex-col p-7">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#FDF3F0] shadow-sm">
                      <ShowChartIcon sx={{ color: '#C85A32', fontSize: 22 }} />
                    </div>
                    <div>
                      <h3 className="m-0 text-[1.15rem] font-extrabold text-text-primary">
                        30-Day Mandi Price Trend
                      </h3>
                      <span className="text-[0.74rem] font-medium text-text-muted">
                        Historical price movement
                      </span>
                    </div>
                  </div>
                  <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-[#FDF3F0] px-3 py-1 text-[0.72rem] font-extrabold text-accent">
                    ₹ / Quintal
                  </span>
                </div>

                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={data.history} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="marketPriceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C85A32" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#C85A32" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAE7DC" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#748782', fontWeight: 500 }}
                      interval="preserveStartEnd"
                      minTickGap={30}
                      axisLine={{ stroke: '#E5E2D8' }}
                      tickLine={{ stroke: '#E5E2D8' }}
                    />
                    <YAxis
                      domain={['dataMin - 50', 'dataMax + 50']}
                      tick={{ fontSize: 11, fill: '#748782', fontWeight: 500 }}
                      width={55}
                      axisLine={{ stroke: '#E5E2D8' }}
                      tickLine={{ stroke: '#E5E2D8' }}
                    />
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
                    <Area type="monotone" dataKey="price" stroke="#C85A32" strokeWidth={2.5} fillOpacity={1} fill="url(#marketPriceGradient)" />
                  </AreaChart>
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
