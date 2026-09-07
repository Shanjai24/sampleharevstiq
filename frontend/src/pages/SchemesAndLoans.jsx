import { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FarmContext } from '../context/FarmContext';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import SecurityIcon from '@mui/icons-material/Security';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SchemesAndLoans() {
  const { farmData, areaAcres } = useContext(FarmContext);
  const navigate = useNavigate();

  const selectedCrop = farmData?.crops?.[0]?.crop || 'rice';
  const selectedState = farmData?.location?.state || 'Tamil Nadu';

  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const currentArea = areaAcres || 1.0;
  const kccLoanAmount = Math.round(currentArea * 22000);
  const dripCost = Math.round(currentArea * 45000);
  const dripSubsidy = Math.round(dripCost * (currentArea <= 5.0 ? 0.55 : 0.45));
  const pmfbyCropValue = Math.round(currentArea * 35000);
  const pmfbyPremium = Math.round(pmfbyCropValue * 0.02);

  return (
    <div className="page-container" style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <IconButton
          onClick={() => navigate(-1)}
          sx={{ color: '#1E5E3A', background: '#FFFFFF', border: '1px solid #E5E2D8' }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#182420', letterSpacing: '-0.02em' }}>
              🏛️ Schemes, Loans, & Financial Subsidies
            </h1>
            <span style={{ background: '#EBF5ED', color: '#1E5E3A', fontSize: '0.74rem', fontWeight: 800, padding: '3px 10px', borderRadius: 12, border: '1px solid #C6E4CF' }}>
              GOVT ELIGIBILITY MATCH
            </span>
          </div>
          <p style={{ color: '#485954', fontSize: '0.86rem', margin: '2px 0 0' }}>
            Personalized subsidies, low-interest working capital loans, and crop insurance coverage tailored for your {currentArea}-acre plot in {selectedState}.
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
            {currentArea <= 5.0 ? '55% Subsidy' : '45% Subsidy'} on total system cost ₹{dripCost.toLocaleString()}
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
            Low interest 4% per annum with prompt repayment subvention
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
            3 equal installments of ₹2,000 via direct DBT transfer
          </span>
        </div>

        {/* PMFBY Insurance Premium */}
        <div className="glass-card fade-in" style={{ padding: 20, borderLeft: '4px solid #C85A32' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <SecurityIcon sx={{ color: '#C85A32', fontSize: 20 }} />
            <span style={{ fontSize: '0.78rem', color: '#485954', fontWeight: 700 }}>PMFBY Crop Insurance</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C85A32' }}>
            ₹{pmfbyPremium.toLocaleString()} <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#748782' }}>premium</span>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#748782' }}>
            Covers crop loss up to ₹{pmfbyCropValue.toLocaleString()} against flood/drought
          </span>
        </div>
      </div>

      {/* Eligible Schemes List */}
      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#182420', marginBottom: 16 }}>
        Matched Schemes & Loan Applications
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#748782' }}>Matching government scheme eligibility...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {schemes.map((scheme, idx) => (
            <div key={idx} className="glass-card fade-in" style={{ padding: 24, background: '#FFFFFF', border: '1px solid #E5E2D8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1E5E3A', background: '#EBF5ED', padding: '3px 10px', borderRadius: 10, border: '1px solid #C6E4CF' }}>
                    {scheme.category}
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#182420', margin: '6px 0 2px' }}>
                    {scheme.title}
                  </h3>
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

              <div style={{ background: '#FAF9F5', padding: '12px 16px', borderRadius: 10, border: '1px solid #E5E2D8', marginBottom: 14 }}>
                <span style={{ fontSize: '0.72rem', color: '#C85A32', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                  💰 Calculated Financial Benefit for Your Plot
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#182420' }}>
                  {scheme.estimatedBenefit}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#748782', display: 'block', marginBottom: 4 }}>
                  📄 Mandatory Documents Required:
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {scheme.documentsRequired?.map((doc, dIdx) => (
                    <span key={dIdx} style={{ fontSize: '0.74rem', background: '#F8F7F2', border: '1px solid #E5E2D8', padding: '3px 9px', borderRadius: 6, color: '#182420', fontWeight: 600 }}>
                      ✓ {doc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
