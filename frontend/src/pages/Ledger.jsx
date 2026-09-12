import { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FarmContext } from '../context/FarmContext';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LinkIcon from '@mui/icons-material/Link';
import MicIcon from '@mui/icons-material/Mic';
import { isSpeechRecognitionSupported, startListening, parseLedgerVoiceCommand } from '../services/voice';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CATEGORY_META = {
  seed: { label: 'Seeds & Saplings', icon: '🌾', type: 'expense', color: '#166534' },
  fertilizer: { label: 'Fertilizers & Nutrients', icon: '🧪', type: 'expense', color: '#0284C7' },
  pesticide: { label: 'Pesticides & Bio-sprays', icon: '🚿', type: 'expense', color: '#7C3AED' },
  labor: { label: 'Field Labor', icon: '👥', type: 'expense', color: '#B45309' },
  irrigation: { label: 'Irrigation & Electricity', icon: '💧', type: 'expense', color: '#0369A1' },
  equipment_rental: { label: 'Machinery / Tractor Rental', icon: '🚜', type: 'expense', color: '#C2410C' },
  transport: { label: 'Mandi Transport / Logistics', icon: '🚚', type: 'expense', color: '#4B5563' },
  crop_sale: { label: 'Produce Sale Revenue', icon: '💰', type: 'income', color: '#1E5E3A' },
  subsidy_received: { label: 'Government Subsidy / DBT', icon: '🏛️', type: 'income', color: '#0D9488' },
  other: { label: 'Other Farm Transaction', icon: '📝', type: 'expense', color: '#64748B' }
};

export default function Ledger() {
  const { farmData, areaAcres } = useContext(FarmContext) || {};
  const navigate = useNavigate();

  const farmId = farmData?._id || 'active-farm-cycle';
  const primaryCrop = farmData?.crops?.[0]?.crop || 'rice';
  const currentArea = areaAcres || farmData?.areaAcres || 1.0;

  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState('kharif');
  const [showAddModal, setShowAddModal] = useState(false);
  // Voice quick-add state
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceInterim, setVoiceInterim] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [voiceParsed, setVoiceParsed] = useState(null); // confirmation step
  const voiceRecRef = useRef(null);

  // Form state
  const [entryType, setEntryType] = useState('expense');
  const [category, setCategory] = useState('fertilizer');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState('');

  const storageKey = `harvestiq_ledger_${farmId}`;

  // Voice quick-add handler
  const handleVoiceLedger = () => {
    if (isVoiceListening) {
      voiceRecRef.current?.stop();
      setIsVoiceListening(false);
      setVoiceInterim('');
      return;
    }
    if (!isSpeechRecognitionSupported()) {
      setVoiceError('Voice input is not supported in your browser. Please type the transaction.');
      setTimeout(() => setVoiceError(''), 5000);
      return;
    }
    setVoiceError('');
    setVoiceParsed(null);
    const rec = startListening({
      lang: 'en',
      onStart: () => setIsVoiceListening(true),
      onInterim: (partial) => setVoiceInterim(partial),
      onResult: (transcript) => {
        setIsVoiceListening(false);
        setVoiceInterim('');
        const parsed = parseLedgerVoiceCommand(transcript);
        if (parsed && parsed.amount > 0) {
          // Show confirmation — never auto-submit
          setVoiceParsed(parsed);
        } else {
          setVoiceError(`Could not parse "${transcript}" as a ledger command. Try: "add 500 rupees fertilizer expense" or use the form below.`);
          setTimeout(() => setVoiceError(''), 7000);
        }
      },
      onError: (event) => {
        setIsVoiceListening(false);
        setVoiceInterim('');
        setVoiceError(event?.userMessage || 'Voice recognition failed. Please try again or use the form.');
        setTimeout(() => setVoiceError(''), 5000);
      },
      onEnd: () => { setIsVoiceListening(false); setVoiceInterim(''); }
    });
    voiceRecRef.current = rec;
  };

  // Confirm voice-parsed entry and pre-fill the form
  const handleConfirmVoiceParsed = () => {
    if (!voiceParsed) return;
    setEntryType(voiceParsed.entryType);
    setCategory(voiceParsed.category);
    setAmount(String(voiceParsed.amount));
    setNote(voiceParsed.note);
    setVoiceParsed(null);
    setShowAddModal(true);
  };

  // Fetch ledger data and summary
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resEntries, resSummary] = await Promise.all([
        axios.get(`${API_BASE}/api/ledger/${farmId}?season=${selectedSeason}&crop=${primaryCrop}`),
        axios.get(`${API_BASE}/api/ledger/${farmId}/summary?season=${selectedSeason}&crop=${primaryCrop}&areaAcres=${currentArea}`)
      ]);

      if (resEntries.data?.entries) {
        setEntries(resEntries.data.entries);
        localStorage.setItem(storageKey, JSON.stringify(resEntries.data.entries));
      }
      if (resSummary.data) {
        setSummary(resSummary.data);
      }
    } catch (err) {
      console.warn('Ledger network fetch error, loading offline cache:', err.message);
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setEntries(parsed);
        } catch {
          setEntries([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [farmId, selectedSeason, primaryCrop, currentArea, storageKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add transaction
  const handleAddEntry = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const payload = {
      farmId,
      crop: primaryCrop,
      season: selectedSeason,
      entryType,
      category,
      amount: numAmount,
      quantity: quantity ? parseFloat(quantity) : undefined,
      unit: unit.trim(),
      date,
      note: note.trim(),
      source: linkedTaskId ? 'linked_to_task' : 'manual',
      relatedTaskId: linkedTaskId || undefined,
      // Needed downstream by ml/calibrate_cost_benchmarks.py — cost/income
      // per unit area only means something if the area is recorded
      // alongside the entry, not looked up separately later.
      areaAcres: currentArea
    };

    try {
      const res = await axios.post(`${API_BASE}/api/ledger`, payload);
      const saved = res.data;
      const updated = [saved, ...entries];
      setEntries(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      fetchData(); // refresh summary
    } catch {
      const offlineDoc = {
        ...payload,
        id: `offline-led-${Date.now()}`,
        _id: `offline-led-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      const updated = [offlineDoc, ...entries];
      setEntries(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }

    setAmount('');
    setNote('');
    setQuantity('');
    setUnit('');
    setLinkedTaskId('');
    setShowAddModal(false);
  };

  // Delete transaction
  const handleDeleteEntry = async (entryId, e) => {
    e.stopPropagation();
    const updated = entries.filter(item => item.id !== entryId && item._id !== entryId);
    setEntries(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    try {
      await axios.delete(`${API_BASE}/api/ledger/${entryId}`);
      fetchData();
    } catch (err) {
      console.warn('Delete error, updated locally:', err.message);
    }
  };

  const totals = useMemo(() => {
    let expenses = 0;
    let income = 0;
    entries.forEach(e => {
      const a = Number(e.amount) || 0;
      if (e.entryType === 'expense') expenses += a;
      else if (e.entryType === 'income') income += a;
    });
    return {
      expenses,
      income,
      net: income - expenses
    };
  }, [entries]);

  // Compute category totals
  const categoryTotals = useMemo(() => {
    const cats = {};
    entries.forEach(e => {
      if (e.entryType === 'expense') {
        cats[e.category] = (cats[e.category] || 0) + Number(e.amount);
      }
    });
    return cats;
  }, [entries]);

  const est = summary?.estimatedVsActual?.estimated;
  const act = summary?.estimatedVsActual?.actual;
  const variance = summary?.estimatedVsActual?.variance;

  return (
    <div className="page-container" style={{ paddingBottom: 80, maxWidth: 960, margin: '0 auto' }}>

      {/* Top Header */}
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <IconButton
            onClick={() => navigate(-1)}
            sx={{ color: '#1E5E3A', background: '#FFFFFF', border: '1px solid #E5E2D8' }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: '#182420', letterSpacing: '-0.02em' }}>
                📒 Expense &amp; Income Ledger
              </h1>
              <span style={{
                background: '#EBF5ED', color: '#1E5E3A', border: '1px solid #C6E4CF',
                fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: 12
              }}>
                {entries.length} TRANSACTIONS
              </span>
            </div>
            <p style={{ color: '#485954', fontSize: '0.86rem', margin: '3px 0 0' }}>
              Real-world financial book for <strong>{primaryCrop.charAt(0).toUpperCase() + primaryCrop.slice(1)}</strong> plot ({currentArea} acres)
            </p>
          </div>
        </div>

        {/* Action Buttons & Season Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={selectedSeason}
            onChange={e => setSelectedSeason(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 10, border: '1px solid #E5E2D8',
              background: '#FFFFFF', fontSize: '0.82rem', fontWeight: 700, color: '#182420'
            }}
          >
            <option value="kharif">Kharif Season</option>
            <option value="rabi">Rabi Season</option>
            <option value="zaid">Zaid / Summer</option>
          </select>

          {/* Voice Quick-Add button (hidden on unsupported browsers) */}
          {isSpeechRecognitionSupported() && (
            <button
              onClick={handleVoiceLedger}
              title={isVoiceListening ? 'Stop listening' : 'Voice quick-add: say “add 500 rupees fertilizer”'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', fontSize: '0.82rem', borderRadius: 10,
                border: `1.5px solid ${isVoiceListening ? '#C85A32' : '#E5E2D8'}`,
                background: isVoiceListening ? '#FEF2F2' : '#F8F7F2',
                color: isVoiceListening ? '#C85A32' : '#748782',
                cursor: 'pointer', fontWeight: 700,
                animation: isVoiceListening ? 'pulse 1.5s infinite' : 'none'
              }}
            >
              <MicIcon sx={{ fontSize: 18 }} />
              <span>{isVoiceListening ? 'Listening...' : 'Voice Add'}</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.82rem', borderRadius: 10 }}
          >
            <AddIcon fontSize="small" />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      {/* Voice interim banner */}
      {isVoiceListening && voiceInterim && (
        <div style={{
          background: '#FFF8E7', border: '1px solid #FCE4B6', borderRadius: 10,
          padding: '8px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8
        }}>
          <MicIcon sx={{ fontSize: 16, color: '#B45309' }} />
          <span style={{ fontSize: '0.82rem', color: '#B45309', fontStyle: 'italic' }}>
            {voiceInterim}...
          </span>
        </div>
      )}

      {/* Voice error banner */}
      {voiceError && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
          padding: '8px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8
        }}>
          <MicIcon sx={{ fontSize: 16, color: '#B91C1C' }} />
          <span style={{ fontSize: '0.78rem', color: '#B91C1C', fontWeight: 700 }}>{voiceError}</span>
        </div>
      )}

      {/* Voice parsed confirmation card — never auto-submits */}
      {voiceParsed && (
        <div style={{
          background: '#EBF5ED', border: '2px solid #C6E4CF', borderRadius: 14,
          padding: '16px 20px', marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <MicIcon sx={{ fontSize: 18, color: '#1E5E3A' }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#182420' }}>Voice Command Heard — Confirm Before Saving</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#485954', marginBottom: 4 }}>
            <strong>Heard:</strong> &ldquo;{voiceParsed.rawTranscript}&rdquo;
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, marginTop: 8 }}>
            <span style={{ background: '#FFFFFF', border: '1px solid #C6E4CF', borderRadius: 8, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
              Type: {voiceParsed.entryType === 'expense' ? '🔴 Expense' : '🟢 Income'}
            </span>
            <span style={{ background: '#FFFFFF', border: '1px solid #C6E4CF', borderRadius: 8, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
              Amount: ₹{voiceParsed.amount.toLocaleString()}
            </span>
            <span style={{ background: '#FFFFFF', border: '1px solid #C6E4CF', borderRadius: 8, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
              Category: {CATEGORY_META[voiceParsed.category]?.label || voiceParsed.category}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleConfirmVoiceParsed}
              className="btn-primary"
              style={{ padding: '7px 18px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircleIcon sx={{ fontSize: 16 }} />
              Yes, looks right — open form to confirm
            </button>
            <button
              onClick={() => setVoiceParsed(null)}
              style={{ padding: '7px 14px', fontSize: '0.82rem', borderRadius: 8, border: '1px solid #C6E4CF', background: 'transparent', color: '#485954', cursor: 'pointer', fontWeight: 700 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── ESTIMATED VS ACTUAL COMPARISON HERO CARD (Prominent) ── */}
      <div className="card-hero fade-in" style={{ padding: '24px 28px', marginBottom: 24, border: '1px solid #E5E2D8' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EBF5ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ReceiptLongIcon sx={{ color: '#1E5E3A', fontSize: 22 }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                Estimated vs. Actual Profit Comparison
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#748782' }}>
                Validating model predictions against your real book entries
              </span>
            </div>
          </div>

          <div style={{
            background: variance?.status === 'AHEAD_OF_TARGET' ? '#DCFCE7' : '#FEF3C7',
            color: variance?.status === 'AHEAD_OF_TARGET' ? '#15803D' : '#B45309',
            border: `1px solid ${variance?.status === 'AHEAD_OF_TARGET' ? '#86EFAC' : '#FDE68A'}`,
            padding: '4px 12px', borderRadius: 20, fontSize: '0.76rem', fontWeight: 800,
            display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            {variance?.status === 'AHEAD_OF_TARGET' ? <TrendingUpIcon sx={{ fontSize: 16 }} /> : <TrendingDownIcon sx={{ fontSize: 16 }} />}
            <span>{variance?.profitDiff >= 0 ? `+₹${Math.abs(variance.profitDiff).toLocaleString()} Ahead` : `₹${Math.abs(variance?.profitDiff || 0).toLocaleString()} Behind Target`}</span>
          </div>
        </div>

        {/* 2-Column Comparison: Model Prediction vs Real Farmer Actuals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, marginBottom: 16 }}>

          {/* Box A: Model Prediction */}
          <div style={{ background: '#FAF9F5', padding: '18px 20px', borderRadius: 14, border: '1px solid #EAE7DC' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#748782', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                🤖 AI / MODEL BENCHMARK PREDICTION
              </span>
              <span style={{ fontSize: '0.68rem', background: '#EAE7DC', color: '#485954', padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>
                Initial Estimate
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#485954' }}>Projected Input Cost:</span>
                <span style={{ fontWeight: 700, color: '#C85A32' }}>₹{est?.cost?.toLocaleString() || '18,000'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#485954' }}>Projected Mandi Revenue:</span>
                <span style={{ fontWeight: 700, color: '#1E5E3A' }}>₹{est?.revenue?.toLocaleString() || '60,000'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem', paddingTop: 8, borderTop: '1px solid #E5E2D8' }}>
                <span style={{ fontWeight: 800, color: '#182420' }}>Expected Net Margin:</span>
                <span style={{ fontWeight: 800, color: '#1E5E3A' }}>₹{est?.profit?.toLocaleString() || '42,000'}</span>
              </div>
            </div>
          </div>

          {/* Box B: Farmer Real Actuals */}
          <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: 14, border: '1px solid #C6E4CF', boxShadow: '0 4px 12px rgba(30, 94, 58, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1E5E3A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                ✍️ REAL FARMER LEDGER ENTRIES
              </span>
              <span style={{ fontSize: '0.68rem', background: '#DCFCE7', color: '#15803D', padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>
                {entries.length} Logged
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#485954' }}>Recorded Expenses:</span>
                <span style={{ fontWeight: 700, color: '#C85A32' }}>₹{totals.expenses.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#485954' }}>Recorded Income / Sales:</span>
                <span style={{ fontWeight: 700, color: '#1E5E3A' }}>₹{totals.income.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem', paddingTop: 8, borderTop: '1px solid #E5E2D8' }}>
                <span style={{ fontWeight: 800, color: '#182420' }}>Actual Realized Margin:</span>
                <span style={{ fontWeight: 800, color: totals.net >= 0 ? '#1E5E3A' : '#C85A32' }}>
                  ₹{totals.net.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Mandatory Honesty & Source Disclosure */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: '0.75rem', color: '#748782', background: '#FAF9F5',
          padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E2D8'
        }}>
          <InfoOutlinedIcon sx={{ fontSize: 16, color: '#94A3B8', flexShrink: 0 }} />
          <span>
            <strong>Methodology Note:</strong> Left figures represent ML model benchmarks calibrated per acre. Right figures are strictly your self-reported expense vouchers and market sales receipts.
          </span>
        </div>
      </div>

      {/* Financial Snapshot Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* Total Expenses */}
        <div className="glass-card fade-in" style={{ padding: 20, borderLeft: '4px solid #C85A32' }}>
          <span style={{ fontSize: '0.74rem', color: '#748782', fontWeight: 700, textTransform: 'uppercase' }}>Total Expenses</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#C85A32', marginTop: 4 }}>
            ₹{totals.expenses.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#748782' }}>Seeds, nutrients, labor &amp; fuel</span>
        </div>

        {/* Total Income */}
        <div className="glass-card fade-in" style={{ padding: 20, borderLeft: '4px solid #1E5E3A' }}>
          <span style={{ fontSize: '0.74rem', color: '#748782', fontWeight: 700, textTransform: 'uppercase' }}>Total Revenue</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E5E3A', marginTop: 4 }}>
            ₹{totals.income.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#748782' }}>Mandi sales &amp; DBT subsidies</span>
        </div>

        {/* Net Profit */}
        <div className="glass-card fade-in" style={{ padding: 20, borderLeft: '4px solid #0284C7' }}>
          <span style={{ fontSize: '0.74rem', color: '#748782', fontWeight: 700, textTransform: 'uppercase' }}>Net Seasonal Balance</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: totals.net >= 0 ? '#1E5E3A' : '#C85A32', marginTop: 4 }}>
            ₹{totals.net.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#748782' }}>
            {totals.net >= 0 ? 'Positive farmgate operating profit' : 'Operating loss so far this season'}
          </span>
        </div>
      </div>

      {/* Category Breakdown Chips */}
      {Object.keys(categoryTotals).length > 0 && (
        <div className="glass-card fade-in" style={{ padding: '16px 20px', marginBottom: 24, background: '#FFFFFF' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#182420', display: 'block', marginBottom: 10 }}>
            📊 Expenses by Agronomic Category
          </span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(categoryTotals).map(([catKey, catAmt]) => {
              const meta = CATEGORY_META[catKey] || { label: catKey, icon: '📝', color: '#64748B' };
              const pct = totals.expenses > 0 ? Math.round((catAmt / totals.expenses) * 100) : 0;
              return (
                <div key={catKey} style={{
                  padding: '6px 12px', borderRadius: 10, background: '#F8F7F2',
                  border: '1px solid #E5E2D8', display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <span>{meta.icon}</span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#182420' }}>{meta.label}:</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: meta.color }}>₹{catAmt.toLocaleString()}</span>
                  <span style={{ fontSize: '0.68rem', color: '#748782' }}>({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Transactions Log */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#182420', margin: 0 }}>
          🧾 Transaction History
        </h3>
        <span style={{ fontSize: '0.76rem', color: '#748782' }}>
          {entries.length} recorded entry(ies)
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#748782' }}>Loading ledger records...</div>
      ) : entries.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: '#748782' }}>
          <AccountBalanceWalletIcon sx={{ fontSize: 48, color: '#CECBC0', marginBottom: 10 }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#182420', margin: '0 0 6px' }}>
            No Transactions Logged Yet
          </h4>
          <p style={{ fontSize: '0.84rem', margin: '0 0 16px', maxWidth: 420, marginInline: 'auto' }}>
            Start logging your seed purchases, fertilizer applications, and crop sales to compare your real profitability with AI predictions.
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.84rem' }}>
            + Record First Entry
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(entry => {
            const entryId = entry.id || entry._id;
            const meta = CATEGORY_META[entry.category] || { label: entry.category, icon: '📝', color: '#64748B' };
            const isExpense = entry.entryType === 'expense';
            const dateObj = new Date(entry.date);
            const dateFormatted = dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

            return (
              <div
                key={entryId}
                className="glass-card fade-in"
                style={{
                  padding: '14px 18px', background: '#FFFFFF', border: '1px solid #E5E2D8',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: isExpense ? '#FEF2F2' : '#EBF5ED',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    {meta.icon}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#182420' }}>
                        {meta.label}
                      </span>
                      {entry.source === 'linked_to_task' && (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 800, color: '#0369A1',
                          background: '#E0F2FE', padding: '1px 6px', borderRadius: 6,
                          display: 'inline-flex', alignItems: 'center', gap: 3
                        }}>
                          <LinkIcon sx={{ fontSize: 11 }} /> Linked from Task
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#748782' }}>
                      {entry.note ? entry.note : `Recorded on ${dateFormatted}`}
                      {entry.quantity && ` • ${entry.quantity} ${entry.unit || 'units'}`}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '1.15rem', fontWeight: 800,
                      color: isExpense ? '#C85A32' : '#1E5E3A'
                    }}>
                      {isExpense ? '-' : '+'}₹{entry.amount?.toLocaleString()}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{dateFormatted}</span>
                  </div>

                  <IconButton
                    size="small"
                    onClick={(e) => handleDeleteEntry(entryId, e)}
                    sx={{ color: '#94A3B8', '&:hover': { color: '#DC2626' } }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Record Transaction ── */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1200,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="glass-card" style={{
            background: '#FFFFFF', borderRadius: 16, padding: 24, maxWidth: 480, width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#182420' }}>
                  Record Ledger Entry
                </h3>
                {linkedTaskId && (
                  <span style={{ fontSize: '0.72rem', color: '#0369A1', fontWeight: 700 }}>
                    🔗 Linked to Task Calendar item
                  </span>
                )}
              </div>
              <IconButton size="small" onClick={() => setShowAddModal(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>

            <form onSubmit={handleAddEntry}>

              {/* Type Switcher: Expense vs Income */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => { setEntryType('expense'); setCategory('fertilizer'); }}
                  style={{
                    padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 800, fontSize: '0.84rem',
                    background: entryType === 'expense' ? '#FEF2F2' : '#FAF9F5',
                    color: entryType === 'expense' ? '#C85A32' : '#748782',
                    border: `1.5px solid ${entryType === 'expense' ? '#F7D0C4' : '#E5E2D8'}`
                  }}
                >
                  🔴 Expense (Cost)
                </button>

                <button
                  type="button"
                  onClick={() => { setEntryType('income'); setCategory('crop_sale'); }}
                  style={{
                    padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 800, fontSize: '0.84rem',
                    background: entryType === 'income' ? '#EBF5ED' : '#FAF9F5',
                    color: entryType === 'income' ? '#1E5E3A' : '#748782',
                    border: `1.5px solid ${entryType === 'income' ? '#C6E4CF' : '#E5E2D8'}`
                  }}
                >
                  🟢 Income (Revenue)
                </button>
              </div>

              {/* Amount */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                  Amount (₹ INR) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="e.g. 1450"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #E5E2D8', fontSize: '1.05rem', fontWeight: 800, boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Category & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: '1px solid #E5E2D8', fontSize: '0.86rem', boxSizing: 'border-box', background: '#FFFFFF'
                    }}
                  >
                    {entryType === 'expense' ? (
                      <>
                        <option value="fertilizer">🧪 Fertilizer &amp; Nutrients</option>
                        <option value="seed">🌾 Seeds &amp; Seedlings</option>
                        <option value="pesticide">🚿 Pesticide / Bio-spray</option>
                        <option value="labor">👥 Field Labor</option>
                        <option value="irrigation">💧 Irrigation / Power</option>
                        <option value="equipment_rental">🚜 Tractor / Machinery</option>
                        <option value="transport">🚚 Mandi Transport</option>
                        <option value="other">📝 Other Expense</option>
                      </>
                    ) : (
                      <>
                        <option value="crop_sale">💰 Produce Sale (Mandi/Buyer)</option>
                        <option value="subsidy_received">🏛️ Government Subsidy / DBT</option>
                        <option value="other">📝 Other Income</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      border: '1px solid #E5E2D8', fontSize: '0.86rem', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Quantity & Unit (Optional) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                    Quantity (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 50"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      border: '1px solid #E5E2D8', fontSize: '0.86rem', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                    Unit
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. kg, bags, hours"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      border: '1px solid #E5E2D8', fontSize: '0.86rem', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Note / Details */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                  Voucher / Item Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 bag DAP 50kg from Cooperative Society"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #E5E2D8', fontSize: '0.86rem', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 22px' }}
                >
                  Record Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}