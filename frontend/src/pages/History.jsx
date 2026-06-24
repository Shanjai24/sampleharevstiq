import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import { saveHistory, getHistory, deleteHistory } from '../services/api';
import TextField from '@mui/material/TextField';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';

export default function History() {
  const { farmData, location } = useContext(FarmContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [farms, setFarms] = useState([]);
  const [farmName, setFarmName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getHistory('default-user').then(d => setFarms(d.farms || [])).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!farmName.trim()) return;
    setSaving(true);
    const lat = location?.lat || farmData?.location?.lat;
    const lng = location?.lng || farmData?.location?.lng;
    try {
      await saveHistory({
        userId: 'default-user', farmName, lat, lng,
        district: farmData?.location?.district, state: farmData?.location?.state, notes
      });
      setFarmName(''); setNotes('');
      const updated = await getHistory('default-user');
      setFarms(updated.farms || []);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try { await deleteHistory(id); setFarms(f => f.filter(x => (x._id || x.id) !== id)); } catch (e) { console.error(e); }
  };

  return (
    <div style={{ padding: '16px 16px 80px', maxWidth: 600, margin: '0 auto' }}>
      <h1 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16 }}>📋 {t('history.title')}</h1>

      {/* Save Form */}
      {(location || farmData) && (
        <div className="glass-card fade-in" style={{ padding: 18, marginBottom: 16 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10, color: '#81c784' }}>💾 {t('history.save')}</p>
          <TextField fullWidth size="small" label={t('history.farmName')} value={farmName}
            onChange={e => setFarmName(e.target.value)} sx={{ mb: 1.5, '& .MuiInputBase-root': { color: '#e8f5e9' }, '& .MuiInputLabel-root': { color: '#607d6c' } }} />
          <TextField fullWidth size="small" label={t('history.notes')} value={notes}
            onChange={e => setNotes(e.target.value)} multiline rows={2} sx={{ mb: 1.5, '& .MuiInputBase-root': { color: '#e8f5e9' }, '& .MuiInputLabel-root': { color: '#607d6c' } }} />
          <button onClick={handleSave} disabled={saving || !farmName.trim()} style={{
            width: '100%', padding: '10px', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff',
            border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', opacity: saving ? 0.7 : 1
          }}>{saving ? 'Saving...' : t('common.save')}</button>
        </div>
      )}

      {/* Saved Farms List */}
      {farms.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 40, color: '#607d6c' }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🌱</p>
          <p>{t('history.noFarms')}</p>
        </div>
      ) : (
        farms.map((farm, i) => (
          <div key={farm._id || farm.id || i} className="glass-card fade-in" style={{
            padding: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer'
          }} onClick={() => { if (farm.lat && farm.lng) navigate('/dashboard'); }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>🏡 {farm.farmName}</p>
              <p style={{ fontSize: '0.75rem', color: '#607d6c', marginTop: 3 }}>
                📍 {farm.district || ''}{farm.district && farm.state ? ', ' : ''}{farm.state || ''} • {farm.lat?.toFixed(3)}, {farm.lng?.toFixed(3)}
              </p>
              {farm.notes && <p style={{ fontSize: '0.7rem', color: '#81c784', marginTop: 3 }}>{farm.notes}</p>}
              <p style={{ fontSize: '0.65rem', color: '#607d6c', marginTop: 3 }}>
                {new Date(farm.createdAt).toLocaleDateString()}
              </p>
            </div>
            <IconButton onClick={(e) => { e.stopPropagation(); handleDelete(farm._id || farm.id); }} sx={{ color: '#ef4444' }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </div>
        ))
      )}
    </div>
  );
}
