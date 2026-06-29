const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ActivitySession = require('../models/ActivitySession');
const StudySession = require('../models/StudySession');
const { addXp } = require('../services/gamificationService');

// ============================================================
// POST /api/activity/save
// Save an activity session (from frontend idle-aware tracker)
// ============================================================
router.post('/save', protect, async (req, res) => {
    try {
        const { page, startTime, endTime, durationMinutes } = req.body;

        if (!page || !startTime || !endTime || durationMinutes == null) {
            return res.status(400).json({ error: 'page, startTime, endTime, durationMinutes are required' });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        const dur = parseFloat(durationMinutes);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid startTime or endTime' });
        }

        // Ignore sessions under 30 seconds (0.5 min)
        if (dur < 0.5) {
            return res.json({ skipped: true, reason: 'Session too short (< 30 seconds)' });
        }

        // Cap at 3 hours (180 minutes)
        const safeDuration = Math.min(dur, 180);

        // Midnight of the session date for fast day lookups
        const date = new Date(start);
        date.setHours(0, 0, 0, 0);

        const session = await ActivitySession.create({
            userId: req.user.id,
            page,
            startTime: start,
            endTime: end,
            durationMinutes: safeDuration,
            date
        });

        // Award XP: 1 XP per minute of study time
        const xpMins = Math.floor(safeDuration);
        let gamification = null;
        if (xpMins > 0) {
            gamification = await addXp(req.user.id, 'STUDY_SESSION', xpMins);
        }

        res.status(201).json({ session, gamification });
    } catch (error) {
        console.error('[Activity Save Error]', error);
        res.status(500).json({ error: error.message || 'Failed to save activity session' });
    }
});

// ============================================================
// GET /api/activity/today
// Return total active study minutes for today
// Combines ActivitySession + StudySession (task-linked)
// ============================================================
router.get('/today', protect, async (req, res) => {
    try {
        const userId = req.user.id;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // From idle-aware activity tracker
        const activitySessions = await ActivitySession.find({
            userId,
            date: { $gte: todayStart, $lte: todayEnd }
        });

        // From task-linked study sessions (planner)
        const taskSessions = await StudySession.find({
            userId,
            status: 'COMPLETED',
            startTime: { $gte: todayStart, $lte: todayEnd }
        });

        const fromActivity = activitySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        const fromTasks = taskSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

        const totalMinutesToday = Math.round(fromActivity + fromTasks);
        const totalHoursToday = (totalMinutesToday / 60).toFixed(2);

        // Format human-friendly label
        let label;
        if (totalMinutesToday < 60) {
            label = `${totalMinutesToday} min`;
        } else {
            const hrs = Math.floor(totalMinutesToday / 60);
            const mins = totalMinutesToday % 60;
            label = mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
        }

        res.json({ totalMinutesToday, totalHoursToday, label });
    } catch (error) {
        console.error('[Activity Today Error]', error);
        res.status(500).json({ error: 'Failed to get today stats' });
    }
});

// ============================================================
// GET /api/activity/weekly
// Returns Mon–Sun of the CURRENT week with total minutes per day
// Aggregates BOTH ActivitySession and StudySession for accuracy
// Response shape: [{ day: "Mon", minutes: 45 }, ...]
// ============================================================
router.get('/weekly', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();

        // Compute Monday of the current ISO week
        const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const diffToMonday = (dayOfWeek === 0) ? -6 : 1 - dayOfWeek; // if Sun, go back 6 days
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        // Build 7-day array Mon → Sun
        const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const weekDays = DAY_LABELS.map((label, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return { label, date: d };
        });

        const weekEnd = new Date(weekDays[6].date);
        weekEnd.setHours(23, 59, 59, 999);

        // Fetch all sessions for the week in parallel
        const [activitySessions, taskSessions] = await Promise.all([
            ActivitySession.find({
                userId,
                date: { $gte: monday, $lte: weekEnd }
            }),
            StudySession.find({
                userId,
                status: 'COMPLETED',
                startTime: { $gte: monday, $lte: weekEnd }
            })
        ]);

        // Aggregate minutes per day
        const result = weekDays.map(({ label, date }) => {
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            const actMins = activitySessions
                .filter(s => s.date >= dayStart && s.date <= dayEnd)
                .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

            const taskMins = taskSessions
                .filter(s => s.startTime >= dayStart && s.startTime <= dayEnd)
                .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

            return {
                day: label,
                minutes: Math.round(actMins + taskMins)
            };
        });

        res.json(result);
    } catch (error) {
        console.error('[Activity Weekly Error]', error);
        res.status(500).json({ error: 'Failed to get weekly stats' });
    }
});

module.exports = router;
