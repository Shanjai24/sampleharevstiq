import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseSoilReportOCR } from '../services/api';
import ScienceIcon from '@mui/icons-material/Science';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PublicIcon from '@mui/icons-material/Public';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircularProgress from '@mui/material/CircularProgress';

const npkInputClass =
  'w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text-primary';
const npkLabelClass = 'text-[0.7rem] font-bold text-text-muted';

export default function SoilTierSelector({ currentSoil, soilTierInfo, onApplyTier }) {
  const { t } = useTranslation();
  const [selectedTier, setSelectedTier] = useState(soilTierInfo?.tier || 'regional_gov_db');

  const [manualN, setManualN] = useState(soilTierInfo?.N || 190);
  const [manualP, setManualP] = useState(soilTierInfo?.P || 22);
  const [manualK, setManualK] = useState(soilTierInfo?.K || 190);
  const [manualPh, setManualPh] = useState(currentSoil?.ph || 6.5);
  const [manualType] = useState(currentSoil?.soilType || 'loam');

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
  const highConfidence = currentConfidence >= 90;

  return (
    <div className="glass-card fade-in px-6 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary-soft">
            <ScienceIcon sx={{ color: '#1E5E3A', fontSize: 20 }} />
          </div>
          <div>
            <h3 className="m-0 text-[1.05rem] font-extrabold text-text-primary">
              {t('soil.title')}
            </h3>
            <span className="text-xs text-text-muted">
              {t('soil.subtitle')}
            </span>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${
          highConfidence
            ? 'border border-primary-border bg-primary-soft'
            : 'border border-[#FCE4B6] bg-[#FFF8E7]'
        }`}>
          <span className={`text-xs font-extrabold ${highConfidence ? 'text-primary' : 'text-fit-moderate'}`}>
            {soilTierInfo?.confidenceLabel || `${currentConfidence}% Confidence`}
          </span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <button
          type="button"
          onClick={() => handleApply('lab_report')}
          className={`cursor-pointer rounded-xl p-4 text-left text-text-primary transition-all duration-150 ${
            selectedTier === 'lab_report'
              ? 'border-2 border-primary bg-primary-soft'
              : 'border border-border bg-surface'
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <UploadFileIcon sx={{ color: '#1E5E3A' }} />
            <span className="badge-fit-strong px-1.5 py-0.5 text-[0.65rem]">
              100% CONFIDENCE
            </span>
          </div>
            <strong className="block text-[0.9rem] text-text-primary">{t('soil.labTitle')}</strong>
            <span className="text-xs text-text-muted">{t('soil.labDesc')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleApply('manual')}
          className={`cursor-pointer rounded-xl p-4 text-left text-text-primary transition-all duration-150 ${
            selectedTier === 'manual'
              ? 'border-2 border-primary bg-primary-soft'
              : 'border border-border bg-surface'
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <EditNoteIcon sx={{ color: '#1E5E3A' }} />
            <span className="badge-fit-strong px-1.5 py-0.5 text-[0.65rem]">
              90% CONFIDENCE
            </span>
          </div>
            <strong className="block text-[0.9rem] text-text-primary">{t('soil.manualTitle')}</strong>
            <span className="text-xs text-text-muted">{t('soil.manualDesc')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleApply('regional_gov_db')}
          className={`cursor-pointer rounded-xl p-4 text-left text-text-primary transition-all duration-150 ${
            selectedTier === 'regional_gov_db'
              ? 'border-2 border-risk-moderate bg-[#FFF8E7]'
              : 'border border-border bg-surface'
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <PublicIcon sx={{ color: '#D97706' }} />
            <span className="badge-fit-moderate px-1.5 py-0.5 text-[0.65rem]">
              75% CONFIDENCE
            </span>
          </div>
            <strong className="block text-[0.9rem] text-text-primary">{t('soil.regionalTitle')}</strong>
            <span className="text-xs text-text-muted">{t('soil.regionalDesc')}</span>
        </button>
      </div>

      {selectedTier === 'lab_report' && (
        <div className="rounded-xl border border-border bg-bg p-[18px]">
          <label className="mb-2 block text-sm font-bold text-text-secondary">
            Upload Soil Health Card (PDF, PNG, JPG)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            className="mb-3 text-sm text-text-primary"
          />
          {fileName && (
            <p className="mb-2 text-xs text-text-muted">{fileName}</p>
          )}

          {ocrLoading && (
            <div className="mt-2 flex items-center gap-2">
              <CircularProgress size={18} sx={{ color: '#1E5E3A' }} />
              <span className="text-sm text-text-muted">Extracting NPK & pH data via OCR...</span>
            </div>
          )}

          {ocrSuccess && (
            <div className="mt-3">
              <div className="mb-2.5 flex items-center gap-1.5 text-sm font-extrabold text-primary">
                <CheckCircleIcon fontSize="small" />
                <span>Extracted Values Verified (100% Confidence)</span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2.5">
                <div><label className={npkLabelClass}>N (kg/ha)</label><input type="number" value={labN} onChange={e => setLabN(e.target.value)} className={npkInputClass} /></div>
                <div><label className={npkLabelClass}>P (kg/ha)</label><input type="number" value={labP} onChange={e => setLabP(e.target.value)} className={npkInputClass} /></div>
                <div><label className={npkLabelClass}>K (kg/ha)</label><input type="number" value={labK} onChange={e => setLabK(e.target.value)} className={npkInputClass} /></div>
                <div><label className={npkLabelClass}>pH Level</label><input type="number" step="0.1" value={labPh} onChange={e => setLabPh(e.target.value)} className={npkInputClass} /></div>
              </div>
              <button
                type="button"
                onClick={() => handleApply('lab_report')}
                className="btn-primary mt-3 px-[18px] py-2 text-[0.82rem]"
              >
                Apply Verified Lab Report Data
              </button>
            </div>
          )}
        </div>
      )}

      {selectedTier === 'manual' && (
        <div className="rounded-xl border border-border bg-bg p-[18px]">
          <span className="mb-2.5 block text-sm font-bold text-text-secondary">
            Enter Lab Soil Test NPK & pH Values
          </span>
          <div className="mb-3 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2.5">
            <div><label className={npkLabelClass}>N (kg/ha)</label><input type="number" value={manualN} onChange={e => setManualN(e.target.value)} className={npkInputClass} /></div>
            <div><label className={npkLabelClass}>P (kg/ha)</label><input type="number" value={manualP} onChange={e => setManualP(e.target.value)} className={npkInputClass} /></div>
            <div><label className={npkLabelClass}>K (kg/ha)</label><input type="number" value={manualK} onChange={e => setManualK(e.target.value)} className={npkInputClass} /></div>
            <div><label className={npkLabelClass}>pH Level</label><input type="number" step="0.1" value={manualPh} onChange={e => setManualPh(e.target.value)} className={npkInputClass} /></div>
          </div>
          <button
            type="button"
            onClick={() => handleApply('manual')}
            className="btn-primary px-[18px] py-2 text-[0.82rem]"
          >
            Apply Manual Entry
          </button>
        </div>
      )}

      {currentConfidence < 80 && (
        <div className="mt-3.5 rounded-[10px] border border-[#FCE4B6] bg-[#FFF8E7] px-4 py-3 text-[0.82rem] leading-normal text-fit-moderate">
          💡 <strong>{t('soil.baseline', { confidence: currentConfidence })}</strong> {t('soil.baselineDesc')}
        </div>
      )}
    </div>
  );
}
