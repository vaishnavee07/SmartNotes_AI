const Quiz = require('../models/Quiz');
const { User } = require('../models/User');
const TopicPerformance = require('../models/TopicPerformance');

/**
 * Triggered after every quiz submission.
 * Updates the TopicPerformance for the given topic and recalculates strengths.
 */
const updateTopicPerformance = async (userId, topic, latestScore) => {
    let performance = await TopicPerformance.findOne({ userId, topic });

    if (!performance) {
        performance = new TopicPerformance({
            userId,
            topic,
            totalQuizzes: 1,
            averageScore: latestScore,
            lastQuizDate: new Date()
        });
    } else {
        // Calculate new average
        const newTotal = performance.totalQuizzes + 1;
        const newAverage = ((performance.averageScore * performance.totalQuizzes) + latestScore) / newTotal;
        
        performance.averageScore = newAverage;
        performance.totalQuizzes = newTotal;
        performance.lastQuizDate = new Date();
    }

    // Determine Strength
    const oldStrength = performance.strength;
    let newStrength = 'Medium';
    let readinessDelta = 0;

    if (performance.averageScore < 60) {
        newStrength = 'Weak';
        readinessDelta = -10; // Weak topics negatively impact readiness
    } else if (performance.averageScore >= 80) {
        newStrength = 'Strong';
        readinessDelta = 10;  // Strong topics positively impact readiness
    } else {
        newStrength = 'Medium';
        readinessDelta = 2;
    }

    performance.strength = newStrength;
    performance.readinessContribution = readinessDelta;

    // Priority Logic
    if (newStrength === 'Weak') {
        performance.priorityScore += 1;
    } else if (oldStrength === 'Weak' && newStrength !== 'Weak') {
        // Improved from weak
        performance.priorityScore = 0;
        performance.lastImprovedAt = new Date();
    } else {
        performance.priorityScore = 0;
    }

    await performance.save();
    return performance;
};

/**
 * Keep the old function for backward compatibility or replace it.
 * Let's replace the logic to scan all quizzes to sync data if needed,
 * but primarily we should rely on updateTopicPerformance going forward.
 */
const analyzeQuizPerformance = async (userId) => {
    const quizzes = await Quiz.find({ userId });
    
    // Group all historical quizzes by topic
    const topicScores = {};
    quizzes.forEach(q => {
        if (!topicScores[q.topic]) {
            topicScores[q.topic] = { total: 0, sum: 0, lastDate: q.createdAt };
        }
        topicScores[q.topic].total += 1;
        topicScores[q.topic].sum += q.accuracy;
        if (q.createdAt > topicScores[q.topic].lastDate) {
            topicScores[q.topic].lastDate = q.createdAt;
        }
    });

    const performances = [];

    // Sync to TopicPerformance
    for (const topic of Object.keys(topicScores)) {
        const stats = topicScores[topic];
        const average = stats.sum / stats.total;
        
        let strength = 'Medium';
        let readiness = 2;
        if (average < 60) { strength = 'Weak'; readiness = -10; }
        else if (average >= 80) { strength = 'Strong'; readiness = 10; }

        const perf = await TopicPerformance.findOneAndUpdate(
            { userId, topic },
            {
                averageScore: average,
                totalQuizzes: stats.total,
                strength,
                readinessContribution: readiness,
                lastQuizDate: stats.lastDate
                // priorityScore handling skipped for bulk sync for simplicity
            },
            { new: true, upsert: true }
        );
        performances.push(perf);
    }

    return performances;
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
    updateTopicPerformance,
    analyzeQuizPerformance,
    addStudyHours
};
