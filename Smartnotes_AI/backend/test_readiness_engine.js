/**
 * ============================================================
 * SMARTNOTES AI — PHASE 4 RUNTIME VERIFICATION
 * Exam Readiness Score Engine
 * ============================================================
 *
 * Tests:
 *  1. User with Strong Topics
 *  2. User with Weak Topics
 *  3. User with Mixed Performance
 *  4. User with High Doubt Frequency
 *  5. User with High Revision Completion
 *  6. API /api/analytics/readiness endpoint
 *
 * Run: node test_readiness_engine.js
 */

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
dotenv.config();

const { computeReadiness } = require('./services/readinessService');
const TopicPerformance     = require('./models/TopicPerformance');
const Quiz                 = require('./models/Quiz');
const StudySession         = require('./models/StudySession');
const Planner              = require('./models/Planner');
const { User }             = require('./models/User');

// ─── Colours ─────────────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

const pass = (msg)  => console.log(`${GREEN}  ✅ ${msg}${RESET}`);
const fail = (msg)  => console.log(`${RED}  ❌ ${msg}${RESET}`);
const warn = (msg)  => console.log(`${YELLOW}  ⚠️  ${msg}${RESET}`);
const info = (msg)  => console.log(`${CYAN}  ℹ  ${msg}${RESET}`);
const head = (msg)  => console.log(`\n${BOLD}${CYAN}── ${msg} ──${RESET}`);

// ─── Results accumulator ─────────────────────────────────
const results = { pass: 0, fail: 0, warn: 0 };
const checkResult = (condition, label) => {
    if (condition) { pass(label); results.pass++; }
    else            { fail(label); results.fail++; }
};

// ─── Seed helpers ────────────────────────────────────────
const TEST_EMAIL_BASE = `phase4_test_${Date.now()}`;

const createTestUser = async (suffix) => {
    // Use updateOne with upsert to bypass pre-save bcrypt hook in tests
    const email = `${TEST_EMAIL_BASE}_${suffix}@test.com`;
    await User.collection.insertOne({
        name:           `Test User ${suffix}`,
        email,
        password:       '$2b$10$fakehashedpassword',
        xp:             0,
        level:          1,
        streak:         0,
        lastActiveDate: new Date(),
        badges:         [],
        weakTopics:     [],
        totalStudyHours: 0,
        createdAt:      new Date(),
        updatedAt:      new Date()
    });
    const u = await User.findOne({ email });
    return u._id;
};

const seedTopics = async (userId, topicsArr) => {
    for (const t of topicsArr) {
        await TopicPerformance.create({
            userId,
            topic:          t.topic,
            averageScore:   t.score,
            totalQuizzes:   t.quizzes || 2,
            strength:       t.score >= 80 ? 'Strong' : t.score >= 60 ? 'Medium' : 'Weak',
            doubtCount:     t.doubts || 0,
            revisionAttempts: t.revisions || 0,
            readinessContribution: t.score >= 80 ? 10 : t.score >= 60 ? 2 : -10,
            priorityScore:  t.score < 60 ? 2 : 0
        });
    }
};

const seedSessions = async (userId, days = 5) => {
    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        await StudySession.create({
            userId,
            startTime:       new Date(d.setHours(10, 0, 0, 0)),
            endTime:         new Date(d.setHours(11, 0, 0, 0)),
            durationMinutes: 60,
            durationInHours: 1,
            status:          'COMPLETED'
        });
    }
};

const seedPlanner = async (userId, completedPct = 0.5) => {
    const plan = [];
    for (let i = 0; i < 10; i++) {
        plan.push({
            day:    `Day ${i + 1}`,
            topics: [`Topic ${i + 1}`],
            hours:  2,
            status: i < Math.round(10 * completedPct) ? 'completed' : 'pending'
        });
    }
    await Planner.create({ userId, subject: 'Test Subject', examDate: new Date(Date.now() + 7 * 86400000), plan });
};

// ─── Cleanup ─────────────────────────────────────────────
const cleanup = async (userIds) => {
    for (const uid of userIds) {
        await TopicPerformance.deleteMany({ userId: uid });
        await StudySession.deleteMany({ userId: uid });
        await Planner.deleteMany({ userId: uid });
        await Quiz.deleteMany({ userId: uid });
        await User.findByIdAndDelete(uid);
    }
};

// ─── Tests ───────────────────────────────────────────────
async function runTests() {
    console.log(`${BOLD}${CYAN}
╔══════════════════════════════════════════════════════╗
║   SMARTNOTES AI — PHASE 4 READINESS ENGINE TESTS    ║
╚══════════════════════════════════════════════════════╝${RESET}`);

    const userIds = [];

    try {
        // ── TC1: Strong Topics ─────────────────────────
        head('TC1: User with Strong Topics');
        const u1 = await createTestUser('strong');
        userIds.push(u1);
        await seedTopics(u1, [
            { topic: 'Machine Learning', score: 92 },
            { topic: 'Deep Learning',    score: 88 },
            { topic: 'CNN',              score: 85 }
        ]);
        await seedSessions(u1, 6);
        const r1 = await computeReadiness(u1);
        info(`overallReadiness=${r1.overallReadiness}, confidence=${r1.confidenceLevel}`);
        checkResult(r1.overallReadiness >= 60,  'Strong topics → readiness >= 60');
        checkResult(r1.strongestTopics.length >= 3, '3 strong topics listed');
        checkResult(r1.weakestTopics.length === 0,  'No weak topics');
        checkResult(r1.confidenceLevel !== 'Low',   'Confidence NOT Low');
        checkResult(r1.components.quizPerformance >= 80, 'Quiz performance component >= 80');

        // ── TC2: Weak Topics ──────────────────────────
        head('TC2: User with Weak Topics');
        const u2 = await createTestUser('weak');
        userIds.push(u2);
        await seedTopics(u2, [
            { topic: 'CNN',              score: 35, quizzes: 4 },
            { topic: 'Backpropagation',  score: 28, quizzes: 3 },
            { topic: 'RNN',              score: 40, quizzes: 2 }
        ]);
        const r2 = await computeReadiness(u2);
        info(`overallReadiness=${r2.overallReadiness}, criticalWeakTopic=${r2.criticalWeakTopic}`);
        checkResult(r2.overallReadiness < 60,      'Weak topics → readiness < 60');
        checkResult(r2.weakestTopics.length === 3, 'All 3 topics are weak');
        checkResult(r2.criticalWeakTopic !== null,  'Critical weak topic identified');
        checkResult(r2.improvementAreas.length > 0, 'Improvement areas non-empty');
        checkResult(r2.insights.some(i => i.toLowerCase().includes('struggle')), 'Insight warns about struggle');

        // ── TC3: Mixed Performance ────────────────────
        head('TC3: User with Mixed Performance');
        const u3 = await createTestUser('mixed');
        userIds.push(u3);
        await seedTopics(u3, [
            { topic: 'Machine Learning', score: 85 },
            { topic: 'CNN',              score: 42 },
            { topic: 'NLP',              score: 68 }
        ]);
        await seedSessions(u3, 4);
        await seedPlanner(u3, 0.5);
        const r3 = await computeReadiness(u3);
        info(`overallReadiness=${r3.overallReadiness}, confidence=${r3.confidenceLevel}`);
        checkResult(r3.overallReadiness > 0 && r3.overallReadiness < 100, 'Mixed → score between 0 and 100');
        checkResult(r3.strongestTopics.length > 0, 'Some strong topics exist');
        checkResult(r3.weakestTopics.length > 0,   'Some weak topics exist');
        checkResult(r3.topicReadiness.length === 3, 'All 3 topics in topicReadiness');
        checkResult(r3.components.revisionCompletion > 0, 'Revision completion > 0 from planner');

        // ── TC4: High Doubt Frequency ─────────────────
        head('TC4: User with High Doubt Frequency');
        const u4 = await createTestUser('doubt');
        userIds.push(u4);
        await seedTopics(u4, [
            { topic: 'Transformers', score: 55, doubts: 7 },
            { topic: 'BERT',         score: 60, doubts: 5 }
        ]);
        const r4 = await computeReadiness(u4);
        info(`overallReadiness=${r4.overallReadiness}`);
        const highDoubtInsight = r4.insights.some(i => i.toLowerCase().includes('doubt') || i.toLowerCase().includes('tutor'));
        checkResult(r4.overallReadiness >= 0, 'Score computed without crash');
        checkResult(typeof r4.confidenceLevel === 'string', 'Confidence level is string');
        // Doubt topics have reduced readiness scores
        const transformerReadiness = r4.topicReadiness.find(t => t.topic === 'Transformers');
        if (transformerReadiness) {
            checkResult(transformerReadiness.readiness < 55, 'Doubt penalty reduces topic readiness score');
        } else {
            warn('Transformers topic not found in topicReadiness');
            results.warn++;
        }

        // ── TC5: High Revision Completion ─────────────
        head('TC5: User with High Revision Completion');
        const u5 = await createTestUser('revision');
        userIds.push(u5);
        await seedTopics(u5, [
            { topic: 'Neural Networks', score: 65, revisions: 3 },
            { topic: 'SVM',             score: 70, revisions: 5 }
        ]);
        await seedPlanner(u5, 0.9); // 90% planner completion
        const r5 = await computeReadiness(u5);
        info(`revisionCompletion=${r5.components.revisionCompletion}`);
        checkResult(r5.components.revisionCompletion >= 80, 'High revision completion ≥ 80%');
        checkResult(r5.overallReadiness > 0, 'Revision contributes to overall score');

        // ── TC6: API Schema Validation ────────────────
        head('TC6: API Response Schema Validation');
        const r6 = await computeReadiness(u3);
        const required = ['overallReadiness', 'confidenceLevel', 'improvementTrend',
                          'strongestTopics', 'weakestTopics', 'improvementAreas',
                          'topicReadiness', 'insights', 'components', 'weights',
                          'nextBestActionEnhanced', 'hackathonSummary'];
        required.forEach(key => {
            checkResult(key in r6, `Response contains '${key}'`);
        });
        checkResult(typeof r6.overallReadiness === 'number', 'overallReadiness is number');
        checkResult(r6.overallReadiness >= 0 && r6.overallReadiness <= 100, 'Score in [0, 100]');
        checkResult(Array.isArray(r6.insights), 'insights is array');
        checkResult(typeof r6.hackathonSummary === 'object', 'hackathonSummary is object');
        checkResult(['High', 'Medium', 'Low'].includes(r6.confidenceLevel), 'Valid confidence level');

        // ── TC7: No crash with empty data ─────────────
        head('TC7: Empty User (No Topics)');
        const u7 = await createTestUser('empty');
        userIds.push(u7);
        const r7 = await computeReadiness(u7);
        checkResult(r7.overallReadiness === 0, 'Empty user → score is 0');
        checkResult(r7.strongestTopics.length === 0, 'No strong topics');
        checkResult(r7.weakestTopics.length === 0,   'No weak topics');
        checkResult(r7.insights.length > 0, 'Insights still returned for empty user');

    } catch (err) {
        fail(`Unexpected error: ${err.message}`);
        results.fail++;
        console.error(err);
    } finally {
        await cleanup(userIds);
    }

    // ── Summary ───────────────────────────────────────
    console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}  TEST SUMMARY${RESET}`);
    console.log(`${GREEN}  ✅ Passed : ${results.pass}${RESET}`);
    console.log(`${RED}  ❌ Failed : ${results.fail}${RESET}`);
    if (results.warn > 0) console.log(`${YELLOW}  ⚠️  Warnings: ${results.warn}${RESET}`);
    console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════${RESET}\n`);

    return results.fail === 0;
}

// ─── Entry ───────────────────────────────────────────────
const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
        console.log('✔ MongoDB connected');
        const ok = await runTests();
        await mongoose.disconnect();
        process.exit(ok ? 0 : 1);
    } catch (err) {
        console.error('Fatal error:', err.message);
        process.exit(1);
    }
};

run();
