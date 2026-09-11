import { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FarmContext } from '../context/FarmContext';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import SecurityIcon from '@mui/icons-material/Security';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import UpdateIcon from '@mui/icons-material/Update';
import { computePmfbyPremium, PMFBY_DISCLAIMER } from '../utils/insurance';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SchemesAndLoans() {
  const { farmData, areaAcres } = useContext(FarmContext);
  const navigate = useNavigate();
  const location = useLocation();

  const selectedCrop = farmData?.crops?.[0]?.crop || 'rice';
  const selectedState = farmData?.location?.state || 'Tamil Nadu';

  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showIneligible, setShowIneligible] = useState(false);

  const fetchSchemes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/schemes/eligible`, {
        params: { state: selectedState, areaAcres: areaAcres || 1.0, crop: selectedCrop }
      });
      setSchemes(res.data.schemes || []);
    } catch (e) {
      console.error('Error fetching schemes:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedState, areaAcres, selectedCrop]);

  useEffect(() => {
    fetchSchemes();
  }, [fetchSchemes]);

  // React Router does not auto-scroll to a #hash on navigation — this
  // handles the deep link from CropDetail.jsx's insurance nudge
  // (/schemes-loans#pmfby-insurance). Runs after schemes finish loading
  // so the target element actually exists in the DOM by then.
  useEffect(() => {
    if (!loading && location.hash) {
      const el = document.getElementById(location.hash.replace('#', ''));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, location.hash]);

  const currentArea = areaAcres || 1.0;
  const isSmallMarginal = currentArea <= 5.0;

  const kccLoanAmount = Math.round(currentArea * 24000);
  const dripCost = Math.round(currentArea * 45000);
  const dripSubsidy = Math.round(dripCost * (isSmallMarginal ? 0.55 : 0.45));
  // Single source of truth for the PMFBY premium math — see utils/insurance.js.
  // CropDetail.jsx's risk-based insurance nudge uses this exact same function.
  const { premiumPct: pmfbyPremiumPct, cropValue: pmfbyCropValue, premium: pmfbyPremium } =
    computePmfbyPremium(selectedCrop, currentArea);

  const eligibleSchemes = schemes.filter(s => s.eligible);
  const ineligibleSchemes = schemes.filter(s => !s.eligible);

  const StatusBadge = ({ status, eligible }) => {
    if (!eligible) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: '#FDF3F0', color: '#C85A32',
          fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px',
          borderRadius: 10, border: '1px solid #F7D0C4'
        }}>
          <CancelIcon sx={{ fontSize: 13 }} /> NOT ELIGIBLE
        </span>
      );
    }
    if (status?.includes('Conditionally')) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: '#FFF8E7', color: '#D97706',
          fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px',
          borderRadius: 10, border: '1px solid #FCE4B6'
        }}>
          <WarningAmberIcon sx={{ fontSize: 13 }} /> CONDITIONAL
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: '#EBF5ED', color: '#1E5E3A',
        fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px',
        borderRadius: 10, border: '1px solid #C6E4CF'
      }}>
        <CheckCircleIcon sx={{ fontSize: 13 }} /> ELIGIBLE
      </span>
    );
  };

  return (
    <div className="page-container" style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <IconButton
          onClick={() => navigate(-1)}
          sx={{ color: '#1E5E3A', background: '#FFFFFF', border: '1px solid #E5E2D8' }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#182420', letterSpacing: '-0.02em' }}>
              🏛️ Schemes, Loans, &amp; Financial Subsidies
            </h1>
            <span style={{
              background: '#EBF5ED', color: '#1E5E3A',
              fontSize: '0.74rem', fontWeight: 800, padding: '3px 10px',
              borderRadius: 12, border: '1px solid #C6E4CF'
            }}>
              {eligibleSchemes.length} ELIGIBLE SCHEMES
            </span>
          </div>
          <p style={{ color: '#485954', fontSize: '0.86rem', margin: '2px 0 0' }}>
            Filtered for: <strong>{selectedCrop.charAt(0).toUpperCase() + selectedCrop.slice(1)}</strong> crop &bull; <strong>{currentArea}</strong> acres &bull; <strong>{selectedState}</strong>
          </p>
        </div>
      </div>

      {/* ⚠️ Mandatory Indicative Disclaimer */}
      <div style={{
        background: '#FFF8E7', border: '1px solid #FCE4B6', borderRadius: 12,
        padding: '14px 18px', marginBottom: 22, display: 'flex', alignItems: 'flex-start', gap: 12
      }}>
        <InfoOutlinedIcon sx={{ color: '#D97706', fontSize: 22, flexShrink: 0, marginTop: 1 }} />
        <div>
          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#B45309', display: 'block', marginBottom: 3 }}>
            Indicative Eligibility — Official Verification Required
          </span>
          <p style={{ fontSize: '0.78rem', color: '#485954', margin: 0, lineHeight: 1.55 }}>
            Scheme eligibility shown here is determined by algorithmic rule-based screening based on your land size,
            crop type, and state. <strong>Official approval requires physical field visit and document verification
              at your nearest Block Agricultural Office / CSC / Gram Panchayat.</strong> Do not make any loan
            application, insurance enrollment, or subsidy deposit based solely on this screening result.
          </p>
        </div>
      </div>

      {/* Quick Rupee Benefit Calculations Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16, marginBottom: 28
      }}>
        {/* PMKSY Drip Subsidy */}
        <div className="glass-card fade-in" style={{ padding: 20, borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <WaterDropIcon sx={{ color: '#0284c7', fontSize: 20 }} />
            <span style={{ fontSize: '0.78rem', color: '#485954', fontWeight: 700 }}>Drip Irrigation Subsidy</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0284c7' }}>
            ₹{dripSubsidy.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#748782' }}>
            {isSmallMarginal ? '55% Subsidy (Small/Marginal)' : '45% Subsidy (Other Farmer)'} on ₹{dripCost.toLocaleString()}
          </span>
        </div>

        {/* KCC Loan Limit */}
        <div className="glass-card fade-in" style={{ padding: 20, borderLeft: '4px solid #1E5E3A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <AccountBalanceIcon sx={{ color: '#1E5E3A', fontSize: 20 }} />
            <span style={{ fontSize: '0.78rem', color: '#485954', fontWeight: 700 }}>Kisan Credit Card (KCC) Loan</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1E5E3A' }}>
            ₹{kccLoanAmount.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#748782' }}>
            Indicative crop credit limit at 4% p.a. effective rate
          </span>
        </div>

        {/* PM-KISAN Cash */}
        <div className="glass-card fade-in" style={{ padding: 20, borderLeft: '4px solid #D97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <MonetizationOnIcon sx={{ color: '#D97706', fontSize: 20 }} />
            <span style={{ fontSize: '0.78rem', color: '#485954', fontWeight: 700 }}>PM-KISAN Direct Cash</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#D97706' }}>
            ₹6,000 / year
          </div>
          <span style={{ fontSize: '0.74rem', color: '#748782' }}>
            3 installments of ₹2,000 each via DBT
          </span>
        </div>

        {/* PMFBY Insurance Premium */}
        <div id="pmfby-insurance" className="glass-card fade-in" style={{ padding: 20, borderLeft: '4px solid #C85A32', scrollMarginTop: 90 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <SecurityIcon sx={{ color: '#C85A32', fontSize: 20 }} />
            <span style={{ fontSize: '0.78rem', color: '#485954', fontWeight: 700 }}>PMFBY Crop Insurance</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C85A32' }}>
            ₹{pmfbyPremium.toLocaleString()} <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#748782' }}>premium ({pmfbyPremiumPct}%)</span>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#748782' }}>
            Coverage up to ₹{pmfbyCropValue.toLocaleString()} for {selectedCrop}
          </span>
        </div>
      </div>

      {/* Eligible Schemes List */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#182420', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        ✅ You May Qualify — Matched Schemes
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#748782' }}>Matching government scheme eligibility...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          {eligibleSchemes.map((scheme, idx) => (
            <div key={idx} className="glass-card fade-in" style={{ padding: 24, background: '#FFFFFF', border: '1px solid #E5E2D8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 800, color: '#1E5E3A',
                      background: '#EBF5ED', padding: '3px 10px', borderRadius: 10, border: '1px solid #C6E4CF'
                    }}>
                      {scheme.category}
                    </span>
                    <StatusBadge status={scheme.eligibilityStatus} eligible={scheme.eligible} />
                    {scheme.scope === 'state' && (
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 800, color: '#0284c7',
                        background: '#E0F2FE', padding: '3px 8px', borderRadius: 10, border: '1px solid #BAE6FD'
                      }}>
                        STATE SCHEME
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#182420', margin: '4px 0 2px' }}>
                    {scheme.title}
                  </h3>
                  {scheme.statusReason && (
                    <p style={{ fontSize: '0.76rem', color: '#1E5E3A', margin: '0 0 4px', fontStyle: 'italic' }}>
                      ✓ {scheme.statusReason}
                    </p>
                  )}
                </div>

                <a
                  href={scheme.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.82rem', textDecoration: 'none' }}
                >
                  <span>Apply via Official Portal</span>
                  <OpenInNewIcon sx={{ fontSize: 16 }} />
                </a>
              </div>

              <p style={{ fontSize: '0.86rem', color: '#485954', lineHeight: 1.5, margin: '0 0 14px' }}>
                {scheme.description}
              </p>

              {scheme.estimatedBenefit && (
                <div style={{ background: '#FAF9F5', padding: '12px 16px', borderRadius: 10, border: '1px solid #E5E2D8', marginBottom: 14 }}>
                  <span style={{ fontSize: '0.72rem', color: '#C85A32', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                    💰 Estimated Financial Benefit for Your Plot
                  </span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#182420' }}>
                    {scheme.estimatedBenefit}
                  </span>
                </div>
              )}

              {scheme.howToApply && (
                <div style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#748782', display: 'block', marginBottom: 4 }}>
                    📋 How to Apply:
                  </span>
                  <p style={{ fontSize: '0.8rem', color: '#485954', margin: 0, lineHeight: 1.5 }}>
                    {scheme.howToApply}
                  </p>
                </div>
              )}

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#748782', display: 'block', marginBottom: 4 }}>
                  📄 Documents Required:
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {scheme.documentsRequired?.map((doc, dIdx) => (
                    <span key={dIdx} style={{ fontSize: '0.74rem', background: '#F8F7F2', border: '1px solid #E5E2D8', padding: '3px 9px', borderRadius: 6, color: '#182420', fontWeight: 600 }}>
                      ✓ {doc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Official Source & Verification Citation */}
              <div style={{
                marginTop: 14, paddingTop: 12, borderTop: '1px solid #F0EFEA',
                display: 'flex', flexDirection: 'column', gap: 8
              }}>
                {/* CORRECTED or PARTIALLY VERIFIED alert */}
                {scheme.verificationStatus && (scheme.verificationStatus.startsWith('CORRECTED') || scheme.verificationStatus.startsWith('PARTIALLY')) && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    background: '#FFF8E7', border: '1px solid #FCE4B6',
                    borderRadius: 8, padding: '8px 12px'
                  }}>
                    <UpdateIcon sx={{ fontSize: 15, color: '#B45309', flexShrink: 0, marginTop: 0.5 }} />
                    <span style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 700, lineHeight: 1.5 }}>
                      {scheme.verificationStatus.startsWith('CORRECTED')
                        ? '⚠️ Data Updated: This scheme was corrected in September 2026 — the benefit amount or scheme name changed. Verify current terms at the official portal before applying.'
                        : '⚠️ Partially Verified: Benefit structure confirmed from official sources; specific G.O. reference could not be independently confirmed. Verify at your district agriculture office.'}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: '0.73rem', color: '#64748B' }}>
                    🏛️ <strong>Official Source:</strong> {scheme.officialSource || 'Ministry of Agriculture & Farmers Welfare, GoI'}
                    {scheme.officialRef && <span style={{ marginLeft: 6, color: '#475569' }}>({scheme.officialRef.substring(0, 80)}{scheme.officialRef.length > 80 ? '…' : ''})</span>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                      background: scheme.verificationStatus?.startsWith('CONFIRMED') ? '#DCFCE7' : '#FFF8E7',
                      border: `1px solid ${scheme.verificationStatus?.startsWith('CONFIRMED') ? '#86EFAC' : '#FCE4B6'}`,
                      color: scheme.verificationStatus?.startsWith('CONFIRMED') ? '#15803D' : '#B45309'
                    }}>
                      {scheme.verificationStatus?.startsWith('CONFIRMED') ? '✓ Verified' : '⚠ Updated'} {scheme.lastVerified || 'September 2026'}
                    </span>
                    <a
                      href={scheme.sourceUrl || scheme.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.74rem', color: '#0369A1', fontWeight: 700, textDecoration: 'none'
                      }}
                    >
                      <span>View official source</span>
                      <OpenInNewIcon sx={{ fontSize: 13 }} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {eligibleSchemes.length === 0 && (
            <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: '#748782' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🏛️</div>
              <p style={{ fontSize: '0.9rem' }}>No matching schemes found for your farm profile. Try changing the crop or verifying the state in your farm analysis.</p>
            </div>
          )}
        </div>
      )}

      {/* Ineligible Schemes - collapsible */}
      {!loading && ineligibleSchemes.length > 0 && (
        <div>
          <button
            onClick={() => setShowIneligible(v => !v)}
            style={{
              background: 'none', border: '1px solid #E5E2D8', borderRadius: 10,
              padding: '10px 18px', cursor: 'pointer', color: '#748782',
              fontSize: '0.82rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <CancelIcon sx={{ fontSize: 16, color: '#C85A32' }} />
            {showIneligible ? 'Hide' : 'Show'} {ineligibleSchemes.length} Non-Qualifying Scheme{ineligibleSchemes.length > 1 ? 's' : ''} (with reason)
          </button>

          {showIneligible && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ineligibleSchemes.map((scheme, idx) => (
                <div key={idx} style={{
                  padding: 20, borderRadius: 14, background: '#FAF9F5',
                  border: '1px solid #E5E2D8', opacity: 0.85
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <StatusBadge status={scheme.eligibilityStatus} eligible={scheme.eligible} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#748782' }}>{scheme.category}</span>
                      </div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#748782', margin: 0 }}>
                        {scheme.title}
                      </h3>
                    </div>
                    <a
                      href={scheme.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.76rem', color: '#748782', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      Official Portal <OpenInNewIcon sx={{ fontSize: 13 }} />
                    </a>
                  </div>
                  {scheme.statusReason && (
                    <p style={{ fontSize: '0.78rem', color: '#C85A32', margin: '0 0 8px', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <CancelIcon sx={{ fontSize: 15, flexShrink: 0, marginTop: 1 }} />
                      {scheme.statusReason}
                    </p>
                  )}
                  <div style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🏛️ {scheme.officialSource || 'Official Govt Portal'}</span>
                    <span>•</span>
                    <a
                      href={scheme.sourceUrl || scheme.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.7rem', color: '#0369A1', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                    >
                      View source <OpenInNewIcon sx={{ fontSize: 11 }} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
