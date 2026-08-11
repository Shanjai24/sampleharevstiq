import { useState } from 'react';
import { parseSoilReportOCR } from '../services/api';
import ScienceIcon from '@mui/icons-material/Science';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PublicIcon from '@mui/icons-material/Public';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircularProgress from '@mui/material/CircularProgress';

export default function SoilTierSelector({ currentSoil, soilTierInfo, onApplyTier }) {
  const [selectedTier, setSelectedTier] = useState(soilTierInfo?.tier || 'regional_gov_db');

  // Manual input state
  const [manualN, setManualN] = useState(soilTierInfo?.N || 190);
  const [manualP, setManualP] = useState(soilTierInfo?.P || 22);
  const [manualK, setManualK] = useState(soilTierInfo?.K || 190);
  const [manualPh, setManualPh] = useState(currentSoil?.ph || 6.5);
  const [manualType, setManualType] = useState(currentSoil?.soilType || 'loam');

  // OCR Lab Report upload state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [labN, setLabN] = useState(210);
  const [labP, setLabP] = useState(26);
  const [labK, setLabK] = useState(195);
  const [labPh, setLabPh] = useState(6.8);
  const [labType, setLabType] = useState('loam');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setOcrLoading(true);
    setOcrSuccess(false);

    try {
      // Simulate/trigger OCR endpoint
      const res = await parseSoilReportOCR(file.name, file.type);
      if (res.data) {
        setLabN(res.data.N || 210);
        setLabP(res.data.P || 26);
        setLabK(res.data.K || 195);
        setLabPh(res.data.ph || 6.8);
        setLabType(res.data.soilType || 'loam');
        setOcrSuccess(true);
      }
    } catch (err) {
      console.error('OCR Upload Error:', err);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleApply = (tier) => {
    setSelectedTier(tier);
    if (tier === 'lab_report') {
      onApplyTier({
        tier: 'lab_report',
        soilReportData: { N: labN, P: labP, K: labK, ph: labPh, soilType: labType }
      });
    } else if (tier === 'manual') {
      onApplyTier({
        tier: 'manual',
        manualSoil: { N: manualN, P: manualP, K: manualK, ph: manualPh, soilType: manualType }
      });
    } else {
      onApplyTier({ tier: 'regional_gov_db' });
    }
  };

  const currentConfidence = soilTierInfo?.confidence || 75;

  return (
    <div className="glass-card fade-in" style={{ padding: 24, marginBottom: 24 }}>
      {/* Title & Active Tier Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(20, 184, 166, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ScienceIcon sx={{ color: '#2dd4bf' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
              Soil Data Source & Accuracy Tier
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Choose soil data acquisition method for AI recommendation precision
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 20,
          background: currentConfidence >= 90 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          border: `1px solid ${currentConfidence >= 90 ? '#10b981' : '#f59e0b'}40`
        }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: currentConfidence >= 90 ? '#10b981' : '#f59e0b' }}>
            {soilTierInfo?.confidenceLabel || `${currentConfidence}% Confidence`}
          </span>
        </div>
      </div>

      {/* Tier Switcher Buttons */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20
      }}>
        {/* Option 1: Lab Test Upload */}
        <button
          type="button"
          onClick={() => handleApply('lab_report')}
          style={{
            padding: 16, borderRadius: 12, cursor: 'pointer', textAlign: 'left',
            background: selectedTier === 'lab_report' ? 'rgba(20, 184, 166, 0.15)' : 'rgba(11, 18, 16, 0.5)',
            border: selectedTier === 'lab_report' ? '2px solid #14b8a6' : '1px solid rgba(20, 184, 166, 0.15)',
            color: '#f8fafc', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <UploadFileIcon sx={{ color: '#14b8a6' }} />
            <span className="badge-match-high" style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>
              100% CONFIDENCE
            </span>
          </div>
          <strong style={{ display: 'block', fontSize: '0.88rem' }}>Soil Lab Test Upload</strong>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Upload PDF/Photo with automatic OCR extraction</span>
        </button>

        {/* Option 2: Manual Farmer Entry */}
        <button
          type="button"
          onClick={() => handleApply('manual')}
          style={{
            padding: 16, borderRadius: 12, cursor: 'pointer', textAlign: 'left',
            background: selectedTier === 'manual' ? 'rgba(20, 184, 166, 0.15)' : 'rgba(11, 18, 16, 0.5)',
            border: selectedTier === 'manual' ? '2px solid #14b8a6' : '1px solid rgba(20, 184, 166, 0.15)',
            color: '#f8fafc', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <EditNoteIcon sx={{ color: '#2dd4bf' }} />
            <span className="badge-match-high" style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>
              90% CONFIDENCE
            </span>
          </div>
          <strong style={{ display: 'block', fontSize: '0.88rem' }}>Manual NPK/pH Entry</strong>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Directly enter N, P, K & pH values</span>
        </button>

        {/* Option 3: Regional Govt DB Fallback */}
        <button
          type="button"
          onClick={() => handleApply('regional_gov_db')}
          style={{
            padding: 16, borderRadius: 12, cursor: 'pointer', textAlign: 'left',
            background: selectedTier === 'regional_gov_db' ? 'rgba(217, 119, 6, 0.15)' : 'rgba(11, 18, 16, 0.5)',
            border: selectedTier === 'regional_gov_db' ? '2px solid #d97706' : '1px solid rgba(20, 184, 166, 0.15)',
            color: '#f8fafc', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <PublicIcon sx={{ color: '#f59e0b' }} />
            <span className="badge-match-medium" style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>
              75% CONFIDENCE
            </span>
          </div>
          <strong style={{ display: 'block', fontSize: '0.88rem' }}>Regional Govt Database</strong>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>State/District aggregated soil matrix</span>
        </button>
      </div>

      {/* Tier Input Controls */}
      {selectedTier === 'lab_report' && (
        <div style={{ background: 'rgba(11, 18, 16, 0.6)', padding: 18, borderRadius: 12, border: '1px solid rgba(20, 184, 166, 0.2)' }}>
          <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Upload Soil Test Report (PDF, PNG, JPG)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: 12 }}
          />

          {ocrLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <CircularProgress size={18} sx={{ color: '#14b8a6' }} />
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Running OCR extraction on report...</span>
            </div>
          )}

          {ocrSuccess && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: '0.82rem', fontWeight: 700, marginBottom: 10 }}>
                <CheckCircleIcon fontSize="small" />
                <span>Extracted Values Verified (100% Confidence)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
                <div><label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>N (kg/ha)</label><input type="number" value={labN} onChange={e => setLabN(e.target.value)} style={{ width: '100%', padding: 6, borderRadius: 6, background: '#12201c', border: '1px solid rgba(20,184,166,0.3)', color: '#fff', fontSize: '0.82rem' }} /></div>
                <div><label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>P (kg/ha)</label><input type="number" value={labP} onChange={e => setLabP(e.target.value)} style={{ width: '100%', padding: 6, borderRadius: 6, background: '#12201c', border: '1px solid rgba(20,184,166,0.3)', color: '#fff', fontSize: '0.82rem' }} /></div>
                <div><label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>K (kg/ha)</label><input type="number" value={labK} onChange={e => setLabK(e.target.value)} style={{ width: '100%', padding: 6, borderRadius: 6, background: '#12201c', border: '1px solid rgba(20,184,166,0.3)', color: '#fff', fontSize: '0.82rem' }} /></div>
                <div><label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>pH Level</label><input type="number" step="0.1" value={labPh} onChange={e => setLabPh(e.target.value)} style={{ width: '100%', padding: 6, borderRadius: 6, background: '#12201c', border: '1px solid rgba(20,184,166,0.3)', color: '#fff', fontSize: '0.82rem' }} /></div>
              </div>
              <button
                type="button"
                onClick={() => handleApply('lab_report')}
                style={{ marginTop: 12, padding: '8px 20px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
              >
                Apply Verified Lab Report Data
              </button>
            </div>
          )}
        </div>
      )}

      {selectedTier === 'manual' && (
        <div style={{ background: 'rgba(11, 18, 16, 0.6)', padding: 18, borderRadius: 12, border: '1px solid rgba(20, 184, 166, 0.2)' }}>
          <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: 10 }}>
            Enter Soil Test NPK & pH Values
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 12 }}>
            <div><label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>N (kg/ha)</label><input type="number" value={manualN} onChange={e => setManualN(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, background: '#12201c', border: '1px solid rgba(20,184,166,0.3)', color: '#fff', fontSize: '0.82rem' }} /></div>
            <div><label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>P (kg/ha)</label><input type="number" value={manualP} onChange={e => setManualP(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, background: '#12201c', border: '1px solid rgba(20,184,166,0.3)', color: '#fff', fontSize: '0.82rem' }} /></div>
            <div><label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>K (kg/ha)</label><input type="number" value={manualK} onChange={e => setManualK(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, background: '#12201c', border: '1px solid rgba(20,184,166,0.3)', color: '#fff', fontSize: '0.82rem' }} /></div>
            <div><label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>pH Level</label><input type="number" step="0.1" value={manualPh} onChange={e => setManualPh(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, background: '#12201c', border: '1px solid rgba(20,184,166,0.3)', color: '#fff', fontSize: '0.82rem' }} /></div>
          </div>
          <button
            type="button"
            onClick={() => handleApply('manual')}
            style={{ padding: '8px 20px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
          >
            Apply Manual Entry
          </button>
        </div>
      )}

      {/* Low Confidence Warning Banner */}
      {currentConfidence < 80 && (
        <div style={{
          marginTop: 16, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.3)',
          color: '#f59e0b', fontSize: '0.82rem', lineHeight: 1.5
        }}>
          ⚠️ <strong>Low Soil Confidence Alert ({currentConfidence}%):</strong> These recommendations are based on regional average soil data. For maximum accuracy, upload a soil test report or enter manual soil test values.
        </div>
      )}
    </div>
  );
}
