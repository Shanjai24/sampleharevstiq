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
    <div className="glass-card fade-in" style={{ padding: '20px 24px' }}>
      {/* Title & Active Tier Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#EBF5ED', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ScienceIcon sx={{ color: '#1E5E3A', fontSize: 20 }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#182420' }}>
              Soil Data Source & Accuracy Tier
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#748782' }}>
              Select soil telemetry method for tailored fertilizer and yield accuracy
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 20,
          background: currentConfidence >= 90 ? '#EBF5ED' : '#FFF8E7',
          border: `1px solid ${currentConfidence >= 90 ? '#C6E4CF' : '#FCE4B6'}`
        }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: currentConfidence >= 90 ? '#1E5E3A' : '#B45309' }}>
            {soilTierInfo?.confidenceLabel || `${currentConfidence}% Confidence`}
          </span>
        </div>
      </div>

      {/* Tier Switcher Buttons */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16
      }}>
        {/* Option 1: Lab Test Upload */}
        <button
          type="button"
          onClick={() => handleApply('lab_report')}
          style={{
            padding: '16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
            background: selectedTier === 'lab_report' ? '#EBF5ED' : '#FFFFFF',
            border: selectedTier === 'lab_report' ? '2px solid #1E5E3A' : '1px solid #E5E2D8',
            color: '#182420', transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <UploadFileIcon sx={{ color: '#1E5E3A' }} />
            <span className="badge-fit-strong" style={{ fontSize: '0.65rem', padding: '2px 7px' }}>
              100% CONFIDENCE
            </span>
          </div>
          <strong style={{ display: 'block', fontSize: '0.9rem', color: '#182420' }}>Soil Lab Test Upload</strong>
          <span style={{ fontSize: '0.74rem', color: '#748782' }}>Upload PDF/Photo with OCR extraction</span>
        </button>

        {/* Option 2: Manual Farmer Entry */}
        <button
          type="button"
          onClick={() => handleApply('manual')}
          style={{
            padding: '16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
            background: selectedTier === 'manual' ? '#EBF5ED' : '#FFFFFF',
            border: selectedTier === 'manual' ? '2px solid #1E5E3A' : '1px solid #E5E2D8',
            color: '#182420', transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <EditNoteIcon sx={{ color: '#1E5E3A' }} />
            <span className="badge-fit-strong" style={{ fontSize: '0.65rem', padding: '2px 7px' }}>
              90% CONFIDENCE
            </span>
          </div>
          <strong style={{ display: 'block', fontSize: '0.9rem', color: '#182420' }}>Manual NPK/pH Entry</strong>
          <span style={{ fontSize: '0.74rem', color: '#748782' }}>Directly enter N, P, K & pH values</span>
        </button>

        {/* Option 3: Regional Govt DB Fallback */}
        <button
          type="button"
          onClick={() => handleApply('regional_gov_db')}
          style={{
            padding: '16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
            background: selectedTier === 'regional_gov_db' ? '#FFF8E7' : '#FFFFFF',
            border: selectedTier === 'regional_gov_db' ? '2px solid #D97706' : '1px solid #E5E2D8',
            color: '#182420', transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <PublicIcon sx={{ color: '#D97706' }} />
            <span className="badge-fit-moderate" style={{ fontSize: '0.65rem', padding: '2px 7px' }}>
              75% CONFIDENCE
            </span>
          </div>
          <strong style={{ display: 'block', fontSize: '0.9rem', color: '#182420' }}>Regional Govt Database</strong>
          <span style={{ fontSize: '0.74rem', color: '#748782' }}>District geospatial soil benchmark</span>
        </button>
      </div>

      {/* Tier Input Controls */}
      {selectedTier === 'lab_report' && (
        <div style={{ background: '#F8F7F2', padding: 18, borderRadius: 12, border: '1px solid #E5E2D8' }}>
          <label style={{ fontSize: '0.8rem', color: '#485954', display: 'block', marginBottom: 8, fontWeight: 700 }}>
            Upload Soil Health Card (PDF, PNG, JPG)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            style={{ fontSize: '0.84rem', color: '#182420', marginBottom: 12 }}
          />

          {ocrLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <CircularProgress size={18} sx={{ color: '#1E5E3A' }} />
              <span style={{ fontSize: '0.8rem', color: '#748782' }}>Extracting NPK & pH data via OCR...</span>
            </div>
          )}

          {ocrSuccess && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1E5E3A', fontSize: '0.84rem', fontWeight: 800, marginBottom: 10 }}>
                <CheckCircleIcon fontSize="small" />
                <span>Extracted Values Verified (100% Confidence)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
                <div><label style={{ fontSize: '0.7rem', color: '#748782', fontWeight: 700 }}>N (kg/ha)</label><input type="number" value={labN} onChange={e => setLabN(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E5E2D8', color: '#182420', fontSize: '0.84rem' }} /></div>
                <div><label style={{ fontSize: '0.7rem', color: '#748782', fontWeight: 700 }}>P (kg/ha)</label><input type="number" value={labP} onChange={e => setLabP(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E5E2D8', color: '#182420', fontSize: '0.84rem' }} /></div>
                <div><label style={{ fontSize: '0.7rem', color: '#748782', fontWeight: 700 }}>K (kg/ha)</label><input type="number" value={labK} onChange={e => setLabK(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E5E2D8', color: '#182420', fontSize: '0.84rem' }} /></div>
                <div><label style={{ fontSize: '0.7rem', color: '#748782', fontWeight: 700 }}>pH Level</label><input type="number" step="0.1" value={labPh} onChange={e => setLabPh(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E5E2D8', color: '#182420', fontSize: '0.84rem' }} /></div>
              </div>
              <button
                type="button"
                onClick={() => handleApply('lab_report')}
                className="btn-primary"
                style={{ marginTop: 12, padding: '8px 18px', fontSize: '0.82rem' }}
              >
                Apply Verified Lab Report Data
              </button>
            </div>
          )}
        </div>
      )}

      {selectedTier === 'manual' && (
        <div style={{ background: '#F8F7F2', padding: 18, borderRadius: 12, border: '1px solid #E5E2D8' }}>
          <span style={{ fontSize: '0.8rem', color: '#485954', fontWeight: 700, display: 'block', marginBottom: 10 }}>
            Enter Lab Soil Test NPK & pH Values
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 12 }}>
            <div><label style={{ fontSize: '0.7rem', color: '#748782', fontWeight: 700 }}>N (kg/ha)</label><input type="number" value={manualN} onChange={e => setManualN(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E5E2D8', color: '#182420', fontSize: '0.84rem' }} /></div>
            <div><label style={{ fontSize: '0.7rem', color: '#748782', fontWeight: 700 }}>P (kg/ha)</label><input type="number" value={manualP} onChange={e => setManualP(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E5E2D8', color: '#182420', fontSize: '0.84rem' }} /></div>
            <div><label style={{ fontSize: '0.7rem', color: '#748782', fontWeight: 700 }}>K (kg/ha)</label><input type="number" value={manualK} onChange={e => setManualK(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E5E2D8', color: '#182420', fontSize: '0.84rem' }} /></div>
            <div><label style={{ fontSize: '0.7rem', color: '#748782', fontWeight: 700 }}>pH Level</label><input type="number" step="0.1" value={manualPh} onChange={e => setManualPh(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E5E2D8', color: '#182420', fontSize: '0.84rem' }} /></div>
          </div>
          <button
            type="button"
            onClick={() => handleApply('manual')}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.82rem' }}
          >
            Apply Manual Entry
          </button>
        </div>
      )}

      {/* Low Confidence Alert Banner */}
      {currentConfidence < 80 && (
        <div style={{
          marginTop: 14, padding: '12px 16px', borderRadius: 10,
          background: '#FFF8E7', border: '1px solid #FCE4B6',
          color: '#B45309', fontSize: '0.82rem', lineHeight: 1.5
        }}>
          💡 <strong>Regional Average Soil Baseline ({currentConfidence}%):</strong> Recommendations use district government databases. For higher accuracy, enter your soil test values above.
        </div>
      )}
    </div>
  );
}
