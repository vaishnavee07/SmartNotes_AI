const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { User, calculateLevel, calculateCurrentXP } = require('../models/User');

// @desc    Get user's gamification stats
// @route   GET /api/gamification/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('xp level streak badges weakTopics');
        if (!user) return res.status(404).json({ error: 'User not found' });

        const xp = user.xp || 0;
        const level = calculateLevel(xp);
        const currentXP = calculateCurrentXP(xp);

        // Also ensure DB level is in sync
        if (user.level !== level) {
            user.level = level;
            await user.save();
        }

        res.json({
            xp,
            level,
            currentXP,
            xpForNextLevel: 100,
            streak: user.streak,
            badges: user.badges,
            weakTopics: user.weakTopics
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

