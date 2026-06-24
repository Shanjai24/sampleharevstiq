import { useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import { getMarketPrices } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';

const cropOptions = [
  'rice', 'wheat', 'groundnut', 'cotton', 'sugarcane', 'maize',
  'soybean', 'tomato', 'onion', 'turmeric', 'chickpea', 'mustard'
];

export default function Market() {
  const { farmData } = useContext(FarmContext);
  const { t } = useTranslation();
  const [crop, setCrop] = useState('rice');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const state = farmData?.location?.state || 'Tamil Nadu';

  useEffect(() => {
    setLoading(true);
    getMarketPrices(state, crop)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [crop, state]);

  return (
    <div style={{ padding: '16px 16px 80px', maxWidth: 600, margin: '0 auto' }}>
      <h1 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16 }}>
        📈 {t('market.title')}
      </h1>

      {/* Crop Selector */}
      <FormControl fullWidth sx={{ marginBottom: 2 }}>
        <Select
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          sx={{
            background: 'rgba(20,30,24,0.85)', color: '#e8f5e9',
            borderRadius: 3, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(34,197,94,0.2)' }
          }}
        >
          {cropOptions.map(c => (
            <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 50 }} />)}
        </div>
      ) : data ? (
        <>
          {/* Best Mandi */}
          {data.bestMandi && (
            <div className="glass-card fade-in" style={{
              padding: 16, marginBottom: 12,
              background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)'
            }}>
              <p style={{ fontSize: '0.75rem', color: '#607d6c' }}>{t('market.bestMandi')}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>🏪 {data.bestMandi.market}</span>
                <span style={{ fontWeight: 800, color: '#22c55e', fontSize: '1.1rem' }}>
                  ₹{data.bestMandi.modalPrice?.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Price Table */}
          <div className="glass-card fade-in fade-in-delay-1" style={{ padding: 16, marginBottom: 12 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10, color: '#81c784' }}>
              {t('market.nearest')}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(34,197,94,0.15)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', fontSize: '0.7rem', color: '#607d6c' }}>Market</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontSize: '0.7rem', color: '#607d6c' }}>Min ₹</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontSize: '0.7rem', color: '#607d6c' }}>Max ₹</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontSize: '0.7rem', color: '#607d6c' }}>Modal ₹</th>
                </tr>
              </thead>
              <tbody>
                {(data.prices || []).map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(34,197,94,0.06)' }}>
                    <td style={{ padding: '10px 0', fontSize: '0.8rem', fontWeight: 500 }}>{p.market}</td>
                    <td style={{ textAlign: 'right', padding: '10px 0', fontSize: '0.8rem', color: '#a5d6a7' }}>
                      {p.minPrice?.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 0', fontSize: '0.8rem', color: '#a5d6a7' }}>
                      {p.maxPrice?.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 0', fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>
                      {p.modalPrice?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Price Trend Chart */}
          {data.history && data.history.length > 0 && (
            <div className="glass-card fade-in fade-in-delay-2" style={{ padding: 16 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: '#81c784' }}>
                {t('market.priceTrend')}
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,197,94,0.08)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#607d6c' }} interval={5} />
                  <YAxis tick={{ fontSize: 9, fill: '#607d6c' }} width={45} />
                  <Tooltip
                    contentStyle={{ background: '#111b15', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, fontSize: '0.75rem' }}
                    labelStyle={{ color: '#81c784' }}
                  />
                  <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : (
        <p style={{ color: '#607d6c', textAlign: 'center', marginTop: 40 }}>No market data available</p>
      )}
    </div>
  );
}
