import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseSoilReportOCR } from '../services/api';
import ScienceIcon from '@mui/icons-material/Science';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PublicIcon from '@mui/icons-material/Public';

const npkInputStyle = {
  width: '100%',
  borderRadius: '10px',
  border: '1px solid #CBD5E1',
  backgroundColor: '#FFFFFF',
  padding: '10px 14px',
  fontSize: '0.9rem',
  fontWeight: 700,
  color: '#111827',
  outline: 'none',
  transition: 'border-color 0.15s ease'
};

const npkLabelStyle = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '0.72rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#64748B'
};

export default function SoilTierSelector({ currentSoil, soilTierInfo, onApplyTier }) {
  const { t } = useTranslation();
  const [selectedTier, setSelectedTier] = useState(soilTierInfo?.tier || 'regional_gov_db');

  const [manualN, setManualN] = useState(soilTierInfo?.N || 190);
  const [manualP, setManualP] = useState(soilTierInfo?.P || 18);
  const [manualK, setManualK] = useState(soilTierInfo?.K || 160);
  const [manualPh, setManualPh] = useState(soilTierInfo?.ph || 6.8);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrError(null);
    try {
      const res = await parseSoilReportOCR(file);
      if (res.data) {
        onApplyTier({
          tier: 'lab_report',
          N: res.data.N,
          P: res.data.P,
          K: res.data.K,
          ph: res.data.ph,
          confidence: 100,
          confidenceLabel: '100% Verified Lab Report'
        });
        setSelectedTier('lab_report');
      }
    } catch {
      setOcrError('Failed to parse soil report. Please check file format.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleManualApply = () => {
    onApplyTier({
      tier: 'manual',
      N: Number(manualN),
      P: Number(manualP),
      K: Number(manualK),
      ph: Number(manualPh),
      confidence: 90,
      confidenceLabel: '90% Manual Calibration'
    });
  };

  const handleApply = (tier) => {
    setSelectedTier(tier);
    if (tier === 'lab_report') {
      // Keep selected, user will upload file
    } else if (tier === 'manual') {
      onApplyTier({
        tier: 'manual',
        N: Number(manualN),
        P: Number(manualP),
        K: Number(manualK),
        ph: Number(manualPh),
        confidence: 90,
        confidenceLabel: '90% Manual Calibration'
      });
    } else {
      onApplyTier({
        tier: 'regional_gov_db',
        confidence: 75,
        confidenceLabel: '75% Govt Soil DB'
      });
    }
  };

  const currentConfidence = soilTierInfo?.confidence || 75;
  const highConfidence = currentConfidence >= 90;

  return (
    <div style={{
      borderRadius: '16px',
      border: '1px solid #E5EAE5',
      backgroundColor: '#FFFFFF',
      padding: '24px 28px',
      boxShadow: '0 4px 20px -2px rgba(24, 36, 32, 0.05), 0 1px 3px rgba(24, 36, 32, 0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Header Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: '#EBF5ED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ScienceIcon sx={{ color: '#1E5E3A', fontSize: 24 }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.01em' }}>
              {t('soil.title', 'Soil Data Source & Accuracy Tier')}
            </h3>
            <span style={{ display: 'block', marginTop: '3px', fontSize: '0.82rem', color: '#64748B', fontWeight: 500 }}>
              {t('soil.subtitle', 'Select a soil data method for tailored fertilizer and yield accuracy')}
            </span>
          </div>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          whiteSpace: 'nowrap',
          borderRadius: '9999px',
          padding: '6px 16px',
          fontSize: '0.74rem',
          fontWeight: 800,
          letterSpacing: '0.03em',
          backgroundColor: highConfidence ? '#EBF5ED' : '#FFF8E7',
          border: highConfidence ? '1px solid #C6E4CF' : '1px solid #FCE4B6',
          color: highConfidence ? '#1E5E3A' : '#B45309',
          flexShrink: 0
        }}>
          <span>{soilTierInfo?.confidenceLabel || `${currentConfidence}% Govt Soil DB`}</span>
        </div>
      </div>

      {/* Tier Selection Buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px'
      }}>
        {/* Tier 1: Lab Upload */}
        <button
          type="button"
          onClick={() => handleApply('lab_report')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRadius: '14px',
            padding: '20px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            minHeight: '135px',
            backgroundColor: selectedTier === 'lab_report' ? '#EBF5ED' : '#FFFFFF',
            border: selectedTier === 'lab_report' ? '2px solid #1E5E3A' : '1px solid #E2E8F0',
            boxShadow: selectedTier === 'lab_report' ? '0 4px 14px rgba(30, 94, 58, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', marginBottom: '14px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: selectedTier === 'lab_report' ? '#FFFFFF' : '#EBF5ED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              flexShrink: 0
            }}>
              <UploadFileIcon sx={{ color: '#1E5E3A', fontSize: 20 }} />
            </div>
            <span style={{
              borderRadius: '9999px',
              border: '1px solid #C6E4CF',
              backgroundColor: '#FFFFFF',
              padding: '3px 10px',
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#1E5E3A',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              100% CONFIDENCE
            </span>
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '0.94rem', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
              {t('soil.labTitle', 'Soil Lab Test Upload')}
            </strong>
            <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748B', lineHeight: 1.45, fontWeight: 500 }}>
              {t('soil.labDesc', 'Upload a PDF or photo for OCR extraction')}
            </span>
          </div>
        </button>

        {/* Tier 2: Manual NPK */}
        <button
          type="button"
          onClick={() => handleApply('manual')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRadius: '14px',
            padding: '20px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            minHeight: '135px',
            backgroundColor: selectedTier === 'manual' ? '#EBF5ED' : '#FFFFFF',
            border: selectedTier === 'manual' ? '2px solid #1E5E3A' : '1px solid #E2E8F0',
            boxShadow: selectedTier === 'manual' ? '0 4px 14px rgba(30, 94, 58, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', marginBottom: '14px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: selectedTier === 'manual' ? '#FFFFFF' : '#EBF5ED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              flexShrink: 0
            }}>
              <EditNoteIcon sx={{ color: '#1E5E3A', fontSize: 20 }} />
            </div>
            <span style={{
              borderRadius: '9999px',
              border: '1px solid #C6E4CF',
              backgroundColor: '#FFFFFF',
              padding: '3px 10px',
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#1E5E3A',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              90% CONFIDENCE
            </span>
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '0.94rem', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
              {t('soil.manualTitle', 'Manual NPK/pH Entry')}
            </strong>
            <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748B', lineHeight: 1.45, fontWeight: 500 }}>
              {t('soil.manualDesc', 'Enter N, P, K and pH values directly')}
            </span>
          </div>
        </button>

        {/* Tier 3: Regional Govt DB */}
        <button
          type="button"
          onClick={() => handleApply('regional_gov_db')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRadius: '14px',
            padding: '20px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            minHeight: '135px',
            backgroundColor: selectedTier === 'regional_gov_db' ? '#FFF8E7' : '#FFFFFF',
            border: selectedTier === 'regional_gov_db' ? '2px solid #D97706' : '1px solid #E2E8F0',
            boxShadow: selectedTier === 'regional_gov_db' ? '0 4px 14px rgba(217, 119, 6, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', marginBottom: '14px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: selectedTier === 'regional_gov_db' ? '#FFFFFF' : '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              flexShrink: 0
            }}>
              <PublicIcon sx={{ color: '#D97706', fontSize: 20 }} />
            </div>
            <span style={{
              borderRadius: '9999px',
              border: '1px solid #FCE4B6',
              backgroundColor: '#FFFFFF',
              padding: '3px 10px',
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#B45309',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              75% CONFIDENCE
            </span>
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '0.94rem', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
              {t('soil.regionalTitle', 'Regional Govt Database')}
            </strong>
            <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748B', lineHeight: 1.45, fontWeight: 500 }}>
              {t('soil.regionalDesc', 'District geospatial soil benchmark')}
            </span>
          </div>
        </button>
      </div>

      {/* Lab Report Upload Panel */}
      {selectedTier === 'lab_report' && (
        <div style={{
          borderRadius: '14px',
          border: '1.5px dashed #1E5E3A',
          backgroundColor: '#F5FAF7',
          padding: '24px',
          textAlign: 'center'
        }}>
          <input
            type="file"
            accept=".pdf,image/*"
            id="ocr-upload-input"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="ocr-upload-input"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '10px',
              backgroundColor: '#1E5E3A',
              padding: '10px 20px',
              fontSize: '0.84rem',
              fontWeight: 800,
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(30,94,58,0.2)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <UploadFileIcon sx={{ fontSize: 18 }} />
            {ocrLoading ? 'Analyzing Soil Report OCR...' : 'Choose Lab PDF / Image Report'}
          </label>
          {ocrError && (
            <p style={{ marginTop: '10px', fontSize: '0.8rem', fontWeight: 700, color: '#C85A32' }}>
              {ocrError}
            </p>
          )}
        </div>
      )}

      {/* Manual Entry Panel */}
      {selectedTier === 'manual' && (
        <div style={{
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          backgroundColor: '#F8F9FA',
          padding: '20px 24px'
        }}>
          <span style={{ display: 'block', marginBottom: '16px', fontSize: '0.88rem', fontWeight: 800, color: '#111827' }}>
            Enter Lab Soil Test NPK &amp; pH Values
          </span>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '16px',
            marginBottom: '18px'
          }}>
            <div>
              <label style={npkLabelStyle}>N (kg/ha)</label>
              <input
                type="number"
                value={manualN}
                onChange={e => setManualN(e.target.value)}
                style={npkInputStyle}
              />
            </div>
            <div>
              <label style={npkLabelStyle}>P (kg/ha)</label>
              <input
                type="number"
                value={manualP}
                onChange={e => setManualP(e.target.value)}
                style={npkInputStyle}
              />
            </div>
            <div>
              <label style={npkLabelStyle}>K (kg/ha)</label>
              <input
                type="number"
                value={manualK}
                onChange={e => setManualK(e.target.value)}
                style={npkInputStyle}
              />
            </div>
            <div>
              <label style={npkLabelStyle}>pH Level</label>
              <input
                type="number"
                step="0.1"
                value={manualPh}
                onChange={e => setManualPh(e.target.value)}
                style={npkInputStyle}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualApply}
            style={{
              borderRadius: '10px',
              backgroundColor: '#1E5E3A',
              padding: '10px 20px',
              fontSize: '0.84rem',
              fontWeight: 800,
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(30,94,58,0.2)',
              transition: 'all 0.15s ease'
            }}
          >
            Apply Manual Calibration
          </button>
        </div>
      )}

      {/* Regional Baseline Alert */}
      {currentConfidence < 80 && (
        <div style={{
          borderRadius: '12px',
          border: '1px solid #FCE4B6',
          backgroundColor: '#FFFDF5',
          padding: '14px 18px',
          fontSize: '0.82rem',
          lineHeight: 1.55,
          color: '#B45309',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💡</span>
          <span>
            <strong>Regional Average Soil Baseline ({currentConfidence}%):</strong> Recommendations use district government databases. For higher accuracy, enter your soil test values above.
          </span>
        </div>
      )}
    </div>
  );
}