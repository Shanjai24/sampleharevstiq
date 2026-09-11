const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const FarmTask = require('../models/FarmTask');
const { generateCropTasks } = require('../services/taskGenerator');

// In-memory fallback cache if MongoDB is offline or disconnected
const memoryTasks = new Map();

/**
 * Check if MongoDB is connected
 */
function isDbReady() {
  return mongoose.connection.readyState === 1;
}

/**
 * Helper to update overdue status dynamically
 */
function normalizeTaskStatus(task) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);

  if (task.status === 'pending' && due < now) {
    return { ...task, status: 'overdue' };
  }
  return task;
}

// GET /api/tasks/:farmId - List all tasks for a farm
router.get('/:farmId', async (req, res) => {
  try {
    const { farmId } = req.params;
    let tasks = [];

    if (isDbReady()) {
      const dbTasks = await FarmTask.find({ farmId }).sort({ dueDate: 1 }).lean();
      tasks = dbTasks.map(t => ({
        ...t,
        id: t._id.toString()
      }));
    } else {
      // Memory store fallback
      tasks = memoryTasks.get(farmId) || [];
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let pendingCount = 0;
    let doneCount = 0;
    let overdueCount = 0;
    let todayCount = 0;

    const normalizedTasks = tasks.map(t => {
      const norm = normalizeTaskStatus(t);
      const due = new Date(norm.dueDate);

      if (norm.status === 'done') {
        doneCount++;
      } else if (norm.status === 'overdue') {
        overdueCount++;
      } else if (norm.status === 'pending') {
        pendingCount++;
        if (due >= todayStart && due <= todayEnd) {
          todayCount++;
        }
      }
      return norm;
    });

    res.json({
      farmId,
      total: normalizedTasks.length,
      counts: {
        total: normalizedTasks.length,
        pending: pendingCount,
        done: doneCount,
        overdue: overdueCount,
        today: todayCount
      },
      tasks: normalizedTasks
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks', message: error.message });
  }
});

// POST /api/tasks/generate - Auto-generate crop cycle schedule
router.post('/generate', async (req, res) => {
  try {
    const {
      farmId = 'default-farm',
      crop = 'rice',
      sowingDate = new Date(),
      areaAcres = 1.0,
      clearExisting = true
    } = req.body;

    const generated = generateCropTasks(crop, sowingDate, {
      farmId,
      areaAcres: parseFloat(areaAcres) || 1.0
    });

    if (isDbReady()) {
      if (clearExisting) {
        await FarmTask.deleteMany({ farmId });
      }
      const savedTasks = await FarmTask.insertMany(generated);
      return res.status(201).json({
        success: true,
        farmId,
        crop,
        count: savedTasks.length,
        tasks: savedTasks
      });
    } else {
      // Save to memory store
      const withIds = generated.map((t, idx) => ({
        ...t,
        _id: `mem-${Date.now()}-${idx}`,
        id: `mem-${Date.now()}-${idx}`
      }));
      memoryTasks.set(farmId, withIds);
      return res.status(201).json({
        success: true,
        farmId,
        crop,
        count: withIds.length,
        tasks: withIds,
        note: 'Saved in local fallback storage (Database connecting)'
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Task generation failed', message: error.message });
  }
});

// POST /api/tasks - Farmer adds a custom task
router.post('/', async (req, res) => {
  try {
    const {
      farmId = 'default-farm',
      crop = 'general',
      title,
      description = '',
      dosage = '',
      dueDate = new Date(),
      taskType = 'custom'
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const newTaskData = {
      farmId,
      crop,
      taskType,
      title,
      description,
      dosage,
      dueDate: new Date(dueDate),
      status: 'pending',
      source: 'farmer_added'
    };

    if (isDbReady()) {
      const task = new FarmTask(newTaskData);
      await task.save();
      return res.status(201).json(task);
    } else {
      const task = {
        ...newTaskData,
        _id: `mem-${Date.now()}`,
        id: `mem-${Date.now()}`
      };
      const existing = memoryTasks.get(farmId) || [];
      existing.push(task);
      memoryTasks.set(farmId, existing);
      return res.status(201).json(task);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to add task', message: error.message });
  }
});

// PATCH /api/tasks/:id/status - Toggle done/pending/skipped
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'done' } = req.body;

    const completedAt = status === 'done' ? new Date() : null;

    if (isDbReady() && mongoose.isValidObjectId(id)) {
      const updated = await FarmTask.findByIdAndUpdate(
        id,
        { status, completedAt },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.json(updated);
    } else {
      // Search in memory
      for (const [farmId, list] of memoryTasks.entries()) {
        const item = list.find(t => t.id === id || t._id === id);
        if (item) {
          item.status = status;
          item.completedAt = completedAt;
          return res.json(item);
        }
      }
      return res.status(404).json({ error: 'Task not found in memory' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task status', message: error.message });
  }
});

// DELETE /api/tasks/:id - Delete single task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isDbReady() && mongoose.isValidObjectId(id)) {
      await FarmTask.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Task deleted' });
    } else {
      for (const [farmId, list] of memoryTasks.entries()) {
        const filtered = list.filter(t => t.id !== id && t._id !== id);
        if (filtered.length !== list.length) {
          memoryTasks.set(farmId, filtered);
          return res.json({ success: true, message: 'Task deleted from memory' });
        }
      }
      return res.json({ success: true, message: 'Task removed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task', message: error.message });
  }
});

module.exports = router;
