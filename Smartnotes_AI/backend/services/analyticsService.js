const Quiz = require('../models/Quiz');
const { User } = require('../models/User');

/**
 * Analyze quiz performance to detect weak topics
 */
const analyzeQuizPerformance = async (userId) => {
    // Get user's recent quizzes
    const quizzes = await Quiz.find({ userId }).sort('-createdAt').limit(20);

    // Group by topic and calculate accuracy
    const topicStats = {};
    quizzes.forEach(q => {
        if (!topicStats[q.topic]) {
            topicStats[q.topic] = { totalAttempts: 0, sumAccuracy: 0, scores: [] };
        }
        topicStats[q.topic].totalAttempts += 1;
        topicStats[q.topic].sumAccuracy += q.accuracy;
        topicStats[q.topic].scores.push(q.accuracy);
    });

    const weakTopics = [];

    Object.keys(topicStats).forEach(topic => {
        const stats = topicStats[topic];
        // Weakness Detection: Auto-flag topics where user scores < 60% in 3 consecutive quizzes (or just average < 60% for simplicity)
        const recentScores = stats.scores.slice(0, 3);
        const below60Count = recentScores.filter(s => s < 60).length;

        if (below60Count >= 3 || (stats.sumAccuracy / stats.totalAttempts) < 60) {
            if (stats.totalAttempts >= 3) {
                weakTopics.push(topic);
            }
        }
    });

    // Update user's weak topics
    const user = await User.findById(userId);
    if (user) {
        user.weakTopics = weakTopics;
        await user.save();
    }

    return topicStats;
};

/**
 * Update total study hours (mock service for now)
 */
const addStudyHours = async (userId, hoursToAdd) => {
    const user = await User.findById(userId);
    if (user) {
        user.totalStudyHours += hoursToAdd;
        await user.save();
    }
};

module.exports = {
    analyzeQuizPerformance,
    addStudyHours
};
