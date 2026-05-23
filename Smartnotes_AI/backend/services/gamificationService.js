const { User, calculateLevel, calculateCurrentXP } = require('../models/User');

const XP_RULES = {
    QUIZ_GENERATE: 20,
    QUIZ_COMPLETE: 30,
    PAPER_GENERATE: 25,
    PLANNER_TASK_COMPLETE: 20,
    SUMMARY_GENERATE: 10,
    GOAL_COMPLETE: 15,
    STUDY_SESSION: 1, // per 15 min, overridden dynamically
};

const BADGES = {
    STREAK_7: '7-Day Streak',
    QUIZ_MASTER: 'Quiz Master',
    FLASHCARD_PRO: 'Flashcard Pro',
    CONSISTENCY_KING: 'Consistency King',
    XP_1000: '1000 XP Achiever'
};

/**
 * Add XP to user and handle level ups/badges
 * @param {String} userId 
 * @param {String} action 
 * @param {Number} [xpOverride] - optional fixed XP to award instead of the rule default
 */
const addXp = async (userId, action, xpOverride) => {
    const user = await User.findById(userId);
    if (!user) return null;

    const xpEarned = xpOverride ?? (XP_RULES[action] || 0);
    user.xp += xpEarned;

    // Level computation is handled in userSchema pre-save `level = floor(xp/100)`

    // Check badges
    if (user.xp >= 1000 && !user.badges.includes(BADGES.XP_1000)) {
        user.badges.push(BADGES.XP_1000);
    }

    // Update streak logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = new Date(user.lastActiveDate || user.createdAt || Date.now());
    lastActive.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(today - lastActive);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        user.streak += 1;
    } else if (diffDays > 1) {
        user.streak = 1; // reset streak
    } else if (diffDays === 0 && user.streak === 0) {
        user.streak = 1; // First sequence
    }

    user.lastActiveDate = Date.now();

    if (user.streak >= 7 && !user.badges.includes(BADGES.STREAK_7)) {
        user.badges.push(BADGES.STREAK_7);
    }

    await user.save();
    return {
        xpEarned,
        totalXp: user.xp,
        level: user.level,
        streak: user.streak,
        badges: user.badges
    };
};

module.exports = {
    XP_RULES,
    addXp,
    BADGES
};
