import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import { saveHistory, getHistory, deleteHistory, analyseFarm, getUserId, submitHarvestFeedback, getHarvestFeedbacks } from '../services/api';
import TextField from '@mui/material/TextField';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import RateReviewIcon from '@mui/icons-material/RateReview';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function History() {
  const { farmData, location, setFarmData, setLocation } = useContext(FarmContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [farms, setFarms] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [farmName, setFarmName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingFarmId, setLoadingFarmId] = useState(null);
  const [error, setError] = useState('');

  // Feedback modal state
  const [activeFeedbackFarm, setActiveFeedbackFarm] = useState(null);
  const [actualYield, setActualYield] = useState('2.5');
  const [actualProfit, setActualProfit] = useState('45000');
  const [feedbackCrop, setFeedbackCrop] = useState('Rice');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const userId = getUserId();

  const loadData = () => {
    getHistory(userId).then(d => setFarms(d.farms || [])).catch(() => {});
    getHarvestFeedbacks(userId).then(d => setFeedbacks(d.feedbacks || [])).catch(() => {});
  };

  useEffect(() => {
    loadData();
    if (!farmName && (farmData || location)) {
      const defaultName = farmData?.location?.district 
        ? `${farmData.location.district} Plot`
        : 'My Farm Plot';
      setFarmName(defaultName);
    }
  }, [userId, farmData, location]);

  const handleSave = async () => {
    if (!farmName.trim()) return;
    setSaving(true);
    setError('');
    const lat = location?.lat || farmData?.location?.lat;
    const lng = location?.lng || farmData?.location?.lng;
    try {
      await saveHistory({
        userId, farmName, lat, lng,
        district: farmData?.location?.district, state: farmData?.location?.state, notes
      });
      setFarmName(''); setNotes('');
      loadData();
    } catch (e) {
      console.error(e);
      setError('Failed to save the farm location. Please check your backend connection.');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      setError('');
      await deleteHistory(id);
      setFarms(f => f.filter(x => (x._id || x.id) !== id));
    } catch (e) {
      console.error(e);
      setError('Failed to delete the saved farm.');
    }
  };

  const handleLoadFarm = async (farm) => {
    if (loadingFarmId) return;
    const id = farm._id || farm.id;
    setLoadingFarmId(id);
    setError('');
    try {
      setLocation({ lat: farm.lat, lng: farm.lng });
      const data = await analyseFarm(farm.lat, farm.lng);
      setFarmData(data);
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      setError(`Failed to load farm analysis for "${farm.farmName}".`);
    } finally {
      setLoadingFarmId(null);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!activeFeedbackFarm) return;
    setFeedbackSubmitting(true);
    try {
      await submitHarvestFeedback({
        userId,
        farmName: activeFeedbackFarm.farmName,
        crop: feedbackCrop,
        soilInputTier: farmData?.soilTierInfo?.tier || 'regional_fallback',
        predictedYield: 2.2,
        actualYield: parseFloat(actualYield),
        predictedProfit: 38000,
        actualProfit: parseFloat(actualProfit),
        feedbackNotes
      });
      setActiveFeedbackFarm(null);
      setFeedbackNotes('');
      loadData();
    } catch (err) {
      console.error('Feedback submit error:', err);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: 24 }}>
        <h1 className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
          📋 Saved Plots & Harvest Feedback Records
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>
          Bookmark your agricultural plots and record post-harvest actual yields to fuel AgroPredict's continuous retraining model
        </p>
      </div>

      {/* Save Current Location Form Card */}
      {(location || farmData) && (
        <div className="glass-card fade-in" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <BookmarkIcon sx={{ color: '#2dd4bf' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#2dd4bf' }}>
              Save Active Plot Location
            </h3>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444', fontSize: '0.82rem', marginBottom: 16
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 16 }}>
            <TextField
              fullWidth
              size="small"
              required
              label={t('history.farmName') || 'Farm Plot Name'}
              value={farmName}
              placeholder="e.g. North Acre Paddy Field"
              disabled={!!loadingFarmId}
              onChange={e => setFarmName(e.target.value)}
              sx={{ '& .MuiInputBase-root': { color: '#f8fafc' }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
            />
            <TextField
              fullWidth
              size="small"
              label={t('history.notes') || 'Plot Notes / Crop Type (Optional)'}
              value={notes}
              placeholder="e.g. Clay loam soil, borewell drilled in 2024"
              disabled={!!loadingFarmId}
              onChange={e => setNotes(e.target.value)}
              sx={{ '& .MuiInputBase-root': { color: '#f8fafc' }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={handleSave}
              disabled={saving || !farmName.trim() || !!loadingFarmId}
              className="btn-accent"
              style={{
                opacity: saving || !farmName.trim() ? 0.5 : 1,
                cursor: saving || !farmName.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Saving Plot...' : '💾 Save Plot to History'}
            </button>
            {!farmName.trim() && (
              <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                ⚠️ Enter a plot name above to save
              </span>
            )}
          </div>
        </div>
      )}

      {/* Harvest Feedback Modal Form */}
      {activeFeedbackFarm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 20
        }}>
          <div className="glass-card" style={{ maxWidth: 500, width: '100%', padding: 28, background: '#12201c' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginBottom: 6 }}>
              📝 Record Harvest Feedback for "{activeFeedbackFarm.farmName}"
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 20 }}>
              Submit actual harvest numbers to train AgroPredict's continuous ML model.
            </p>

            <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Crop Harvested</label>
                <input
                  type="text" value={feedbackCrop} onChange={e => setFeedbackCrop(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b1210', border: '1px solid rgba(20,184,166,0.3)', color: '#fff' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Actual Yield (Tons / Acre)</label>
                  <input
                    type="number" step="0.1" value={actualYield} onChange={e => setActualYield(e.target.value)}
                    style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b1210', border: '1px solid rgba(20,184,166,0.3)', color: '#fff' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Actual Net Profit (INR / Acre)</label>
                  <input
                    type="number" value={actualProfit} onChange={e => setActualProfit(e.target.value)}
                    style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b1210', border: '1px solid rgba(20,184,166,0.3)', color: '#fff' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Notes & Feedback</label>
                <textarea
                  rows={2} value={feedbackNotes} onChange={e => setFeedbackNotes(e.target.value)}
                  placeholder="e.g. Applied DAP at sowing. Weather was favorable."
                  style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b1210', border: '1px solid rgba(20,184,166,0.3)', color: '#fff', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button
                  type="button" onClick={() => setActiveFeedbackFarm(null)}
                  style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={feedbackSubmitting}
                  style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#fff', cursor: 'pointer', fontWeight: 800 }}
                >
                  {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saved Plots Grid */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>
        🏡 Bookmarked Farm Plots ({farms.length})
      </h3>

      {farms.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌱</div>
          <p style={{ fontSize: '1rem', fontWeight: 600 }}>{t('history.noFarms') || 'No saved farm locations yet.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 32 }}>
          {farms.map((farm, i) => {
            const isThisLoading = loadingFarmId === (farm._id || farm.id);
            return (
              <div
                key={farm._id || farm.id || i}
                className="glass-card fade-in"
                style={{
                  padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  cursor: loadingFarmId ? 'not-allowed' : 'pointer',
                  opacity: loadingFarmId && !isThisLoading ? 0.6 : 1
                }}
                onClick={() => { if (farm.lat && farm.lng) handleLoadFarm(farm); }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h4 style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0, color: '#f8fafc' }}>
                      🏡 {farm.farmName}
                    </h4>
                    <span style={{ fontSize: '0.68rem', color: '#2dd4bf', background: 'rgba(20,184,166,0.12)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                      PLOT #{i + 1}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: 6 }}>
                    📍 {farm.district || ''}{farm.district && farm.state ? ', ' : ''}{farm.state || ''} • ({farm.lat?.toFixed(4)}, {farm.lng?.toFixed(4)})
                  </p>

                  {farm.notes && (
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', background: 'rgba(11,18,16,0.4)', padding: 8, borderRadius: 8, marginTop: 8 }}>
                      📝 {farm.notes}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(20,184,166,0.1)' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveFeedbackFarm(farm); }}
                    style={{
                      background: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.3)',
                      color: '#f59e0b', padding: '4px 10px', borderRadius: 8, fontSize: '0.72rem',
                      fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <RateReviewIcon fontSize="small" />
                    <span>Harvest Feedback</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isThisLoading ? (
                      <CircularProgress size={20} sx={{ color: '#2dd4bf' }} />
                    ) : (
                      <>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2dd4bf' }}>Load →</span>
                        <IconButton
                          disabled={!!loadingFarmId}
                          onClick={(e) => { e.stopPropagation(); handleDelete(farm._id || farm.id); }}
                          sx={{ color: '#ef4444', padding: 0.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submitted Feedback History Section */}
      {feedbacks.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', marginBottom: 14 }}>
            ✅ Verified Harvest Feedback Submissions ({feedbacks.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {feedbacks.map((fb, idx) => (
              <div key={idx} className="glass-card" style={{ padding: 16, background: 'rgba(16,185,129,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>🌾 {fb.crop} ({fb.farmName})</strong>
                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 800 }}>VERIFIED</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '4px 0' }}>
                  Actual Yield: <strong>{fb.actualYield} tons/ac</strong> (Δ {fb.yieldDelta >= 0 ? `+${fb.yieldDelta}` : fb.yieldDelta})
                </p>
                <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '4px 0' }}>
                  Actual Profit: <strong>₹{fb.actualProfit?.toLocaleString()}</strong>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
