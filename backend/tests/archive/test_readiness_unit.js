/**
 * ============================================================
 * SMARTNOTES AI — PHASE 4 UNIT TEST (No DB Required)
 * Tests the readiness scoring logic in full isolation.
 * ============================================================
 * Run: node test_readiness_unit.js
 */

// ─── Inline the scoring formula (no DB calls) ────────────────
const READINESS_WEIGHTS = {
    quizPerformance:    0.50,
    revisionCompletion: 0.20,
    studyConsistency:   0.10,
    strongTopicRatio:   0.10,
    weakTopicPenalty:   0.10
};

const getConfidenceLevel = (score) => {
    if (score >= 80) return 'High';
    if (score >= 55) return 'Medium';
    return 'Low';
};

const getImprovementLabel = (delta) => {
    if (delta > 0) return `↑ ${delta}% this week`;
    if (delta < 0) return `↓ ${Math.abs(delta)}% this week`;
    return 'No change this week';
};

const topicReadinessScore = (topic) => {
    let score = topic.averageScore || 0;
    if (topic.doubtCount > 2)          score -= topic.doubtCount * 3;
    if (topic.revisionAttempts > 0)    score += Math.min(topic.revisionAttempts * 5, 15);
    return Math.min(100, Math.max(0, Math.round(score)));
};

const generateInsights = ({ weakTopics, strongTopics, overallReadiness, weeklyDelta, doubtHeavyTopics }) => {
    const insights = [];
    if (weakTopics.length > 0) {
        insights.push(`You are likely to struggle with ${weakTopics.slice(0, 2).map(t => t.topic).join(' and ')}.`);
    }
    if (weakTopics.length > 0) {
        insights.push(`Focus on ${weakTopics[0].topic} for maximum score improvement.`);
    }
    if (doubtHeavyTopics.length > 0) {
        insights.push(`High doubt frequency in ${doubtHeavyTopics[0]} — use the AI Tutor to clarify core concepts.`);
    }
    if (weeklyDelta > 0) {
        insights.push(`You have improved ${weeklyDelta}% over the last week. Keep it up!`);
    } else if (weeklyDelta < 0) {
        insights.push(`Your readiness dropped ${Math.abs(weeklyDelta)}% compared to last week.`);
    }
    if (overallReadiness >= 80 && strongTopics.length > 0) {
        insights.push(`${strongTopics[0].topic} is a strong point — simulate a full exam to capitalise on it.`);
    }
    if (insights.length === 0) {
        insights.push('Start quizzes and review your study notes to generate personalised insights.');
    }
    return insights;
};

/**
 * Pure-logic readiness calculator (no DB).
 * Accepts mock topic data directly.
 */
const computeReadinessFromData = ({
    topics = [],
    studyConsistency   = 0,
    revisionCompletion = 0,
    weeklyDelta        = 0
}) => {
    let quizPerformance = 0;
    if (topics.length > 0) {
        quizPerformance = Math.round(topics.reduce((s, t) => s + (t.averageScore || 0), 0) / topics.length);
    }

    const weakTopics   = topics.filter(t => t.strength === 'Weak').sort((a, b) => a.averageScore - b.averageScore);
    const strongTopics = topics.filter(t => t.strength === 'Strong').sort((a, b) => b.averageScore - a.averageScore);

    const strongTopicRatio = topics.length > 0 ? Math.round((strongTopics.length / topics.length) * 100) : 0;
    const weakTopicPenalty = topics.length > 0 ? Math.round((weakTopics.length  / topics.length) * 100) : 0;

    const doubtHeavyTopics = topics.filter(t => t.doubtCount > 2)
        .sort((a, b) => b.doubtCount - a.doubtCount).map(t => t.topic);

    const W = READINESS_WEIGHTS;
    const rawScore =
        (quizPerformance    * W.quizPerformance)
      + (revisionCompletion * W.revisionCompletion)
      + (studyConsistency   * W.studyConsistency)
      + (strongTopicRatio   * W.strongTopicRatio)
      - (weakTopicPenalty   * W.weakTopicPenalty);

    const overallReadiness = Math.min(100, Math.max(0, Math.round(rawScore)));

    const topicReadiness = topics.map(t => ({
        topic:            t.topic,
        readiness:        topicReadinessScore(t),
        strength:         t.strength,
        averageScore:     Math.round(t.averageScore || 0),
        doubtCount:       t.doubtCount || 0,
        revisionAttempts: t.revisionAttempts || 0
    })).sort((a, b) => a.readiness - b.readiness);

    const improvementAreas = weakTopics.slice(0, 3).map(t => ({
        topic:               t.topic,
        currentScore:        Math.round(t.averageScore || 0),
        estimatedImprovement: Math.min(20, Math.round((60 - (t.averageScore || 0)) / 2))
    }));

    const insights = generateInsights({ weakTopics, strongTopics, overallReadiness, weeklyDelta, doubtHeavyTopics });

    const criticalWeakTopic = weakTopics.length > 0 ? weakTopics[0] : null;

    return {
        overallReadiness,
        confidenceLevel:  getConfidenceLevel(overallReadiness),
        improvementTrend: getImprovementLabel(weeklyDelta),
        weeklyDelta,
        components: { quizPerformance, revisionCompletion, studyConsistency, strongTopicRatio, weakTopicPenalty },
        weights:          READINESS_WEIGHTS,
        strongestTopics:  strongTopics.slice(0, 5).map(t => ({ topic: t.topic, score: Math.round(t.averageScore || 0) })),
        weakestTopics:    weakTopics.slice(0, 5).map(t => ({ topic: t.topic, score: Math.round(t.averageScore || 0), doubtCount: t.doubtCount || 0 })),
        improvementAreas,
        topicReadiness,
        insights,
        criticalWeakTopic: criticalWeakTopic ? criticalWeakTopic.topic : null,
        nextBestActionEnhanced: criticalWeakTopic ? {
            topic:               criticalWeakTopic.topic,
            action:              `Review ${criticalWeakTopic.topic} Flashcards`,
            estimatedImprovement: Math.min(10, Math.round(4 + topics.length * 0.5)),
            readiness:           overallReadiness
        } : null,
        hackathonSummary: {
            currentReadiness:    overallReadiness,
            weakestTopic:        criticalWeakTopic ? criticalWeakTopic.topic : 'N/A',
            recommendedAction:   criticalWeakTopic ? `Review ${criticalWeakTopic.topic} Flashcards` : 'Take a practice quiz',
            predictedImprovement: criticalWeakTopic ? `+${Math.min(10, Math.round(4 + topics.length * 0.5))}%` : '+2%'
        }
    };
};

// ─── Tiny test harness ────────────────────────────────────────
let passed = 0, failed = 0;

const assert = (label, condition, detail = '') => {
    if (condition) {
        console.log(`  \x1b[32m✅ ${label}\x1b[0m`);
        passed++;
    } else {
        console.log(`  \x1b[31m❌ FAIL: ${label}${detail ? ' — ' + detail : ''}\x1b[0m`);
        failed++;
    }
};

const section = (title) => console.log(`\n\x1b[1m\x1b[36m── ${title} ──\x1b[0m`);

// ─────────────────────────────────────────────────────────────
console.log('\x1b[1m\x1b[36m');
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  SMARTNOTES AI — PHASE 4 UNIT TESTS (No DB)         ║');
console.log('╚══════════════════════════════════════════════════════╝\x1b[0m');

// ═══════════════════════════════════════════════════════════════
// TC-1: All Strong Topics
// ═══════════════════════════════════════════════════════════════
section('TC-1: User with All Strong Topics');
const tc1 = computeReadinessFromData({
    topics: [
        { topic: 'Machine Learning', averageScore: 92, strength: 'Strong', doubtCount: 0, revisionAttempts: 1 },
        { topic: 'Deep Learning',    averageScore: 88, strength: 'Strong', doubtCount: 0, revisionAttempts: 2 },
        { topic: 'CNN',              averageScore: 85, strength: 'Strong', doubtCount: 1, revisionAttempts: 0 }
    ],
    studyConsistency:   85,
    revisionCompletion: 70,
    weeklyDelta: 5
});
console.log(`  Score: ${tc1.overallReadiness} | Confidence: ${tc1.confidenceLevel} | Trend: ${tc1.improvementTrend}`);
assert('TC-1: Score >= 75 for all-strong topics',  tc1.overallReadiness >= 75);
assert('TC-1: Confidence is High',                 tc1.confidenceLevel === 'High');
assert('TC-1: No weak topics in output',           tc1.weakestTopics.length === 0);
assert('TC-1: 3 strong topics',                    tc1.strongestTopics.length === 3);
assert('TC-1: Positive weekly trend',              tc1.improvementTrend.includes('↑'));
assert('TC-1: Strong topic ratio = 100',           tc1.components.strongTopicRatio === 100);
assert('TC-1: Quiz performance = 88',              tc1.components.quizPerformance === 88);

// ═══════════════════════════════════════════════════════════════
// TC-2: All Weak Topics
// ═══════════════════════════════════════════════════════════════
section('TC-2: User with All Weak Topics');
const tc2 = computeReadinessFromData({
    topics: [
        { topic: 'CNN',             averageScore: 35, strength: 'Weak', doubtCount: 1, revisionAttempts: 0 },
        { topic: 'Backpropagation', averageScore: 28, strength: 'Weak', doubtCount: 3, revisionAttempts: 0 },
        { topic: 'RNN',             averageScore: 40, strength: 'Weak', doubtCount: 0, revisionAttempts: 0 }
    ],
    studyConsistency:   10,
    revisionCompletion: 0,
    weeklyDelta: -8
});
console.log(`  Score: ${tc2.overallReadiness} | Confidence: ${tc2.confidenceLevel} | Trend: ${tc2.improvementTrend}`);
assert('TC-2: Score < 40 for all-weak topics',     tc2.overallReadiness < 40);
assert('TC-2: Confidence is Low',                  tc2.confidenceLevel === 'Low');
assert('TC-2: 3 weak topics listed',               tc2.weakestTopics.length === 3);
assert('TC-2: No strong topics',                   tc2.strongestTopics.length === 0);
assert('TC-2: Critical weak topic identified',     tc2.criticalWeakTopic !== null);
assert('TC-2: Insight mentions struggle',          tc2.insights.some(i => i.toLowerCase().includes('struggle')));
assert('TC-2: Improvement areas non-empty',        tc2.improvementAreas.length > 0);
assert('TC-2: Negative weekly trend',              tc2.improvementTrend.includes('↓'));
assert('TC-2: Weak topic penalty = 100',           tc2.components.weakTopicPenalty === 100);
assert('TC-2: NBA action focuses on weak topic',   tc2.nextBestActionEnhanced?.action?.includes(tc2.criticalWeakTopic));

// ═══════════════════════════════════════════════════════════════
// TC-3: Mixed Performance
// ═══════════════════════════════════════════════════════════════
section('TC-3: User with Mixed Performance');
const tc3 = computeReadinessFromData({
    topics: [
        { topic: 'Machine Learning', averageScore: 85, strength: 'Strong', doubtCount: 0, revisionAttempts: 2 },
        { topic: 'CNN',              averageScore: 42, strength: 'Weak',   doubtCount: 2, revisionAttempts: 0 },
        { topic: 'NLP',              averageScore: 68, strength: 'Medium', doubtCount: 1, revisionAttempts: 1 }
    ],
    studyConsistency:   57,
    revisionCompletion: 45,
    weeklyDelta: 3
});
console.log(`  Score: ${tc3.overallReadiness} | Confidence: ${tc3.confidenceLevel}`);
console.log(`  Components: Quiz=${tc3.components.quizPerformance}, Revision=${tc3.components.revisionCompletion}, Consistency=${tc3.components.studyConsistency}`);
assert('TC-3: Score between 30 and 80',            tc3.overallReadiness > 30 && tc3.overallReadiness < 80);
assert('TC-3: Both weak & strong topics present',  tc3.weakestTopics.length > 0 && tc3.strongestTopics.length > 0);
assert('TC-3: All 3 topics in topicReadiness',     tc3.topicReadiness.length === 3);
assert('TC-3: topicReadiness sorted asc by score', tc3.topicReadiness[0].readiness <= tc3.topicReadiness[2].readiness);
assert('TC-3: Revision completion component = 45', tc3.components.revisionCompletion === 45);
assert('TC-3: Study consistency component = 57',   tc3.components.studyConsistency === 57);
assert('TC-3: Hackathon summary has weakest topic',tc3.hackathonSummary.weakestTopic === tc3.criticalWeakTopic);

// ═══════════════════════════════════════════════════════════════
// TC-4: High Doubt Frequency
// ═══════════════════════════════════════════════════════════════
section('TC-4: High Doubt Frequency User');
const tc4 = computeReadinessFromData({
    topics: [
        { topic: 'Transformers', averageScore: 55, strength: 'Medium', doubtCount: 8, revisionAttempts: 0 },
        { topic: 'BERT',         averageScore: 60, strength: 'Medium', doubtCount: 5, revisionAttempts: 0 }
    ],
    studyConsistency:   30,
    revisionCompletion: 20,
    weeklyDelta: 0
});
const transformerR = tc4.topicReadiness.find(t => t.topic === 'Transformers');
console.log(`  Score: ${tc4.overallReadiness} | Transformers topic readiness: ${transformerR?.readiness}`);
assert('TC-4: Score computed without crash',       tc4.overallReadiness >= 0 && tc4.overallReadiness <= 100);
assert('TC-4: Doubt penalty reduces topic score',  transformerR && transformerR.readiness < 55, `got ${transformerR?.readiness}`);
assert('TC-4: Insight about AI Tutor generated',   tc4.insights.some(i => i.toLowerCase().includes('doubt') || i.toLowerCase().includes('tutor')));
assert('TC-4: No weekly change label',             tc4.improvementTrend === 'No change this week');

// ═══════════════════════════════════════════════════════════════
// TC-5: High Revision Completion
// ═══════════════════════════════════════════════════════════════
section('TC-5: High Revision Completion User');
const tc5 = computeReadinessFromData({
    topics: [
        { topic: 'Neural Networks', averageScore: 65, strength: 'Medium', doubtCount: 0, revisionAttempts: 4 },
        { topic: 'SVM',             averageScore: 70, strength: 'Medium', doubtCount: 0, revisionAttempts: 6 }
    ],
    studyConsistency:   80,
    revisionCompletion: 90,
    weeklyDelta: 12
});
console.log(`  Score: ${tc5.overallReadiness} | Revision: ${tc5.components.revisionCompletion}%`);
const svmR = tc5.topicReadiness.find(t => t.topic === 'SVM');
assert('TC-5: Revision completion = 90',           tc5.components.revisionCompletion === 90);
assert('TC-5: Revision boost applied to topics',   svmR && svmR.readiness > 70, `got ${svmR?.readiness}`);
assert('TC-5: Positive weekly improvement insight', tc5.insights.some(i => i.includes('improved') || i.includes('12%')));
assert('TC-5: Score boosted by high revision',     tc5.overallReadiness >= 60);

// ═══════════════════════════════════════════════════════════════
// TC-6: API Schema Validation
// ═══════════════════════════════════════════════════════════════
section('TC-6: API Response Schema Validation');
const tc6 = computeReadinessFromData({
    topics: [
        { topic: 'Test Topic', averageScore: 72, strength: 'Medium', doubtCount: 0, revisionAttempts: 1 }
    ],
    studyConsistency: 50, revisionCompletion: 50, weeklyDelta: 0
});
const requiredKeys = [
    'overallReadiness', 'confidenceLevel', 'improvementTrend',
    'weeklyDelta', 'components', 'weights',
    'strongestTopics', 'weakestTopics', 'improvementAreas',
    'topicReadiness', 'insights', 'criticalWeakTopic',
    'nextBestActionEnhanced', 'hackathonSummary'
];
requiredKeys.forEach(key => assert(`TC-6: Response has '${key}'`, key in tc6));
assert('TC-6: overallReadiness is number',         typeof tc6.overallReadiness === 'number');
assert('TC-6: Score in [0, 100]',                  tc6.overallReadiness >= 0 && tc6.overallReadiness <= 100);
assert('TC-6: insights is array',                  Array.isArray(tc6.insights));
assert('TC-6: topicReadiness is array',            Array.isArray(tc6.topicReadiness));
assert('TC-6: weights match formula',              tc6.weights.quizPerformance === 0.50);
assert('TC-6: hackathonSummary has 4 fields',      Object.keys(tc6.hackathonSummary).length === 4);
assert('TC-6: Valid confidence level',             ['High','Medium','Low'].includes(tc6.confidenceLevel));

// ═══════════════════════════════════════════════════════════════
// TC-7: Empty User (No Data)
// ═══════════════════════════════════════════════════════════════
section('TC-7: Edge Case — Empty User (No Topics)');
const tc7 = computeReadinessFromData({ topics: [], studyConsistency: 0, revisionCompletion: 0, weeklyDelta: 0 });
console.log(`  Score: ${tc7.overallReadiness}`);
assert('TC-7: Score is 0 for empty user',          tc7.overallReadiness === 0);
assert('TC-7: Confidence is Low',                  tc7.confidenceLevel === 'Low');
assert('TC-7: No strong or weak topics',           tc7.strongestTopics.length === 0 && tc7.weakestTopics.length === 0);
assert('TC-7: criticalWeakTopic is null',          tc7.criticalWeakTopic === null);
assert('TC-7: Insights still returned',            tc7.insights.length > 0);
assert('TC-7: hackathonSummary.currentReadiness=0',tc7.hackathonSummary.currentReadiness === 0);

// ═══════════════════════════════════════════════════════════════
// TC-8: Formula Bounds Check
// ═══════════════════════════════════════════════════════════════
section('TC-8: Score Bounds — Max (perfect student)');
const tc8 = computeReadinessFromData({
    topics: [
        { topic: 'Topic A', averageScore: 100, strength: 'Strong', doubtCount: 0, revisionAttempts: 5 },
        { topic: 'Topic B', averageScore: 100, strength: 'Strong', doubtCount: 0, revisionAttempts: 5 }
    ],
    studyConsistency: 100, revisionCompletion: 100, weeklyDelta: 20
});
assert('TC-8: Perfect score capped at 100',        tc8.overallReadiness === 100);
assert('TC-8: Confidence is High',                 tc8.confidenceLevel === 'High');

section('TC-8b: Score Bounds — Min (worst case)');
const tc8b = computeReadinessFromData({
    topics: [
        { topic: 'Topic X', averageScore: 0, strength: 'Weak', doubtCount: 10, revisionAttempts: 0 }
    ],
    studyConsistency: 0, revisionCompletion: 0, weeklyDelta: -30
});
assert('TC-8b: Score floored at 0',                tc8b.overallReadiness === 0);
assert('TC-8b: Confidence is Low',                 tc8b.confidenceLevel === 'Low');

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[1m\x1b[36m═══════════════════════════════════════════════════════\x1b[0m');
console.log('\x1b[1m  PHASE 4 UNIT TEST SUMMARY\x1b[0m');
console.log(`\x1b[32m  ✅ Passed : ${passed}\x1b[0m`);
console.log(`\x1b[31m  ❌ Failed : ${failed}\x1b[0m`);
console.log('\x1b[1m\x1b[36m═══════════════════════════════════════════════════════\x1b[0m\n');

if (failed === 0) {
    console.log('\x1b[32m\x1b[1m🎉 ALL TESTS PASSED — Phase 4 Readiness Engine is verified!\x1b[0m\n');
    process.exit(0);
} else {
    console.log('\x1b[31m\x1b[1m❌ Some tests failed. Review output above.\x1b[0m\n');
    process.exit(1);
}
