/**
 * ============================================================
 * SMARTNOTES AI — EXAM READINESS SCORE ENGINE  (Phase 4)
 * ============================================================
 *
 * Scoring Formula (configurable via READINESS_WEIGHTS):
 *
 *   ReadinessScore =
 *     (quizPerformance    × 0.50)
 *   + (revisionCompletion × 0.20)
 *   + (studyConsistency   × 0.10)
 *   + (strongTopicRatio   × 0.10)
 *   - (weakTopicPenalty   × 0.10)
 *
 * All component values are normalised to [0, 100] before weighting.
 */

const TopicPerformance = require('../models/TopicPerformance');
const StudySession     = require('../models/StudySession');
const Planner          = require('../models/Planner');
const Quiz             = require('../models/Quiz');

// ─── Configurable weights ──────────────────────────────────────────────────
const READINESS_WEIGHTS = {
    quizPerformance:    0.50,
    revisionCompletion: 0.20,
    studyConsistency:   0.10,
    strongTopicRatio:   0.10,
    weakTopicPenalty:   0.10   // subtracted
};

// ─── Confidence bands ──────────────────────────────────────────────────────
const getConfidenceLevel = (score) => {
    if (score >= 80) return 'High';
    if (score >= 55) return 'Medium';
    return 'Low';
};

// ─── Improvement label ────────────────────────────────────────────────────
const getImprovementLabel = (delta) => {
    if (delta > 0) return `↑ ${delta}% this week`;
    if (delta < 0) return `↓ ${Math.abs(delta)}% this week`;
    return 'No change this week';
};

// ─── AI Insight generator ─────────────────────────────────────────────────
const generateInsights = (data) => {
    const insights = [];
    const { weakTopics, strongTopics, overallReadiness, weeklyDelta, doubtHeavyTopics } = data;

    if (weakTopics.length > 0) {
        insights.push(
            `You are likely to struggle with ${weakTopics.slice(0, 2).map(t => t.topic).join(' and ')}.`
        );
    }

    if (weakTopics.length > 0) {
        insights.push(
            `Focus on ${weakTopics[0].topic} for maximum score improvement.`
        );
    }

    if (doubtHeavyTopics.length > 0) {
        insights.push(
            `High doubt frequency in ${doubtHeavyTopics[0]} — use the AI Tutor to clarify core concepts.`
        );
    }

    if (weeklyDelta > 0) {
        insights.push(`You have improved ${weeklyDelta}% over the last week. Keep it up!`);
    } else if (weeklyDelta < 0) {
        insights.push(`Your readiness dropped ${Math.abs(weeklyDelta)}% compared to last week. Review weak topics today.`);
    }

    if (overallReadiness >= 80 && strongTopics.length > 0) {
        insights.push(
            `${strongTopics[0].topic} is a strong point — simulate a full exam to capitalise on it.`
        );
    }

    if (insights.length === 0) {
        insights.push('Start quizzes and review your study notes to generate personalised insights.');
    }

    return insights;
};

// ─── Topic-level readiness ────────────────────────────────────────────────
const topicReadinessScore = (topic) => {
    // Combine average score, penalty for high doubt, boost for revision
    let score = topic.averageScore || 0;
    if (topic.doubtCount > 2) score -= topic.doubtCount * 3;
    if (topic.revisionAttempts > 0) score += Math.min(topic.revisionAttempts * 5, 15);
    return Math.min(100, Math.max(0, Math.round(score)));
};

// ─── Study Consistency (last 7 days) ──────────────────────────────────────
const computeStudyConsistency = async (userId) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sessions = await StudySession.find({
        userId,
        status: 'COMPLETED',
        startTime: { $gte: sevenDaysAgo }
    }).lean();

    if (sessions.length === 0) return 0;

    // Build set of unique study days
    const studiedDays = new Set(
        sessions.map(s => new Date(s.startTime).toDateString())
    );

    // Consistency = (days studied / 7) * 100
    return Math.round((studiedDays.size / 7) * 100);
};

// ─── Revision Completion (from Planner) ───────────────────────────────────
const computeRevisionCompletion = async (userId) => {
    const planners = await Planner.find({ userId }).lean();
    if (planners.length === 0) return 0;

    let total = 0;
    let completed = 0;

    planners.forEach(p => {
        (p.plan || []).forEach(day => {
            if (day.status !== 'exam') {  // skip exam-day entries
                total++;
                if (day.status === 'completed') completed++;
            }
        });
    });

    return total === 0 ? 0 : Math.round((completed / total) * 100);
};

// ─── Weekly readiness delta ────────────────────────────────────────────────
const computeWeeklyDelta = async (userId) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Quizzes taken BEFORE the last 7 days window
    const olderQuizzes = await Quiz.find({
        userId,
        createdAt: { $lt: sevenDaysAgo }
    }).lean();

    if (olderQuizzes.length === 0) return 0;

    const oldAvg = olderQuizzes.reduce((sum, q) => sum + (q.accuracy || 0), 0) / olderQuizzes.length;

    // Quizzes taken in the last 7 days
    const recentQuizzes = await Quiz.find({
        userId,
        createdAt: { $gte: sevenDaysAgo }
    }).lean();

    if (recentQuizzes.length === 0) return 0;

    const newAvg = recentQuizzes.reduce((sum, q) => sum + (q.accuracy || 0), 0) / recentQuizzes.length;
    return Math.round(newAvg - oldAvg);
};

// ─── Core Readiness Calculator ────────────────────────────────────────────
/**
 * Calculates the full readiness profile for a user.
 * @param {string} userId
 * @returns {Object} Full readiness breakdown
 */
const computeReadiness = async (userId) => {
    // Fetch all data in parallel
    const [topics, studyConsistency, revisionCompletion, weeklyDelta] = await Promise.all([
        TopicPerformance.find({ userId }).lean(),
        computeStudyConsistency(userId),
        computeRevisionCompletion(userId),
        computeWeeklyDelta(userId)
    ]);

    // ── Quiz Performance component ──────────────────────────
    let quizPerformance = 0;
    if (topics.length > 0) {
        const totalScore = topics.reduce((sum, t) => sum + (t.averageScore || 0), 0);
        quizPerformance = Math.round(totalScore / topics.length);
    }

    // ── Topic categorisation ────────────────────────────────
    const weakTopics   = topics.filter(t => t.strength === 'Weak')
        .sort((a, b) => b.priorityScore - a.priorityScore || a.averageScore - b.averageScore);
    const strongTopics = topics.filter(t => t.strength === 'Strong')
        .sort((a, b) => b.averageScore - a.averageScore);
    const mediumTopics = topics.filter(t => t.strength === 'Medium');

    // ── Strong/Weak topic ratios ────────────────────────────
    const strongTopicRatio = topics.length > 0
        ? Math.round((strongTopics.length / topics.length) * 100)
        : 0;

    const weakTopicPenalty = topics.length > 0
        ? Math.round((weakTopics.length / topics.length) * 100)
        : 0;

    // ── Doubt-heavy topics ─────────────────────────────────
    const doubtHeavyTopics = topics
        .filter(t => t.doubtCount > 2)
        .sort((a, b) => b.doubtCount - a.doubtCount)
        .map(t => t.topic);

    // ── Apply formula ──────────────────────────────────────
    const W = READINESS_WEIGHTS;
    let rawScore =
        (quizPerformance    * W.quizPerformance)
      + (revisionCompletion * W.revisionCompletion)
      + (studyConsistency   * W.studyConsistency)
      + (strongTopicRatio   * W.strongTopicRatio)
      - (weakTopicPenalty   * W.weakTopicPenalty);

    const overallReadiness = Math.min(100, Math.max(0, Math.round(rawScore)));

    // ── Per-topic readiness ────────────────────────────────
    const topicReadiness = topics.map(t => ({
        topic:          t.topic,
        readiness:      topicReadinessScore(t),
        strength:       t.strength,
        averageScore:   Math.round(t.averageScore || 0),
        doubtCount:     t.doubtCount || 0,
        revisionAttempts: t.revisionAttempts || 0
    })).sort((a, b) => a.readiness - b.readiness);

    // ── Improvement areas ─────────────────────────────────
    const improvementAreas = weakTopics.slice(0, 3).map(t => ({
        topic:             t.topic,
        currentScore:      Math.round(t.averageScore || 0),
        estimatedImprovement: Math.min(20, Math.round((60 - (t.averageScore || 0)) / 2))
    }));

    // ── AI Insights ───────────────────────────────────────
    const insights = generateInsights({
        weakTopics,
        strongTopics,
        overallReadiness,
        weeklyDelta,
        doubtHeavyTopics
    });

    // ── Next Best Action influence ────────────────────────
    const criticalWeakTopic = weakTopics.length > 0 ? weakTopics[0] : null;
    const nextBestActionEnhanced = criticalWeakTopic
        ? {
            topic:                criticalWeakTopic.topic,
            action:               `Review ${criticalWeakTopic.topic} Flashcards`,
            estimatedImprovement: Math.min(10, Math.round(strongTopicRatio === 0 ? 8 : 4 + topics.length * 0.5)),
            readiness:            overallReadiness
          }
        : null;

    return {
        overallReadiness,
        confidenceLevel:    getConfidenceLevel(overallReadiness),
        improvementTrend:   getImprovementLabel(weeklyDelta),
        weeklyDelta,
        components: {
            quizPerformance,
            revisionCompletion,
            studyConsistency,
            strongTopicRatio,
            weakTopicPenalty
        },
        weights: READINESS_WEIGHTS,
        strongestTopics:    strongTopics.slice(0, 5).map(t => ({ topic: t.topic, score: Math.round(t.averageScore || 0) })),
        weakestTopics:      weakTopics.slice(0, 5).map(t => ({ topic: t.topic, score: Math.round(t.averageScore || 0), doubtCount: t.doubtCount || 0 })),
        improvementAreas,
        topicReadiness,
        insights,
        criticalWeakTopic:  criticalWeakTopic ? criticalWeakTopic.topic : null,
        nextBestActionEnhanced,
        // Hackathon demo-friendly fields
        hackathonSummary: {
            currentReadiness:    overallReadiness,
            weakestTopic:        criticalWeakTopic ? criticalWeakTopic.topic : 'N/A',
            recommendedAction:   criticalWeakTopic ? `Review ${criticalWeakTopic.topic} Flashcards` : 'Take a practice quiz',
            predictedImprovement: criticalWeakTopic
                ? `+${Math.min(10, Math.round(4 + topics.length * 0.5))}%`
                : '+2%'
        }
    };
};

module.exports = {
    computeReadiness,
    READINESS_WEIGHTS,
    topicReadinessScore
};
