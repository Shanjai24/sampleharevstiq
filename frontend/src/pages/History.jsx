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
import PlaceIcon from '@mui/icons-material/Place';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';

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
        ? `${farmData.location.district} Farm Plot`
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
      <div className="fade-in" style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: '#182420', letterSpacing: '-0.02em' }}>
          Saved Plots & Harvest Feedback Records
        </h1>
        <p style={{ color: '#748782', fontSize: '0.88rem', marginTop: 4 }}>
          Bookmark your agricultural plots and log post-harvest yield feedback for ML self-learning
        </p>
      </div>

      {/* Save Current Location Form Card */}
      {(location || farmData) && (
        <div className="glass-card fade-in" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, background: '#EBF5ED',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <BookmarkIcon sx={{ color: '#1E5E3A', fontSize: 20 }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                Bookmark Active Farm Plot
              </h3>
              <span style={{ fontSize: '0.74rem', color: '#748782' }}>
                Save this plot's coordinates for quick re-analysis
              </span>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 10,
              background: '#FDF3F0', border: '1px solid #F7D0C4',
              color: '#C85A32', fontSize: '0.84rem', marginBottom: 16
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
              sx={{
                '& .MuiInputBase-root': { background: '#F8F7F2', borderRadius: '10px', color: '#182420', fontWeight: 600 },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E2D8' }
              }}
            />
            <TextField
              fullWidth
              size="small"
              label={t('history.notes') || 'Plot Notes / Crop Type (Optional)'}
              value={notes}
              placeholder="e.g. Clay loam soil, borewell drilled in 2024"
              disabled={!!loadingFarmId}
              onChange={e => setNotes(e.target.value)}
              sx={{
                '& .MuiInputBase-root': { background: '#F8F7F2', borderRadius: '10px', color: '#182420' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E2D8' }
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={handleSave}
              disabled={saving || !farmName.trim() || !!loadingFarmId}
              className="btn-accent"
              style={{
                opacity: saving || !farmName.trim() ? 0.6 : 1,
                cursor: saving || !farmName.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Saving Plot...' : '💾 Save Plot Location'}
            </button>
            {!farmName.trim() && (
              <span style={{ fontSize: '0.76rem', color: '#B45309', fontWeight: 600 }}>
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
          background: 'rgba(24, 36, 32, 0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 20
        }}>
          <div className="glass-card fade-in" style={{ maxWidth: 520, width: '100%', padding: 28, background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#182420', margin: 0 }}>
                  📝 Post-Harvest Feedback
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#1E5E3A', fontWeight: 700 }}>
                  Plot: {activeFeedbackFarm.farmName}
                </span>
              </div>
              <IconButton onClick={() => setActiveFeedbackFarm(null)} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#485954', marginBottom: 18, lineHeight: 1.5 }}>
              Submit your actual harvest numbers to continuously improve AgroPredict's localized ML yield models.
            </p>

            <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.76rem', color: '#485954', display: 'block', marginBottom: 4, fontWeight: 700 }}>
                  Crop Harvested
                </label>
                <input
                  type="text" value={feedbackCrop} onChange={e => setFeedbackCrop(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    background: '#F8F7F2', border: '1px solid #E5E2D8', color: '#182420',
                    fontSize: '0.88rem', fontWeight: 600, outline: 'none'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#485954', display: 'block', marginBottom: 4, fontWeight: 700 }}>
                    Actual Yield (Tons / Acre)
                  </label>
                  <input
                    type="number" step="0.1" value={actualYield} onChange={e => setActualYield(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      background: '#F8F7F2', border: '1px solid #E5E2D8', color: '#182420',
                      fontSize: '0.88rem', fontWeight: 700, outline: 'none'
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#485954', display: 'block', marginBottom: 4, fontWeight: 700 }}>
                    Actual Net Profit (INR / Acre)
                  </label>
                  <input
                    type="number" value={actualProfit} onChange={e => setActualProfit(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      background: '#F8F7F2', border: '1px solid #E5E2D8', color: '#182420',
                      fontSize: '0.88rem', fontWeight: 700, outline: 'none'
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: '#485954', display: 'block', marginBottom: 4, fontWeight: 700 }}>
                  Agronomic Notes & Comments
                </label>
                <textarea
                  rows={2} value={feedbackNotes} onChange={e => setFeedbackNotes(e.target.value)}
                  placeholder="e.g. Applied DAP at sowing. Weather was favorable."
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    background: '#F8F7F2', border: '1px solid #E5E2D8', color: '#182420',
                    fontSize: '0.84rem', outline: 'none', resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button" onClick={() => setActiveFeedbackFarm(null)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={feedbackSubmitting}
                  className="btn-accent"
                  style={{ flex: 1 }}
                >
                  {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saved Plots Grid */}
      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 16, color: '#182420' }}>
        🏡 Bookmarked Farm Plots ({farms.length})
      </h3>

      {farms.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px', color: '#748782' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌱</div>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: '#182420', margin: 0 }}>
            {t('history.noFarms') || 'No saved farm locations yet.'}
          </p>
          <p style={{ fontSize: '0.84rem', color: '#748782', marginTop: 4 }}>
            Analyze a farm plot on the map and tap "Save Plot Location" to access it anytime.
          </p>
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
                    <h4 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0, color: '#182420' }}>
                      🏡 {farm.farmName}
                    </h4>
                    <span style={{ fontSize: '0.68rem', color: '#1E5E3A', background: '#EBF5ED', border: '1px solid #C6E4CF', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>
                      PLOT #{i + 1}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: '#485954', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <PlaceIcon sx={{ fontSize: 16, color: '#C85A32' }} />
                    <span>{farm.district || ''}{farm.district && farm.state ? ', ' : ''}{farm.state || ''}</span>
                    <span style={{ color: '#748782', fontSize: '0.75rem' }}>({farm.lat?.toFixed(4)}, {farm.lng?.toFixed(4)})</span>
                  </p>

                  {farm.notes && (
                    <p style={{ fontSize: '0.8rem', color: '#485954', background: '#F8F7F2', border: '1px solid #E5E2D8', padding: '8px 12px', borderRadius: 8, margin: '8px 0 0' }}>
                      📝 {farm.notes}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #E5E2D8' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveFeedbackFarm(farm); }}
                    style={{
                      background: '#FFF8E7', border: '1px solid #FCE4B6',
                      color: '#B45309', padding: '5px 12px', borderRadius: 8, fontSize: '0.76rem',
                      fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
                    }}
                  >
                    <RateReviewIcon sx={{ fontSize: 16 }} />
                    <span>Log Harvest</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isThisLoading ? (
                      <CircularProgress size={20} sx={{ color: '#1E5E3A' }} />
                    ) : (
                      <>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E5E3A', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Load Analysis <ArrowForwardIcon sx={{ fontSize: 14 }} />
                        </span>
                        <IconButton
                          disabled={!!loadingFarmId}
                          onClick={(e) => { e.stopPropagation(); handleDelete(farm._id || farm.id); }}
                          sx={{ color: '#C85A32', padding: 0.5 }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <CheckCircleIcon sx={{ color: '#1E5E3A', fontSize: 22 }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#182420', margin: 0 }}>
              Verified Harvest Submissions ({feedbacks.length})
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {feedbacks.map((fb, idx) => (
              <div key={idx} className="glass-card" style={{ padding: 18, background: '#F8F7F2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: '0.95rem', color: '#182420' }}>🌾 {fb.crop} ({fb.farmName})</strong>
                  <span className="badge-live" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                    LOGGED
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#485954', margin: '4px 0' }}>
                  Actual Harvest: <strong>{fb.actualYield} tons/ac</strong> {fb.yieldDelta != null ? `(Δ ${fb.yieldDelta >= 0 ? `+${fb.yieldDelta}` : fb.yieldDelta})` : ''}
                </p>
                <p style={{ fontSize: '0.82rem', color: '#485954', margin: '4px 0' }}>
                  Realized Net Profit: <strong style={{ color: '#1E5E3A' }}>₹{fb.actualProfit?.toLocaleString()}</strong>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
