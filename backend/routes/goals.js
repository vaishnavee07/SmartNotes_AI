const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Goal = require('../models/Goal');
const { addXp } = require('../services/gamificationService');

// @desc    Get all goals for user
// @route   GET /api/goals
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const goals = await Goal.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(goals);
    } catch (error) {
        console.error('Goals GET Error:', error);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
});

// @desc    Create a new goal
// @route   POST /api/goals
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Goal text is required' });
        }
        const goal = await Goal.create({ userId: req.user.id, text: text.trim() });
        res.status(201).json(goal);
    } catch (error) {
        console.error('Goals POST Error:', error);
        res.status(500).json({ error: 'Failed to create goal' });
    }
});

// @desc    Toggle completion status
// @route   PATCH /api/goals/:id
// @access  Private
router.patch('/:id', protect, async (req, res) => {
    try {
        const goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id });
        if (!goal) return res.status(404).json({ error: 'Goal not found' });

        goal.completed = !goal.completed;

        let gamification = null;
        if (goal.completed && !goal.xpAwarded) {
            goal.xpAwarded = true;
            gamification = await addXp(req.user.id, 'GOAL_COMPLETE');
        }

        await goal.save();
        res.json({ goal, gamification });
    } catch (error) {
        console.error('Goals PATCH Error:', error);
        res.status(500).json({ error: 'Failed to update goal' });
    }
});

// @desc    Delete a goal
// @route   DELETE /api/goals/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!goal) return res.status(404).json({ error: 'Goal not found' });
        res.json({ message: 'Goal deleted' });
    } catch (error) {
        console.error('Goals DELETE Error:', error);
        res.status(500).json({ error: 'Failed to delete goal' });
    }
});

module.exports = router;
