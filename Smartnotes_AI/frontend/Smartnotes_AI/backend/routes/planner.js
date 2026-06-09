const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Planner = require('../models/Planner');
const { generateRevisionRoadmap } = require('../services/llmService');
const { extractPDFText } = require('../services/ocrService');
const { addXp } = require('../services/gamificationService');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');

// @desc    Get all active planner goals (latest first)
// @route   GET /api/planner
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const goals = await Planner.find({ userId: req.user.id }).sort('-createdAt');
        res.json(goals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @desc    Create a new planner goal from Topic
// @route   POST /api/planner
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { topic, examDate, availableHours } = req.body;

        if (!topic || !topic.trim()) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        // Strict date validation — never allow undefined/empty/NaN dates
        if (!examDate) {
            return res.status(400).json({ error: 'Exam date is required' });
        }
        const parsedDate = new Date(examDate);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ error: 'Invalid exam date. Please use YYYY-MM-DD format.' });
        }
        if (parsedDate < new Date()) {
            return res.status(400).json({ error: 'Exam date must be in the future.' });
        }

        const planData = await generateRevisionRoadmap(topic.trim(), parsedDate.toISOString(), availableHours || 2);

        const goal = await Planner.create({
            userId: req.user.id,
            subject: topic.trim(),
            examDate: parsedDate,
            plan: planData.plan || []
        });

        res.status(201).json(goal);
    } catch (error) {
        console.error('Planner Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate study plan' });
    }
});

// @desc    Mark planner task as started
// @route   PATCH /api/planner/:planId/day/:dayId/start
// @access  Private
router.patch('/:planId/day/:dayId/start', protect, async (req, res) => {
    try {
        const planner = await Planner.findOne({ _id: req.params.planId, userId: req.user.id });
        if (!planner) return res.status(404).json({ error: 'Plan not found' });

        const dayItem = planner.plan.id(req.params.dayId);
        if (!dayItem) return res.status(404).json({ error: 'Day not found in plan' });

        if (dayItem.status === 'pending') {
            dayItem.status = 'in_progress';
            dayItem.startedAt = new Date();
            await planner.save();
        }

        res.json({ planner });
    } catch (error) {
        console.error('Planner Start Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// @desc    Mark planner task as completed
// @route   PATCH /api/planner/:planId/day/:dayId/complete
// @access  Private
router.patch('/:planId/day/:dayId/complete', protect, async (req, res) => {
    try {
        const planner = await Planner.findOne({ _id: req.params.planId, userId: req.user.id });
        if (!planner) return res.status(404).json({ error: 'Plan not found' });

        const dayItem = planner.plan.id(req.params.dayId);
        if (!dayItem) return res.status(404).json({ error: 'Day not found in plan' });

        if (dayItem.status !== 'completed') {
            dayItem.status = 'completed';
            dayItem.completedAt = new Date();
            await planner.save();

            const gamification = await addXp(req.user.id, 'PLANNER_TASK_COMPLETE');
            return res.json({ planner, gamification });
        }

        res.json({ planner });
    } catch (error) {
        console.error('Planner Completion Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
