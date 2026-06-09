const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const StudySession = require('../models/StudySession');
const { addXp } = require('../services/gamificationService');

// In-memory store for active sessions (keyed by userId)
const activeSessions = {};

// @desc    Start a study session
// @route   POST /api/sessions/start
// @access  Private
router.post('/start', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const { noteId } = req.body;
        activeSessions[userId] = { startTime: new Date(), noteId: noteId || null };
        res.json({ message: 'Session started', startTime: activeSessions[userId].startTime });
    } catch (error) {
        console.error('Session Start Error:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// @desc    End a study session & save to DB
// @route   POST /api/sessions/end
// @access  Private
router.post('/end', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const activeSession = activeSessions[userId];
        if (!activeSession) {
            return res.status(400).json({ error: 'No active session found' });
        }

        const endTime = new Date();
        const durationMs = endTime - activeSession.startTime;
        const durationInHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(4));

        delete activeSessions[userId];

        if (durationInHours < 0.001) {
            return res.json({ message: 'Session too short to save', durationInHours: 0 });
        }

        const session = await StudySession.create({
            userId,
            noteId: activeSession.noteId,
            startTime: activeSession.startTime,
            endTime,
            durationInHours,
            durationMinutes: Math.max(1, Math.floor(durationMs / 60000)),
            status: 'COMPLETED'
        });

        // Award XP: 1XP per 15 minutes
        const xpAmount = Math.floor((durationInHours * 60) / 15);
        let gamification = null;
        if (xpAmount > 0) {
            gamification = await addXp(userId, 'STUDY_SESSION', xpAmount);
        }

        res.json({ session, gamification, durationInHours });
    } catch (error) {
        console.error('Session End Error:', error);
        res.status(500).json({ error: 'Failed to end session' });
    }
});

// @desc    Get stats for this week and this month
// @route   GET /api/sessions/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();

        // This week (last 7 days)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);

        // This month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [weekSessions, monthSessions] = await Promise.all([
            StudySession.find({ userId, startTime: { $gte: weekStart } }),
            StudySession.find({ userId, startTime: { $gte: monthStart } })
        ]);

        const thisWeek = parseFloat(weekSessions.reduce((sum, s) => sum + s.durationInHours, 0).toFixed(2));
        const thisMonth = parseFloat(monthSessions.reduce((sum, s) => sum + s.durationInHours, 0).toFixed(2));

        res.json({ thisWeek, thisMonth });
    } catch (error) {
        console.error('Session Stats Error:', error);
        res.status(500).json({ error: 'Failed to get session stats' });
    }
});

// @desc    Get daily aggregated study hours for the last 7 days (for chart)
// @route   GET /api/sessions/weekly
// @access  Private
router.get('/weekly', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();

        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            days.push(d);
        }

        const weekStart = new Date(days[0]);
        weekStart.setHours(0, 0, 0, 0);

        const sessions = await StudySession.find({
            userId,
            startTime: { $gte: weekStart }
        });

        const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const result = days.map(day => {
            const dayName = DAY_NAMES[day.getDay()];
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);

            const daySessions = sessions.filter(s => s.startTime >= dayStart && s.startTime <= dayEnd);
            const hours = parseFloat(daySessions.reduce((sum, s) => sum + s.durationInHours, 0).toFixed(2));

            return { name: dayName, hours };
        });

        res.json(result);
    } catch (error) {
        console.error('Weekly Stats Error:', error);
        res.status(500).json({ error: 'Failed to get weekly stats' });
    }
});

// In-memory active task sessions keyed by userId
const activeTaskSessions = {};

// @desc    Start a task-linked study session
// @route   POST /api/sessions/task/start
// @access  Private
router.post('/task/start', protect, async (req, res) => {
    try {
        const { planId, taskId } = req.body;
        const userId = req.user.id;

        if (!planId || !taskId) {
            return res.status(400).json({ error: 'planId and taskId are required' });
        }

        // Update planner task status to in_progress
        const Planner = require('../models/Planner');
        const planner = await Planner.findOne({ _id: planId, userId });
        if (!planner) return res.status(404).json({ error: 'Planner not found' });

        const dayItem = planner.plan.id(taskId);
        if (!dayItem) return res.status(404).json({ error: 'Task not found' });

        if (dayItem.status === 'pending') {
            dayItem.status = 'in_progress';
            dayItem.startedAt = new Date();
            await planner.save();
        }

        // Save session to DB (open session — endTime/duration filled later)
        const session = await StudySession.create({
            userId,
            planId,
            taskId,
            startTime: new Date(),
            status: 'IN_PROGRESS'
        });

        // Store in memory for quick lookup on complete
        activeTaskSessions[`${userId}_${taskId}`] = session._id.toString();

        res.status(201).json({ session, planner });
    } catch (error) {
        console.error('Task Session Start Error:', error);
        res.status(500).json({ error: error.message || 'Failed to start study session' });
    }
});

// @desc    Complete a task-linked study session
// @route   POST /api/sessions/task/complete
// @access  Private
router.post('/task/complete', protect, async (req, res) => {
    try {
        const { planId, taskId } = req.body;
        const userId = req.user.id;

        if (!planId || !taskId) {
            return res.status(400).json({ error: 'planId and taskId are required' });
        }

        const endTime = new Date();

        // Find the most recent IN_PROGRESS session for this task
        let session = await StudySession.findOne({
            userId,
            taskId,
            status: 'IN_PROGRESS'
        }).sort({ startTime: -1 });

        if (!session) {
            return res.status(404).json({ error: 'No active study session found for this task' });
        }

        const durationMs = endTime - session.startTime;
        const durationMinutes = Math.max(1, Math.floor(durationMs / 60000));
        const durationInHours = parseFloat((durationMinutes / 60).toFixed(4));

        session.endTime = endTime;
        session.durationMinutes = durationMinutes;
        session.durationInHours = durationInHours;
        session.status = 'COMPLETED';
        await session.save();

        // Update planner task status
        const Planner = require('../models/Planner');
        const planner = await Planner.findOne({ _id: planId, userId });
        if (planner) {
            const dayItem = planner.plan.id(taskId);
            if (dayItem && dayItem.status !== 'completed') {
                dayItem.status = 'completed';
                dayItem.completedAt = endTime;
                await planner.save();
            }
        }

        // Award XP: 1 XP per minute of study
        const gamification = await addXp(userId, 'STUDY_SESSION', durationMinutes);

        // Clean up in-memory tracker
        delete activeTaskSessions[`${userId}_${taskId}`];

        res.json({ session, planner, gamification, durationMinutes });
    } catch (error) {
        console.error('Task Session Complete Error:', error);
        res.status(500).json({ error: error.message || 'Failed to complete study session' });
    }
});

// @desc    Get today's total study minutes
// @route   GET /api/sessions/today
// @access  Private
router.get('/today', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const sessions = await StudySession.find({
            userId,
            status: 'COMPLETED',
            startTime: { $gte: todayStart, $lte: todayEnd }
        });

        const totalMinutesToday = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        const totalHoursToday = (totalMinutesToday / 60).toFixed(2);

        res.json({ totalMinutesToday, totalHoursToday });
    } catch (error) {
        console.error('Today Stats Error:', error);
        res.status(500).json({ error: 'Failed to get today stats' });
    }
});

module.exports = router;
