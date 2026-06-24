const TopicPerformance = require('../models/TopicPerformance');

/**
 * Smart Recommendation Engine
 * Analyzes topic strength, quiz performance, priority score, and doubt frequency
 * to generate a contextual recommendation string.
 */
const getSmartRecommendation = (topicPerformance) => {
    const { strength, averageScore, priorityScore, doubtCount } = topicPerformance;

    if (strength === 'Weak') {
        if (doubtCount > 2) {
            return `Ask the AI Tutor to clarify core concepts. High doubt frequency detected.`;
        }
        if (priorityScore >= 3) {
            return `Critically weak. Stop attempting quizzes. Fully review the generated summary for ${topicPerformance.topic} and revise flashcards first.`;
        }
        return `Review the generated summary for ${topicPerformance.topic} and attempt a follow-up quiz.`;
    }

    if (strength === 'Medium') {
        if (averageScore < 70) {
            return `Almost there! Revise flashcards to solidify your understanding.`;
        }
        return `Good progress. Take one more quiz to push this topic to Strong.`;
    }

    // Strong
    return `Excellent! Keep up the momentum or help others. Topic mastered.`;
};

/**
 * Next Best Action Engine
 * Looks at the user's overall analytics and determines the absolute most useful next step.
 */
const getNextBestAction = async (userId) => {
    // Find the weakest, most high-priority topic
    const weakestTopic = await TopicPerformance.findOne({ userId, strength: 'Weak' })
        .sort({ priorityScore: -1, averageScore: 1 });

    if (weakestTopic) {
        let action = `Review ${weakestTopic.topic} Flashcards`;
        let estimatedTime = "15 Minutes";

        if (weakestTopic.doubtCount > 2) {
            action = `Ask AI Tutor about ${weakestTopic.topic}`;
            estimatedTime = "10 Minutes";
        } else if (weakestTopic.priorityScore >= 2) {
            action = `Read Summary for ${weakestTopic.topic}`;
            estimatedTime = "20 Minutes";
        } else {
            action = `Take a Quick Quiz on ${weakestTopic.topic}`;
            estimatedTime = "5 Minutes";
        }

        return {
            topic: weakestTopic.topic,
            action,
            estimatedTime,
            readinessImpact: 'High',
            reason: getSmartRecommendation(weakestTopic)
        };
    }

    // If no weak topics, find a medium topic to upgrade
    const mediumTopic = await TopicPerformance.findOne({ userId, strength: 'Medium' })
        .sort({ averageScore: 1 });

    if (mediumTopic) {
        return {
            topic: mediumTopic.topic,
            action: `Take Quiz on ${mediumTopic.topic}`,
            estimatedTime: "10 Minutes",
            readinessImpact: 'Medium',
            reason: getSmartRecommendation(mediumTopic)
        };
    }

    // If everything is strong
    return {
        topic: 'General Revision',
        action: 'Generate a Question Paper spanning all topics',
        estimatedTime: "45 Minutes",
        readinessImpact: 'Low',
        reason: 'All topics are Strong. Simulate a full exam environment.'
    };
};

module.exports = {
    getSmartRecommendation,
    getNextBestAction
};
