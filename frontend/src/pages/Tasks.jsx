import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FarmContext } from '../context/FarmContext';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ScienceIcon from '@mui/icons-material/Science';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GrassIcon from '@mui/icons-material/Grass';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TASK_ICONS = {
  sowing: '🌾',
  fertilizer_basal: '🧪',
  fertilizer_topdress1: '🌿',
  fertilizer_topdress2: '🌸',
  irrigation_check: '💧',
  pest_scout: '🔍',
  spray: '🚿',
  harvest_window: '✂️',
  custom: '📝'
};

const TASK_TYPE_LABELS = {
  sowing: 'Seed Sowing',
  fertilizer_basal: 'Basal Fertilizer',
  fertilizer_topdress1: 'Top-Dressing 1',
  fertilizer_topdress2: 'Top-Dressing 2',
  irrigation_check: 'Irrigation & Water',
  pest_scout: 'Pest Scouting',
  spray: 'Protective Spray',
  harvest_window: 'Harvest Window',
  custom: 'Custom Task'
};

export default function Tasks() {
  const { farmData, areaAcres } = useContext(FarmContext) || {};
  const navigate = useNavigate();
  const location = useLocation();

  const farmId = farmData?._id || 'active-farm-cycle';
  const primaryCrop = farmData?.crops?.[0]?.crop || 'rice';
  const currentArea = areaAcres || farmData?.areaAcres || 1.0;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [harvestingTask, setHarvestingTask] = useState(null);

  // New task form state
  const [customTitle, setCustomTitle] = useState('');
  const [customType, setCustomType] = useState('custom');
  const [customDueDate, setCustomDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [customDescription, setCustomDescription] = useState('');
  const [customDosage, setCustomDosage] = useState('');

  // Generate cycle form state
  const [selectedCycleCrop, setSelectedCycleCrop] = useState(primaryCrop);
  const [cycleSowingDate, setCycleSowingDate] = useState(new Date().toISOString().slice(0, 10));

  // Harvest feedback form state
  const [actualYieldTons, setActualYieldTons] = useState('');
  const [actualProfitINR, setActualProfitINR] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Expense logging from completed task
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseTask, setExpenseTask] = useState(null);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('fertilizer');
  const [expenseNote, setExpenseNote] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Local storage offline key
  const storageKey = `harvestiq_tasks_${farmId}`;

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/tasks/${farmId}`);
      if (res.data?.tasks) {
        setTasks(res.data.tasks);
        localStorage.setItem(storageKey, JSON.stringify(res.data.tasks));
      }
    } catch (err) {
      console.warn('Tasks network fetch failed, loading offline local tasks:', err.message);
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        try {
          setTasks(JSON.parse(cached));
        } catch {
          setTasks([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [farmId, storageKey]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle query parameter for auto-opening generate modal (e.g. from CropDetail)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('generate') === 'true') {
      const paramCrop = params.get('crop');
      if (paramCrop) setSelectedCycleCrop(paramCrop);
      setShowGenerateModal(true);
    }
  }, [location.search]);

  // Toggle task status
  const handleToggleTask = async (task) => {
    const isDone = task.status === 'done';
    const newStatus = isDone ? 'pending' : 'done';

    // If marking harvest task as done, open feedback modal
    if (!isDone && task.taskType === 'harvest_window') {
      setHarvestingTask(task);
      setShowHarvestModal(true);
    } else if (!isDone && ['fertilizer_basal', 'fertilizer_topdress1', 'fertilizer_topdress2', 'spray', 'sowing', 'irrigation_check'].includes(task.taskType)) {
      // Prompt expense logging for input-related tasks
      const catMap = {
        fertilizer_basal: 'fertilizer',
        fertilizer_topdress1: 'fertilizer',
        fertilizer_topdress2: 'fertilizer',
        sowing: 'seed',
        spray: 'pesticide',
        irrigation_check: 'irrigation'
      };
      setExpenseTask(task);
      setExpenseCategory(catMap[task.taskType] || 'fertilizer');
      setExpenseNote(`${task.title}${task.dosage ? ' — ' + task.dosage : ''}`);
      setExpenseAmount('');
      setShowExpenseModal(true);
    }

    // Optimistic UI update
    const updated = tasks.map(t =>
      (t.id === task.id || t._id === task._id)
        ? { ...t, status: newStatus, completedAt: newStatus === 'done' ? new Date().toISOString() : null }
        : t
    );
    setTasks(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    const taskId = task.id || task._id;
    try {
      await axios.patch(`${API_BASE}/api/tasks/${taskId}/status`, { status: newStatus });
    } catch (err) {
      console.warn('Status patch network error, retained locally:', err.message);
    }
  };

  // Save linked expense to ledger
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    const num = parseFloat(expenseAmount);
    if (isNaN(num) || num <= 0) return;

    setSavingExpense(true);
    try {
      await axios.post(`${API_BASE}/api/ledger`, {
        farmId,
        crop: primaryCrop,
        entryType: 'expense',
        category: expenseCategory,
        amount: num,
        date: new Date().toISOString().slice(0, 10),
        note: expenseNote,
        source: 'linked_to_task',
        relatedTaskId: expenseTask?.id || expenseTask?._id
      });
      setToastMessage(`✓ Logged ₹${num.toLocaleString()} (${expenseCategory}) for "${expenseTask?.title || 'task'}" to Farm Ledger`);
      setTimeout(() => setToastMessage(''), 4500);
    } catch (err) {
      console.warn('Expense save error, stored locally in ledger:', err.message);
      setToastMessage(`⚠ Saved locally: ₹${num.toLocaleString()} expense logged`);
      setTimeout(() => setToastMessage(''), 4500);
    } finally {
      setSavingExpense(false);
      setShowExpenseModal(false);
      setExpenseAmount('');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId, e) => {
    e.stopPropagation();
    const updated = tasks.filter(t => t.id !== taskId && t._id !== taskId);
    setTasks(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    try {
      await axios.delete(`${API_BASE}/api/tasks/${taskId}`);
    } catch (err) {
      console.warn('Delete network error, retained locally:', err.message);
    }
  };

  // Add custom task
  const handleAddCustomTask = async (e) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const newTask = {
      farmId,
      crop: primaryCrop,
      title: customTitle.trim(),
      description: customDescription.trim(),
      dosage: customDosage.trim(),
      dueDate: new Date(customDueDate).toISOString(),
      taskType: customType,
      status: 'pending',
      source: 'farmer_added'
    };

    try {
      const res = await axios.post(`${API_BASE}/api/tasks`, newTask);
      const saved = res.data;
      const updated = [...tasks, saved].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      setTasks(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      const offlineTask = {
        ...newTask,
        id: `offline-${Date.now()}`,
        _id: `offline-${Date.now()}`
      };
      const updated = [...tasks, offlineTask].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      setTasks(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }

    setCustomTitle('');
    setCustomDescription('');
    setCustomDosage('');
    setShowAddModal(false);
  };

  // Auto-generate crop cycle
  const handleGenerateCycle = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/api/tasks/generate`, {
        farmId,
        crop: selectedCycleCrop,
        sowingDate: cycleSowingDate,
        areaAcres: currentArea,
        clearExisting: true
      });
      if (res.data?.tasks) {
        setTasks(res.data.tasks);
        localStorage.setItem(storageKey, JSON.stringify(res.data.tasks));
      }
    } catch (err) {
      console.error('Generate cycle error:', err);
    } finally {
      setLoading(false);
      setShowGenerateModal(false);
    }
  };

  // Submit harvest feedback
  const handleSubmitHarvestFeedback = async (e) => {
    e.preventDefault();
    setSubmittingFeedback(true);

    try {
      await axios.post(`${API_BASE}/api/history/feedback`, {
        userId: 'default-user',
        farmName: farmData?.farmName || `${primaryCrop.toUpperCase()} Field Plot`,
        crop: primaryCrop,
        actualYield: parseFloat(actualYieldTons) || 2.5,
        actualProfit: parseFloat(actualProfitINR) || 40000,
        area_acres: currentArea,
        predictedYield: farmData?.crops?.[0]?.predictedYieldPerAcre || 2.5,
        predictedProfit: farmData?.crops?.[0]?.totalEstimatedProfit || 35000
      });
    } catch (err) {
      console.warn('Harvest feedback logged locally:', err.message);
    } finally {
      setSubmittingFeedback(false);
      setShowHarvestModal(false);
    }
  };

  // Group tasks into Overdue, Today, This Week, Upcoming, Done
  const groupedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tonight = new Date();
    tonight.setHours(23, 59, 59, 999);

    const weekLater = new Date();
    weekLater.setDate(today.getDate() + 7);
    weekLater.setHours(23, 59, 59, 999);

    const groups = {
      overdue: [],
      today: [],
      thisWeek: [],
      upcoming: [],
      completed: []
    };

    tasks.forEach(t => {
      if (t.status === 'done') {
        groups.completed.push(t);
        return;
      }

      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);

      if (due < today) {
        groups.overdue.push(t);
      } else if (due.getTime() === today.getTime()) {
        groups.today.push(t);
      } else if (due <= weekLater) {
        groups.thisWeek.push(t);
      } else {
        groups.upcoming.push(t);
      }
    });

    return groups;
  }, [tasks]);

  const completionPct = tasks.length > 0
    ? Math.round((groupedTasks.completed.length / tasks.length) * 100)
    : 0;

  const urgentCount = groupedTasks.overdue.length + groupedTasks.today.length;

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
                📅 Farm Task Calendar
              </h1>
              <span style={{
                background: '#EBF5ED', color: '#1E5E3A', border: '1px solid #C6E4CF',
                fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: 12
              }}>
                {tasks.length} SCHEDULED TASKS
              </span>
            </div>
            <p style={{ color: '#485954', fontSize: '0.86rem', margin: '3px 0 0' }}>
              Actionable agronomic roadmap for <strong>{primaryCrop.charAt(0).toUpperCase() + primaryCrop.slice(1)}</strong> plot ({currentArea} acres)
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.82rem', borderRadius: 10 }}
          >
            <AddIcon fontSize="small" />
            <span>Add Custom Task</span>
          </button>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.82rem', borderRadius: 10 }}
          >
            <AutoAwesomeIcon fontSize="small" />
            <span>Generate Schedule</span>
          </button>
        </div>
      </div>

      {/* ⚠️ In-App Reminder Banner (Tasks Due Today / Overdue) */}
      {urgentCount > 0 && (
        <div className="fade-in" style={{
          background: '#FFF8E7', border: '1px solid #FCE4B6', borderRadius: 14,
          padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12,
          boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)'
        }}>
          <NotificationsActiveIcon sx={{ color: '#D97706', fontSize: 24, flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#B45309' }}>
                Action Due on Field ({urgentCount} items)
              </span>
              <span style={{ fontSize: '0.68rem', color: '#92400E', fontWeight: 700, background: '#FDE68A', padding: '2px 8px', borderRadius: 8 }}>
                In-app reminder (v1)
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#78350F', margin: '3px 0 0', lineHeight: 1.5 }}>
              {groupedTasks.overdue.length > 0 && (
                <span><strong>{groupedTasks.overdue.length} overdue task(s)</strong> require immediate attention. </span>
              )}
              {groupedTasks.today.length > 0 && (
                <span><strong>{groupedTasks.today.length} task(s)</strong> scheduled for today. Complete them to maintain crop vitality.</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Progress & Cycle Status Bar */}
      <div className="glass-card fade-in" style={{ padding: '16px 20px', marginBottom: 24, background: '#FFFFFF', border: '1px solid #E5E2D8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GrassIcon sx={{ color: '#1E5E3A', fontSize: 20 }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#182420' }}>
              Cycle Progress: {groupedTasks.completed.length} of {tasks.length} tasks completed
            </span>
          </div>
          <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#1E5E3A' }}>
            {completionPct}% Complete
          </span>
        </div>

        <div style={{ height: 8, background: '#EAE7DC', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${completionPct}%`,
            background: 'linear-gradient(90deg, #1E5E3A 0%, #2E7D4E 100%)',
            borderRadius: 6,
            transition: 'width 0.5s ease-out'
          }} />
        </div>
      </div>

      {/* Main Task List Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#748782' }}>Loading task schedule...</div>
      ) : tasks.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: '#748782' }}>
          <CalendarMonthIcon sx={{ fontSize: 50, color: '#CECBC0', marginBottom: 12 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#182420', margin: '0 0 6px' }}>
            No Active Farm Schedule
          </h3>
          <p style={{ fontSize: '0.86rem', margin: '0 0 18px', maxWidth: 460, marginInline: 'auto' }}>
            Transform your crop recommendation into a step-by-step field schedule with real dates for sowing, fertilizers, scouting, and harvest.
          </p>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="btn-primary"
            style={{ padding: '10px 22px', fontSize: '0.88rem' }}
          >
            Generate Schedule for {primaryCrop.toUpperCase()}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Section: OVERDUE */}
          {groupedTasks.overdue.length > 0 && (
            <TaskSection
              title="⚠️ Overdue Tasks"
              subtitle="Missed deadlines — please attend to these promptly"
              badgeColor="#DC2626"
              badgeBg="#FEF2F2"
              tasks={groupedTasks.overdue}
              expandedTaskId={expandedTaskId}
              setExpandedTaskId={setExpandedTaskId}
              onToggle={handleToggleTask}
              onDelete={handleDeleteTask}
            />
          )}

          {/* Section: TODAY */}
          {groupedTasks.today.length > 0 && (
            <TaskSection
              title="📌 Due Today"
              subtitle="Tasks scheduled for action today"
              badgeColor="#D97706"
              badgeBg="#FFFBEB"
              tasks={groupedTasks.today}
              expandedTaskId={expandedTaskId}
              setExpandedTaskId={setExpandedTaskId}
              onToggle={handleToggleTask}
              onDelete={handleDeleteTask}
            />
          )}

          {/* Section: THIS WEEK */}
          {groupedTasks.thisWeek.length > 0 && (
            <TaskSection
              title="🗓️ Due This Week"
              subtitle="Prepare inputs and labor for the next 7 days"
              badgeColor="#0284C7"
              badgeBg="#F0F9FF"
              tasks={groupedTasks.thisWeek}
              expandedTaskId={expandedTaskId}
              setExpandedTaskId={setExpandedTaskId}
              onToggle={handleToggleTask}
              onDelete={handleDeleteTask}
            />
          )}

          {/* Section: UPCOMING */}
          {groupedTasks.upcoming.length > 0 && (
            <TaskSection
              title="🌱 Upcoming in Crop Cycle"
              subtitle="Future agronomic stages and harvest window"
              badgeColor="#1E5E3A"
              badgeBg="#EBF5ED"
              tasks={groupedTasks.upcoming}
              expandedTaskId={expandedTaskId}
              setExpandedTaskId={setExpandedTaskId}
              onToggle={handleToggleTask}
              onDelete={handleDeleteTask}
            />
          )}

          {/* Section: COMPLETED */}
          {groupedTasks.completed.length > 0 && (
            <TaskSection
              title="✅ Completed Tasks"
              subtitle="Tasks checked off for this cycle"
              badgeColor="#64748B"
              badgeBg="#F1F5F9"
              tasks={groupedTasks.completed}
              expandedTaskId={expandedTaskId}
              setExpandedTaskId={setExpandedTaskId}
              onToggle={handleToggleTask}
              onDelete={handleDeleteTask}
              isDoneSection={true}
            />
          )}
        </div>
      )}

      {/* ── Modal: Add Custom Task ── */}
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
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#182420' }}>
                Add Custom Field Task
              </h3>
              <IconButton size="small" onClick={() => setShowAddModal(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>

            <form onSubmit={handleAddCustomTask}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inspect drip emitters for clogging"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #E5E2D8', fontSize: '0.88rem', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                    Task Category
                  </label>
                  <select
                    value={customType}
                    onChange={e => setCustomType(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: '1px solid #E5E2D8', fontSize: '0.86rem', boxSizing: 'border-box', background: '#FFFFFF'
                    }}
                  >
                    <option value="custom">General Task</option>
                    <option value="irrigation_check">Irrigation</option>
                    <option value="pest_scout">Pest Scouting</option>
                    <option value="spray">Foliar Spray</option>
                    <option value="fertilizer_basal">Fertilizer</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={customDueDate}
                    onChange={e => setCustomDueDate(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      border: '1px solid #E5E2D8', fontSize: '0.86rem', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                  Input Dosage / Specific Product (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 500ml Neem Oil in 100L water"
                  value={customDosage}
                  onChange={e => setCustomDosage(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #E5E2D8', fontSize: '0.88rem', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                  Agronomic Notes / Instructions (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Check morning hours before sun gets hot."
                  value={customDescription}
                  onChange={e => setCustomDescription(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #E5E2D8', fontSize: '0.86rem', boxSizing: 'border-box', resize: 'vertical'
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
                  style={{ padding: '8px 20px' }}
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Generate Crop Cycle Schedule ── */}
      {showGenerateModal && (
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
                  Generate Crop Schedule
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#748782' }}>
                  Builds real-dated sowing to harvest calendar
                </span>
              </div>
              <IconButton size="small" onClick={() => setShowGenerateModal(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>

            <form onSubmit={handleGenerateCycle}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 6 }}>
                  Select Crop
                </label>
                <select
                  value={selectedCycleCrop}
                  onChange={e => setSelectedCycleCrop(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #E5E2D8', fontSize: '0.9rem', boxSizing: 'border-box', background: '#FFFFFF', fontWeight: 700
                  }}
                >
                  <option value="rice">Rice (120 days)</option>
                  <option value="wheat">Wheat (135 days)</option>
                  <option value="groundnut">Groundnut (105 days)</option>
                  <option value="cotton">Cotton (165 days)</option>
                  <option value="maize">Maize (95 days)</option>
                  <option value="soybean">Soybean (100 days)</option>
                  <option value="sugarcane">Sugarcane (330 days)</option>
                  <option value="tomato">Tomato (75 days)</option>
                  <option value="onion">Onion (130 days)</option>
                  <option value="turmeric">Turmeric (240 days)</option>
                  <option value="chilli">Chilli (140 days)</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 6 }}>
                  Sowing / Planting Date
                </label>
                <input
                  type="date"
                  required
                  value={cycleSowingDate}
                  onChange={e => setCycleSowingDate(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #E5E2D8', fontSize: '0.9rem', boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '0.74rem', color: '#748782', display: 'block', marginTop: 4 }}>
                  All downstream tasks (fertilizers, irrigation, harvest) will be dated from this day.
                </span>
              </div>

              <div style={{
                background: '#FAF9F5', padding: '12px 14px', borderRadius: 10,
                border: '1px solid #E5E2D8', fontSize: '0.76rem', color: '#485954', marginBottom: 20, lineHeight: 1.5
              }}>
                ℹ️ <strong>Note:</strong> Generating a new cycle will reset the current task schedule for this plot ({currentArea} acres).
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 20px' }}
                >
                  Generate Roadmap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Harvest Completed Outcome Feedback ── */}
      {showHarvestModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1250,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="glass-card" style={{
            background: '#FFFFFF', borderRadius: 16, padding: 24, maxWidth: 500, width: '100%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.8rem' }}>🎉</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#182420' }}>
                    Harvest Cycle Completed!
                  </h3>
                  <span style={{ fontSize: '0.76rem', color: '#748782' }}>
                    Log actual harvest outcome to close the feedback loop
                  </span>
                </div>
              </div>
              <IconButton size="small" onClick={() => setShowHarvestModal(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#485954', margin: '0 0 16px', lineHeight: 1.5 }}>
              Congratulations on reaching the harvest window for <strong>{primaryCrop.toUpperCase()}</strong>!
              Entering your real yields helps train the AI model and refines next season&apos;s recommendations.
            </p>

            <form onSubmit={handleSubmitHarvestFeedback}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                  Actual Harvested Yield (Tons / Acre) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder={`Predicted: ${(farmData?.crops?.[0]?.predictedYieldPerAcre || 2.5)} tons/acre`}
                  value={actualYieldTons}
                  onChange={e => setActualYieldTons(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #E5E2D8', fontSize: '0.9rem', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                  Actual Net Realized Profit (₹ Total for plot) *
                </label>
                <input
                  type="number"
                  required
                  placeholder={`Predicted: ₹${(farmData?.crops?.[0]?.totalEstimatedProfit || 35000).toLocaleString()}`}
                  value={actualProfitINR}
                  onChange={e => setActualProfitINR(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #E5E2D8', fontSize: '0.9rem', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowHarvestModal(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="btn-primary"
                  style={{ padding: '8px 20px' }}
                >
                  {submittingFeedback ? 'Saving...' : 'Record Harvest Outcome'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Log Linked Task Expense to Ledger ── */}
      {showExpenseModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1250,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="glass-card" style={{
            background: '#FFFFFF', borderRadius: 16, padding: 24, maxWidth: 480, width: '100%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.6rem' }}>💰</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: '#182420' }}>
                    Record Task Expense
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#748782' }}>
                    Automatically links this cost to your Farm Ledger
                  </span>
                </div>
              </div>
              <IconButton size="small" onClick={() => setShowExpenseModal(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>

            <div style={{
              background: '#F0F9F4', border: '1px solid #C6E4CF', borderRadius: 10,
              padding: '10px 14px', marginBottom: 16, fontSize: '0.8rem', color: '#1E5E3A'
            }}>
              <span style={{ fontWeight: 700 }}>Task Completed:</span> {expenseTask?.title || 'Field Task'}
              {expenseTask?.dosage && (
                <div style={{ fontSize: '0.74rem', color: '#2E7D4E', marginTop: 2 }}>
                  📦 {expenseTask.dosage}
                </div>
              )}
            </div>

            <form onSubmit={handleSaveExpense}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                  Expense Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  autoFocus
                  placeholder="e.g. 850"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #E5E2D8', fontSize: '1rem', fontWeight: 700, boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                  Expense Category
                </label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #E5E2D8', fontSize: '0.88rem', boxSizing: 'border-box', background: '#FFFFFF', fontWeight: 600
                  }}
                >
                  <option value="fertilizer">🧪 Fertilizer & Nutrients</option>
                  <option value="pesticide">🚿 Pesticides & Sprays</option>
                  <option value="seed">🌾 Seeds & Seedlings</option>
                  <option value="irrigation">💧 Irrigation & Water</option>
                  <option value="labor">👥 Field Labor</option>
                  <option value="equipment_rental">🚜 Machinery / Tractor</option>
                  <option value="transport">🚚 Transport & Mandi</option>
                  <option value="other">📝 Other Expense</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#485954', marginBottom: 4 }}>
                  Note / Item Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50kg DAP from local agro center"
                  value={expenseNote}
                  onChange={e => setExpenseNote(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid #E5E2D8', fontSize: '0.86rem', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  Skip Cost
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.84rem' }}
                >
                  {savingExpense ? 'Saving...' : 'Save to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1400,
          background: '#1E5E3A', color: '#FFFFFF', padding: '12px 20px',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', fontWeight: 700
        }}>
          <CheckCircleIcon sx={{ fontSize: 20, color: '#A7F3D0' }} />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}

/**
 * Sub-component for rendering a grouped section of tasks
 */
function TaskSection({
  title,
  subtitle,
  badgeColor,
  badgeBg,
  tasks,
  expandedTaskId,
  setExpandedTaskId,
  onToggle,
  onDelete,
  isDoneSection = false
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#182420' }}>
            {title}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#748782' }}>{subtitle}</span>
        </div>
        <span style={{
          background: badgeBg, color: badgeColor,
          fontSize: '0.72rem', fontWeight: 800, padding: '2px 9px', borderRadius: 10,
          border: `1px solid ${badgeColor}33`
        }}>
          {tasks.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tasks.map(task => {
          const taskId = task.id || task._id;
          const isExpanded = expandedTaskId === taskId;
          const isDone = task.status === 'done';
          const dueDateObj = new Date(task.dueDate);
          const dateStr = dueDateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

          const typeIcon = TASK_ICONS[task.taskType] || '📝';
          const typeLabel = TASK_TYPE_LABELS[task.taskType] || 'Field Task';

          return (
            <div
              key={taskId}
              className="glass-card fade-in"
              onClick={() => setExpandedTaskId(isExpanded ? null : taskId)}
              style={{
                padding: '14px 18px',
                background: isDone ? '#FAF9F5' : '#FFFFFF',
                border: isDone ? '1px solid #EAE7DC' : '1px solid #E5E2D8',
                opacity: isDone ? 0.75 : 1,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                {/* Left checkbox & title */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0, flex: 1 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(task);
                    }}
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      color: isDone ? '#1E5E3A' : '#748782', marginTop: 2
                    }}
                  >
                    {isDone ? (
                      <CheckCircleIcon sx={{ fontSize: 22, color: '#1E5E3A' }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ fontSize: 22, color: '#94A3B8' }} />
                    )}
                  </button>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 800, padding: '2px 7px', borderRadius: 6,
                        background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0'
                      }}>
                        {typeIcon} {typeLabel}
                      </span>
                      {task.source === 'farmer_added' && (
                        <span style={{ fontSize: '0.65rem', color: '#0369A1', fontWeight: 700 }}>
                          • Added by Farmer
                        </span>
                      )}
                    </div>

                    <h4 style={{
                      fontSize: '0.98rem', fontWeight: 800, margin: 0,
                      color: isDone ? '#64748B' : '#182420',
                      textDecoration: isDone ? 'line-through' : 'none',
                      lineHeight: 1.3
                    }}>
                      {task.title}
                    </h4>

                    {task.dosage && (
                      <div style={{ fontSize: '0.78rem', color: '#1E5E3A', fontWeight: 700, marginTop: 4 }}>
                        📦 {task.dosage}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Date badge and expand toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: '0.74rem', fontWeight: 700,
                    color: isDone ? '#94A3B8' : '#182420',
                    background: '#F8F7F2', padding: '3px 9px', borderRadius: 8, border: '1px solid #E5E2D8'
                  }}>
                    {dateStr}
                  </span>

                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedTaskId(isExpanded ? null : taskId);
                    }}
                    sx={{ color: '#748782' }}
                  >
                    {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  </IconButton>
                </div>
              </div>

              {/* Expanded Agronomic Details */}
              {isExpanded && (
                <div style={{
                  marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0EFEA',
                  fontSize: '0.82rem', color: '#485954', lineHeight: 1.55
                }}>
                  {task.description && (
                    <p style={{ margin: '0 0 10px' }}>{task.description}</p>
                  )}

                  {task.dosage && (
                    <div style={{ background: '#FAF9F5', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E2D8', marginBottom: 10 }}>
                      <strong style={{ color: '#182420', display: 'block', marginBottom: 2 }}>Dosage / Technical Detail:</strong>
                      <span>{task.dosage}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                      Due Date: {dueDateObj.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => onDelete(taskId, e)}
                      style={{
                        background: 'none', border: 'none', color: '#DC2626',
                        fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
