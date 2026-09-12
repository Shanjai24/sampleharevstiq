import { useState, useEffect, useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../context/FarmContext';
import { getMarketPrices } from '../services/api';
import { saveToCache, readFromCache, timeAgo } from '../utils/offlineCache';
import SkeletonBlock from '../components/ui/SkeletonBlock';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StoreIcon from '@mui/icons-material/Store';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import RefreshIcon from '@mui/icons-material/Refresh';

const COMMODITIES = [
  { id: 'rice', label: 'Rice', icon: '🌾' },
  { id: 'wheat', label: 'Wheat', icon: '🌿' },
  { id: 'maize', label: 'Maize', icon: '🌽' },
  { id: 'cotton', label: 'Cotton', icon: '☁️' },
  { id: 'sugarcane', label: 'Sugarcane', icon: '🎋' },
  { id: 'tomato', label: 'Tomato', icon: '🍅' },
  { id: 'onion', label: 'Onion', icon: '🧅' },
  { id: 'potato', label: 'Potato', icon: '🥔' },
  { id: 'chilli', label: 'Chilli', icon: '🌶️' },
  { id: 'turmeric', label: 'Turmeric', icon: '💛' }
];

export default function Market() {
  const { farmData } = useContext(FarmContext);
  const { t } = useTranslation();
  const [crop, setCrop] = useState('rice');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState(null);

  const state = farmData?.location?.state || 'Tamil Nadu';
  const district = farmData?.location?.district || 'Erode';

  const fetchPrices = useCallback(async () => {
    const cacheKey = `market_${state}_${crop}`;
    setLoading(true);
    try {
      const res = await getMarketPrices(state, crop, district);
      setData(res);
      setIsOffline(false);
      saveToCache(cacheKey, res);
    } catch {
      const cached = readFromCache(cacheKey);
      if (cached) {
        setData(cached.data);
        setIsOffline(true);
        setCachedAt(cached.cachedAt);
      } else {
        setData(null);
        setIsOffline(false);
      }
    } finally {
      setLoading(false);
    }
  }, [state, crop, district]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const currentCommodity = COMMODITIES.find(c => c.id === crop) || COMMODITIES[0];

  return (
    <div className="page-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
              Mandi Market Intelligence
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '9999px',
              backgroundColor: data?.source === 'live' ? '#EBF5ED' : '#FFF8E7',
              border: `1px solid ${data?.source === 'live' ? '#C6E4CF' : '#FCE4B6'}`,
              padding: '4px 12px',
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: data?.source === 'live' ? '#1E5E3A' : '#D97706',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: data?.source === 'live' ? '#1E5E3A' : '#D97706'
              }} />
              {data?.source === 'live' ? 'LIVE AGMARKNET FEED' : 'CURATED MANDI BENCHMARK (SAMPLE)'}
            </span>
          </div>
          {/* Offline fallback badge — distinct from the LIVE/SAMPLE badge
              above. That badge describes the DATA SOURCE; this one
              describes whether the CURRENT fetch succeeded or is showing
              a cached copy because the network call just failed. */}
          {isOffline && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8,
              padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, color: '#92400E',
              marginTop: 4
            }}>
              <span>📡 Offline — showing prices from {timeAgo(cachedAt)}</span>
              <button
                onClick={fetchPrices}
                style={{ background: 'none', border: 'none', color: '#92400E', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700 }}
              >
                Retry
              </button>
            </div>
          )}
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748B', fontWeight: 400 }}>
            {data?.source === 'live'
              ? `Live daily arrivals from Agmarknet API across ${district ? `${district}, ` : ''}${state}`
              : `Curated seasonal baseline prices. (Set DATA_GOV_API_KEY in .env for live data.gov.in Agmarknet feed)`}
          </p>
        </div>

        {/* Commodity Selector & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            height: '42px',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            padding: '0 14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            minWidth: '150px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{currentCommodity.icon}</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827' }}>{currentCommodity.label}</span>
            </div>
            <svg style={{ width: '16px', height: '16px', color: '#64748B', marginLeft: '12px', flexShrink: 0, pointerEvents: 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
            <select
              value={crop}
              onChange={e => setCrop(e.target.value)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                cursor: 'pointer',
                opacity: 0
              }}
              aria-label="Select commodity"
            >
              {COMMODITIES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchPrices}
            style={{
              display: 'flex',
              width: '42px',
              height: '42px',
              flexShrink: 0,
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease'
            }}
            title="Refresh prices"
            type="button"
          >
            <RefreshIcon sx={{ fontSize: 20 }} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          <SkeletonBlock height={450} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <SkeletonBlock height={140} />
            <SkeletonBlock height={290} />
          </div>
        </div>
      ) : data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', alignItems: 'start' }}>
          {/* Left Column: Unified Outer Card */}
          <div style={{
            minWidth: 0,
            borderRadius: '16px',
            border: '1px solid #E5EAE5',
            backgroundColor: '#FFFFFF',
            padding: '24px',
            boxShadow: '0 4px 20px -2px rgba(24, 36, 32, 0.05), 0 1px 3px rgba(24, 36, 32, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Inner Hero: Highest Price Mandi */}
            {data.bestMandi && (
              <div style={{
                borderRadius: '16px',
                backgroundColor: '#EEF8F1',
                padding: '20px',
                border: '1px solid rgba(212, 234, 217, 0.8)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      flexShrink: 0
                    }}>
                      <StoreIcon sx={{ color: '#1E5E3A', fontSize: 22 }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1E5E3A' }}>
                        HIGHEST PRICE MANDI
                      </span>
                      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}>
                        Top regional realization
                      </span>
                    </div>
                  </div>
                  <span style={{
                    backgroundColor: '#1E5E3A',
                    color: '#FFFFFF',
                    borderRadius: '9999px',
                    padding: '4px 14px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    flexShrink: 0
                  }}>
                    TOP REALIZATION
                  </span>
                </div>

                <div style={{ marginTop: '14px', marginBottom: '8px', fontSize: '1.35rem', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏪</span>
                  <span>{data.bestMandi.market} APMC</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '2.1rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#1E5E3A', lineHeight: 1 }}>
                    ₹{data.bestMandi.modalPrice?.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>/ quintal (Modal)</span>
                </div>
              </div>
            )}

            {/* Nearest Mandi Price Spread Table */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: '#EEF8F1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <AccountBalanceIcon sx={{ color: '#1E5E3A', fontSize: 22 }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>
                      Nearest Mandi Price Spread
                    </h3>
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}>
                      Regional APMC comparison
                    </span>
                  </div>
                </div>
                <span style={{
                  backgroundColor: '#EEF8F1',
                  color: '#1E5E3A',
                  borderRadius: '9999px',
                  padding: '4px 14px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  border: '1px solid #D4EAD9',
                  flexShrink: 0
                }}>
                  {crop.toUpperCase()}
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ paddingBottom: '12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>
                        MANDI MARKET
                      </th>
                      <th style={{ paddingBottom: '12px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>
                        MIN ₹
                      </th>
                      <th style={{ paddingBottom: '12px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>
                        MAX ₹
                      </th>
                      <th style={{ paddingBottom: '12px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>
                        MODAL RATE
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.prices || []).map((p, i) => (
                      <tr key={i} style={{ borderBottom: i === data.prices.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 0', fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>
                          {p.market}
                        </td>
                        <td style={{ padding: '14px 0', textAlign: 'right', fontSize: '0.88rem', fontWeight: 500, color: '#475569' }}>
                          ₹{p.minPrice?.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 0', textAlign: 'right', fontSize: '0.88rem', fontWeight: 500, color: '#475569' }}>
                          ₹{p.maxPrice?.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 0', textAlign: 'right', fontSize: '0.92rem', fontWeight: 800, color: '#D9531E', whiteSpace: 'nowrap' }}>
                          ₹{p.modalPrice?.toLocaleString()}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B', marginLeft: '2px' }}>/q</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Two Cards */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Card 1: Market Momentum */}
            <div style={{
              borderRadius: '16px',
              border: '1px solid #E5EAE5',
              backgroundColor: '#FFFFFF',
              padding: '24px',
              boxShadow: '0 4px 20px -2px rgba(24, 36, 32, 0.05), 0 1px 3px rgba(24, 36, 32, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: '#FFF5EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <TrendingUpIcon sx={{ color: '#D97706', fontSize: 22 }} />
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1E293B' }}>
                      MARKET MOMENTUM
                    </span>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}>
                      Price trend analysis
                    </span>
                  </div>
                </div>
                <span style={{
                  backgroundColor: '#FDF4EC',
                  color: '#B45309',
                  borderRadius: '9999px',
                  padding: '4px 14px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  border: '1px solid #FED7AA',
                  flexShrink: 0
                }}>
                  {data.trend === 'UP' ? 'Bullish Trend' : 'Stable Rate'}
                </span>
              </div>

              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0
                  }}>
                    <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>
                    Steady Market Price Range
                  </h4>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.78rem', fontWeight: 500, lineHeight: 1.6, color: '#64748B' }}>
                  Prices are holding steady across regional mandis. Safe to sell regularly or hold dry produce.
                </p>
              </div>
            </div>

            {/* Card 2: 30-Day Mandi Price Trend */}
            <div style={{
              borderRadius: '16px',
              border: '1px solid #E5EAE5',
              backgroundColor: '#FFFFFF',
              padding: '24px',
              boxShadow: '0 4px 20px -2px rgba(24, 36, 32, 0.05), 0 1px 3px rgba(24, 36, 32, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              flex: 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: '#FFF2EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <ShowChartIcon sx={{ color: '#D9531E', fontSize: 22 }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>
                      30-Day Mandi Price Trend
                    </h3>
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}>
                      Historical price movement
                    </span>
                  </div>
                </div>
                <span style={{
                  backgroundColor: '#FFF2EB',
                  color: '#D9531E',
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  border: '1px solid #FECACA',
                  flexShrink: 0
                }}>
                  ₹ / Quintal
                </span>
              </div>

              <div style={{ width: '100%', flex: 1, minHeight: '260px', paddingTop: '8px', minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.history || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="marketPriceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D9531E" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#D9531E" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}
                      interval="preserveStartEnd"
                      minTickGap={30}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={{ stroke: '#E2E8F0' }}
                    />
                    <YAxis
                      domain={['dataMin - 30', 'dataMax + 30']}
                      tick={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}
                      width={46}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={{ stroke: '#E2E8F0' }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 12,
                        fontSize: '0.82rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        padding: '8px 12px'
                      }}
                      labelStyle={{ color: '#1E5E3A', fontWeight: 700, marginBottom: 2 }}
                      itemStyle={{ color: '#111827', fontWeight: 600 }}
                      formatter={(value) => [`₹${value.toLocaleString()}`, 'Price']}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#D9531E"
                      strokeWidth={2.4}
                      fillOpacity={1}
                      fill="url(#marketPriceGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ marginTop: '48px', textAlign: 'center', color: '#64748B' }}>No mandi price data available</p>
      )}
    </div>
  );
}