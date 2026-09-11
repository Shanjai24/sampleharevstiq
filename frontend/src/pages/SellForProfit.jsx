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
import CallIcon from '@mui/icons-material/Call';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PlaceIcon from '@mui/icons-material/Place';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

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

  // Storage/transport directory — separate from buyers, fetched once
  // (not crop/state-dependent, since it's national institutional data)
  const [storageData, setStorageData] = useState(null);
  const [storageLoading, setStorageLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/storage/directory`);
        if (!cancelled) setStorageData(res.data);
      } catch (e) {
        console.error('Error fetching storage directory:', e);
      } finally {
        if (!cancelled) setStorageLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                paddingTop: 12,
                borderTop: '1px solid #F0EFEA'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#748782', fontWeight: 600, display: 'block' }}>
                    📞 {buyer.contactInfo}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                    📍 {buyer.location}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(() => {
                    const phoneMatch = buyer.contactInfo?.match(/(\+?\d[\d\s-]{8,}\d)/);
                    const rawDigits = phoneMatch ? phoneMatch[1].replace(/[\s-]/g, '') : null;
                    const waNumber = rawDigits ? (rawDigits.startsWith('+') ? rawDigits.slice(1) : (rawDigits.length === 10 ? '91' + rawDigits : rawDigits)) : null;
                    const mapsQuery = encodeURIComponent(`${buyer.buyerName}, ${buyer.location}`);

                    return (
                      <>
                        {rawDigits && (
                          <a
                            href={`tel:${rawDigits}`}
                            className="btn-secondary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '6px 12px',
                              fontSize: '0.76rem',
                              textDecoration: 'none',
                              color: '#1E5E3A',
                              background: '#EBF5ED',
                              border: '1px solid #C6E4CF',
                              borderRadius: 8,
                              fontWeight: 700
                            }}
                          >
                            <CallIcon sx={{ fontSize: 14 }} />
                            Call
                          </a>
                        )}

                        {waNumber && (
                          <a
                            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello, I am inquiring from HarvestIQ regarding selling ${crop} produce (${buyerData?.totalYieldQuintals || 10} quintals). Please share your current buying rate and quality specs.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '6px 12px',
                              fontSize: '0.76rem',
                              textDecoration: 'none',
                              color: '#15803D',
                              background: '#DCFCE7',
                              border: '1px solid #86EFAC',
                              borderRadius: 8,
                              fontWeight: 700
                            }}
                          >
                            <WhatsAppIcon sx={{ fontSize: 14 }} />
                            WhatsApp
                          </a>
                        )}

                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 12px',
                            fontSize: '0.76rem',
                            textDecoration: 'none',
                            color: '#0369A1',
                            background: '#F0F9FF',
                            border: '1px solid #BAE6FD',
                            borderRadius: 8,
                            fontWeight: 700
                          }}
                        >
                          <PlaceIcon sx={{ fontSize: 14 }} />
                          Directions
                        </a>

                        {buyer.buyerType === 'msp' && (
                          <a
                            href="https://enam.gov.in"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '6px 12px',
                              fontSize: '0.76rem',
                              textDecoration: 'none',
                              color: '#475569',
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              borderRadius: 8,
                              fontWeight: 700
                            }}
                          >
                            <OpenInNewIcon sx={{ fontSize: 14 }} />
                            Portal
                          </a>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Storage & Transport — "sell now" is incomplete advice if the
          farmer can't get produce to market or store it if price dips.
          Only real, verifiable national institutions here — see the
          _notes field in storage_directory.json for why this does not
          list fabricated private business contacts. */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#182420', margin: '32px 0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <WarehouseIcon sx={{ color: '#0369A1', fontSize: 22 }} />
        Storage & Transport
      </h2>

      {storageLoading ? (
        <div style={{ textAlign: 'center', padding: 24, color: '#748782' }}>Loading storage options...</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
            {(storageData?.national || []).map((entry) => (
              <div key={entry.id} className="glass-card fade-in" style={{ padding: 18, background: '#FFFFFF', border: '1px solid #E5E2D8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#182420', margin: '0 0 4px' }}>
                      {entry.name}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#485954', margin: '0 0 6px', lineHeight: 1.5 }}>
                      {entry.description}
                    </p>
                    <span style={{ fontSize: '0.76rem', color: '#748782', fontWeight: 600 }}>
                      {entry.contactInfo}
                    </span>
                  </div>
                  <a
                    href={entry.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '6px 12px', fontSize: '0.76rem', textDecoration: 'none',
                      color: '#0369A1', background: '#F0F9FF', border: '1px solid #BAE6FD',
                      borderRadius: 8, fontWeight: 700, whiteSpace: 'nowrap'
                    }}
                  >
                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                    Official Site
                  </a>
                </div>
              </div>
            ))}
          </div>

          {storageData?.howToFindLocalTransport && (
            <div className="glass-card fade-in" style={{ padding: 18, background: '#F8F7F2', border: '1px solid #E5E2D8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <LocalShippingIcon sx={{ color: '#748782', fontSize: 20 }} />
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#182420' }}>Finding Local Transport</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#748782', margin: '0 0 8px' }}>
                {storageData.howToFindLocalTransport.note}
              </p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {storageData.howToFindLocalTransport.steps.map((step, i) => (
                  <li key={i} style={{ fontSize: '0.8rem', color: '#485954', marginBottom: 4, lineHeight: 1.5 }}>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}