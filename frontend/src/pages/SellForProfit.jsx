import { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FarmContext } from '../context/FarmContext';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import StoreIcon from '@mui/icons-material/Store';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VerifiedIcon from '@mui/icons-material/Verified';
import BusinessIcon from '@mui/icons-material/Business';
import InfoIcon from '@mui/icons-material/Info';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SellForProfit() {
  const { farmData, areaAcres } = useContext(FarmContext);
  const navigate = useNavigate();

  const selectedCrop = farmData?.crops?.[0]?.crop || 'rice';
  const selectedState = farmData?.location?.state || 'Tamil Nadu';
  const predictedYield = farmData?.crops?.[0]?.predictedYieldPerAcre || farmData?.crops?.[0]?.estimatedYieldPerAcre || 2.5;

  const [crop, setCrop] = useState(selectedCrop);
  // eslint-disable-next-line no-unused-vars
  const [stateName, setStateName] = useState(selectedState);
  const [buyerData, setBuyerData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBuyers = useCallback(async (c, s) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/market/buyers/${encodeURIComponent(c)}/${encodeURIComponent(s)}`, {
        params: { yieldPerAcre: predictedYield, areaAcres: areaAcres || 1.0 }
      });
      setBuyerData(res.data);
    } catch (e) {
      console.error('Error fetching buyers:', e);
    } finally {
      setLoading(false);
    }
  }, [predictedYield, areaAcres]);

  useEffect(() => {
    fetchBuyers(crop, stateName);
  }, [fetchBuyers, crop, stateName]);

  const cropList = farmData?.crops?.map(c => c.crop) || ['rice', 'cotton', 'groundnut', 'tomato', 'chilli'];

  return (
    <div className="page-container" style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <IconButton
          onClick={() => navigate(-1)}
          sx={{ color: '#1E5E3A', background: '#FFFFFF', border: '1px solid #E5E2D8' }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#182420', letterSpacing: '-0.02em' }}>
              💰 Sell For Profit — Buyer & Contract Linkage
            </h1>
            <span style={{ background: '#EBF5ED', color: '#1E5E3A', fontSize: '0.74rem', fontWeight: 800, padding: '3px 10px', borderRadius: 12, border: '1px solid #C6E4CF' }}>
              DIRECT BUYERS & MSP
            </span>
          </div>
          <p style={{ color: '#485954', fontSize: '0.86rem', margin: '2px 0 0' }}>
            Compare open Mandi wholesale rates against contract processors, exporters, FPOs, & government MSP procurement centers.
          </p>
        </div>
      </div>

      {/* MANDATORY DISCLAIMER BANNER */}
      <div style={{
        background: '#FFF8E7', border: '1.5px solid #FCE4B6', borderRadius: 12,
        padding: '12px 18px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: 'var(--shadow-subtle)'
      }}>
        <InfoIcon sx={{ color: '#D97706', fontSize: 24, flexShrink: 0 }} />
        <div>
          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#B45309', display: 'block' }}>
            IMPORTANT NOTICE & DISCLAIMER
          </span>
          <span style={{ fontSize: '0.78rem', color: '#485954', lineHeight: 1.4 }}>
            {buyerData?.disclaimer || "Illustrative directory — verify current rates and contracts directly before committing any produce."}
          </span>
        </div>
      </div>

      {/* Crop & State Selector Bar */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#182420' }}>Selected Crop:</span>
          <select
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #C6E4CF', fontWeight: 700, color: '#1E5E3A', background: '#FAF9F5', outline: 'none' }}
          >
            {cropList.map(c => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>

          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#182420' }}>State:</span>
          <select
            value={stateName}
            onChange={(e) => setStateName(e.target.value)}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #C6E4CF', fontWeight: 700, color: '#1E5E3A', background: '#FAF9F5', outline: 'none' }}
          >
            {['Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Punjab', 'Haryana', 'Gujarat', 'Madhya Pradesh', 'Uttar Pradesh', 'Rajasthan', 'Kerala'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.82rem', color: '#485954', fontWeight: 600 }}>
          Farm Plot: <strong>{areaAcres || 1.0} Acres</strong> • Est. Harvest: <strong>{buyerData?.totalYieldTons || (predictedYield * (areaAcres || 1.0)).toFixed(1)} Tons ({buyerData?.totalYieldQuintals || ((predictedYield * (areaAcres || 1.0)) * 10).toFixed(0)} quintals)</strong>
        </div>
      </div>

      {/* Mandi vs Buyer Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#748782' }}>Loading buyer options & profit comparison...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Baseline Mandi Card */}
          <div className="glass-card" style={{ padding: 24, borderLeft: '4px solid #C85A32', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#C85A32', background: '#FDF3F0', padding: '4px 10px', borderRadius: 12 }}>
                GROSS MANDI REVENUE COMPARISON
              </span>
              <StoreIcon sx={{ color: '#C85A32', fontSize: 22 }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#182420', margin: '0 0 6px' }}>
              Local APMC Wholesale Yard
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#748782', margin: '0 0 16px' }}>
              Standard open auction mandi modal price in {stateName}.
            </p>

            <div style={{ borderTop: '1px solid #F0EFEA', paddingTop: 14 }}>
              <span style={{ fontSize: '0.72rem', color: '#748782', display: 'block' }}>Mandi Modal Rate</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#C85A32' }}>
                ₹{buyerData?.mandiModalPrice?.toLocaleString() || '2,400'} <span style={{ fontSize: '0.8rem', color: '#748782' }}>/ quintal</span>
              </div>
              <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#485954', fontWeight: 700 }}>
                Gross Realization from Mandi: ₹{((buyerData?.mandiModalPrice || 2400) * (buyerData?.totalYieldQuintals || 25)).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Buyers & Contract Options */}
          {buyerData?.buyers?.map((buyer, idx) => (
            <div
              key={idx}
              className="glass-card fade-in"
              style={{
                padding: 24,
                borderLeft: buyer.buyerType === 'msp' ? '4px solid #1E5E3A' : '4px solid #0284c7',
                background: buyer.isProfitableVsMandi ? '#FAFDFB' : '#FFFFFF',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{
                  fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: 12,
                  background: buyer.buyerType === 'msp' ? '#EBF5ED' : '#F0F9FF',
                  color: buyer.buyerType === 'msp' ? '#1E5E3A' : '#0369a1',
                  border: buyer.buyerType === 'msp' ? '1px solid #C6E4CF' : '1px solid #BAE6FD'
                }}>
                  {buyer.buyerType === 'msp' ? '🏛️ GOVT MSP GUARANTEE' : buyer.buyerType === 'fpo' ? '👥 FPO AGGREGATOR' : buyer.buyerType === 'exporter' ? '🚢 EXPORT CONTRACT' : '🏭 PROCESSOR'}
                </span>
                {buyer.isProfitableVsMandi && (
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1E5E3A', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TrendingUpIcon sx={{ fontSize: 16 }} /> +₹{buyer.extraProfitVsMandi.toLocaleString()} Extra Net Advantage vs. Mandi
                  </span>
                )}
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#182420', margin: '0 0 4px' }}>
                {buyer.buyerName}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#748782', margin: '0 0 14px' }}>
                📍 {buyer.location} • Min Qty: {buyer.minimumQuantityQuintal} quintals
              </p>

              <div style={{ background: '#FFFFFF', padding: '12px 16px', borderRadius: 10, border: '1px solid #E5E2D8', marginBottom: 14 }}>
                <span style={{ fontSize: '0.72rem', color: '#748782', display: 'block' }}>Offered Direct Rate</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1E5E3A' }}>
                  ₹{buyer.pricePerQuintal?.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#748782' }}>/ quintal</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#182420', fontWeight: 700, marginTop: 4 }}>
                  Total Realization: ₹{buyer.buyerTotalRevenue?.toLocaleString()}
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#485954', lineHeight: 1.4, marginBottom: 14 }}>
                💡 <strong>Key Advantage:</strong> {buyer.benefits}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #F0EFEA' }}>
                <span style={{ fontSize: '0.75rem', color: '#748782', fontWeight: 600 }}>📞 {buyer.contactInfo}</span>
                <button
                  className="btn-primary"
                  onClick={() => alert(`Connect with ${buyer.buyerName}:\n${buyer.contactInfo}\nLocation: ${buyer.location}\n\nDisclaimer: Always verify current rates and moisture specifications directly before dispatching produce.`)}
                  style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                >
                  Contact Channel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
