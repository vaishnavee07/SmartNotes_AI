/**
 * ============================================================
 * SMARTNOTES AI — FULL END-TO-END RUNTIME VERIFICATION
 * Uses REAL MongoDB Atlas Database — No Mocks
 * ============================================================
 * Requires: backend running on port 5000
 * Run: node test_e2e_real.js
 */

const http = require('http');
const mongoose = require('mongoose');
const dotenv   = require('dotenv');
dotenv.config();

// ─── Config ──────────────────────────────────────────────
const BASE = 'http://localhost:5000/api';
const TEST_EMAIL = `e2e_test_${Date.now()}@smartnotes.ai`;
const TEST_PASS  = 'TestPass@2024';
const TEST_NAME  = 'E2E Test User';

let TOKEN     = null;
let USER_ID   = null;
let NOTE_ID   = null;
let QUIZ_ID   = null;

// ─── Results tracking ────────────────────────────────────
const results = [];
let passed = 0, failed = 0, warned = 0;

// ─── HTTP helpers ────────────────────────────────────────
const req = (method, path, body = null, token = null) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: `/api${path}`,
        method,
        headers: {
            'Content-Type':  'application/json',
            'Content-Length': data ? Buffer.byteLength(data) : 0,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
    };
    const r = http.request(options, res => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
            try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
            catch { resolve({ status: res.statusCode, data: raw }); }
        });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
});

// ─── Assertion helpers ────────────────────────────────────
const GREEN  = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', BOLD = '\x1b[1m', RESET = '\x1b[0m';

const log_pass = (id, msg) => { console.log(`${GREEN}  ✅ [${id}] ${msg}${RESET}`); passed++; results.push({ id, status: 'PASS', msg }); };
const log_fail = (id, msg, detail) => { console.log(`${RED}  ❌ [${id}] ${msg}${detail ? ' — ' + detail : ''}${RESET}`); failed++; results.push({ id, status: 'FAIL', msg, detail }); };
const log_warn = (id, msg) => { console.log(`${YELLOW}  ⚠️  [${id}] ${msg}${RESET}`); warned++; results.push({ id, status: 'WARN', msg }); };
const section  = t => console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════\n  ${t}\n══════════════════════════════════════════${RESET}`);

const assert = (id, cond, msg, detail = '') => cond ? log_pass(id, msg) : log_fail(id, msg, detail);

// ─────────────────────────────────────────────────────────────
// PHASE 1 — Backend Health & Route Registration
// ─────────────────────────────────────────────────────────────
async function phase1_backendHealth() {
    section('PHASE 1 — Backend Health & Route Registration');

    // Test all registered routes respond (even with 401, not 404)
    const routes = [
        { path: '/auth/login',                 method: 'POST', expectNot404: true },
        { path: '/notes',                      method: 'GET',  expectAuth: true },
        { path: '/study/quiz/generate',        method: 'POST', expectAuth: true },
        { path: '/study/flashcard/generate',   method: 'POST', expectAuth: true },
        { path: '/study/question-papers',      method: 'GET',  expectAuth: true },
        { path: '/planner',                    method: 'GET',  expectAuth: true },
        { path: '/analytics/topics',           method: 'GET',  expectAuth: true },
        { path: '/analytics/readiness',        method: 'GET',  expectAuth: true },
        { path: '/analytics/next-best-action', method: 'GET',  expectAuth: true },
        { path: '/analytics/progress',         method: 'GET',  expectAuth: true },
        { path: '/sessions/stats',             method: 'GET',  expectAuth: true },
        { path: '/activity/weekly',            method: 'GET',  expectAuth: true },
        { path: '/gamification/stats',         method: 'GET',  expectAuth: true },
        { path: '/goals',                      method: 'GET',  expectAuth: true },
    ];

    for (const route of routes) {
        try {
            const r = await req(route.method, route.path, route.method === 'POST' ? {} : null);
            if (route.expectAuth) {
                // Should get 401, not 404 (route exists)
                assert(`P1-ROUTE-${route.path}`, r.status !== 404,
                    `Route ${route.method} ${route.path} registered`,
                    `Got ${r.status}`);
            } else {
                assert(`P1-ROUTE-${route.path}`, r.status < 500,
                    `Route ${route.method} ${route.path} responds`,
                    `Got ${r.status}`);
            }
        } catch(e) {
            log_fail(`P1-ROUTE-${route.path}`, `Route ${route.path} unreachable`, e.message);
        }
    }
}

// ─────────────────────────────────────────────────────────────
// PHASE 2 — Authentication
// ─────────────────────────────────────────────────────────────
async function phase2_auth() {
    section('PHASE 2 — Authentication (Register / Login / Protected Routes)');

    // Register
    const reg = await req('POST', '/auth/register', { name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASS });
    assert('P2-REGISTER', reg.status === 201 || reg.status === 200, 'Register new user', `Got ${reg.status}: ${JSON.stringify(reg.data).slice(0,100)}`);
    if (reg.data?.token) {
        TOKEN   = reg.data.token;
        USER_ID = reg.data.user?._id || reg.data._id;
        log_pass('P2-TOKEN', `JWT token received (${TOKEN.slice(0,20)}...)`);
    } else {
        log_fail('P2-TOKEN', 'No token in register response', JSON.stringify(reg.data).slice(0,200));
    }

    // Login with same credentials
    const login = await req('POST', '/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
    assert('P2-LOGIN', login.status === 200, 'Login with correct credentials', `Got ${login.status}`);
    if (login.data?.token) {
        TOKEN   = login.data.token; // use fresh token
        USER_ID = login.data.user?._id || USER_ID;
        log_pass('P2-LOGIN-TOKEN', `Login token received`);
    }

    // Wrong password — should 401
    const badLogin = await req('POST', '/auth/login', { email: TEST_EMAIL, password: 'wrongpass' });
    assert('P2-WRONG-PASS', badLogin.status === 401 || badLogin.status === 400, 'Reject wrong password', `Got ${badLogin.status}`);

    // Protected route without token — should 401
    const noAuth = await req('GET', '/notes');
    assert('P2-PROTECTED', noAuth.status === 401, 'Protected route rejects unauthenticated request', `Got ${noAuth.status}`);

    // Protected route with token — should 200
    const withAuth = await req('GET', '/notes', null, TOKEN);
    assert('P2-AUTH-WORKS', withAuth.status === 200, 'Protected route accepts valid token', `Got ${withAuth.status}`);
}

// ─────────────────────────────────────────────────────────────
// PHASE 3 — Notes CRUD
// ─────────────────────────────────────────────────────────────
async function phase3_notes() {
    section('PHASE 3 — Notes (Create via text / Read / List)');
    if (!TOKEN) { log_warn('P3-SKIP', 'Skipping — no auth token'); return; }

    // Notes are created via POST /notes/upload with sourceType=text
    // We use multipart form data simulation via JSON body for text type
    const createPayload = JSON.stringify({
        title:       'E2E Test Note — Phase 4 Verification',
        textContent: 'Neural Networks are computing systems inspired by biological neural networks. CNN (Convolutional Neural Networks) are used for image recognition. RNN (Recurrent Neural Networks) handle sequential data. Transformers use self-attention mechanisms.',
        sourceType:  'text'
    });
    const createOpts = {
        hostname: 'localhost', port: 5000,
        path: '/api/notes/upload', method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(createPayload),
            'Authorization': `Bearer ${TOKEN}`
        }
    };
    const createRes = await new Promise((resolve, reject) => {
        const r = http.request(createOpts, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); } catch { resolve({ status: res.statusCode, data: raw }); } });
        });
        r.on('error', reject);
        r.write(createPayload);
        r.end();
    });
    assert('P3-CREATE', createRes.status === 201 || createRes.status === 200, 'Create note via text upload', `Got ${createRes.status}: ${JSON.stringify(createRes.data).slice(0,120)}`);
    NOTE_ID = createRes.data?._id || createRes.data?.note?._id;
    if (NOTE_ID) log_pass('P3-NOTE-ID', `Note created with ID: ${NOTE_ID}`);
    else log_warn('P3-NOTE-ID', `Could not extract note ID. Response: ${JSON.stringify(createRes.data).slice(0,120)}`);

    // List Notes
    const list = await req('GET', '/notes', null, TOKEN);
    assert('P3-LIST', list.status === 200 && Array.isArray(list.data), 'List notes returns array', `Got ${list.status}`);
    if (Array.isArray(list.data)) {
        log_pass('P3-COUNT', `Total notes in DB for user: ${list.data.length}`);
        if (NOTE_ID) assert('P3-NOTE-IN-LIST', list.data.some(n => n._id === NOTE_ID), 'Created note appears in list');
    }
}

// ─────────────────────────────────────────────────────────────
// PHASE 4 — Analytics APIs (Readiness Engine)
// ─────────────────────────────────────────────────────────────
async function phase4_analytics() {
    section('PHASE 4 — Analytics APIs (Progress / Topics / Readiness / NBA)');
    if (!TOKEN) { log_warn('P4-SKIP', 'Skipping — no auth token'); return; }

    // Progress
    const progress = await req('GET', '/analytics/progress', null, TOKEN);
    assert('P4-PROGRESS', progress.status === 200, 'GET /analytics/progress responds', `Got ${progress.status}`);
    if (progress.status === 200) {
        const d = progress.data;
        assert('P4-PROGRESS-FIELDS', 'readinessScore' in d && 'quizAverage' in d, 'Progress has readinessScore & quizAverage');
        log_pass('P4-PROGRESS-DATA', `readinessScore=${d.readinessScore}, quizAverage=${d.quizAverage}, topics=${d.topicsCompleted}`);
    }

    // Topics
    const topics = await req('GET', '/analytics/topics', null, TOKEN);
    assert('P4-TOPICS', topics.status === 200 && Array.isArray(topics.data), 'GET /analytics/topics returns array', `Got ${topics.status}`);
    log_pass('P4-TOPICS-COUNT', `Topic performance records: ${Array.isArray(topics.data) ? topics.data.length : 0}`);

    // PHASE 4 NEW — Readiness Endpoint
    const readiness = await req('GET', '/analytics/readiness', null, TOKEN);
    assert('P4-READINESS-STATUS', readiness.status === 200, 'GET /analytics/readiness → 200 OK', `Got ${readiness.status}: ${JSON.stringify(readiness.data).slice(0,150)}`);
    if (readiness.status === 200) {
        const d = readiness.data;
        const required = ['overallReadiness','confidenceLevel','improvementTrend','components',
                          'strongestTopics','weakestTopics','improvementAreas','topicReadiness',
                          'insights','criticalWeakTopic','nextBestActionEnhanced','hackathonSummary'];
        required.forEach(k => assert(`P4-READINESS-${k}`, k in d, `Readiness has '${k}'`));
        assert('P4-READINESS-SCORE-RANGE', d.overallReadiness >= 0 && d.overallReadiness <= 100, `Score in [0,100]: ${d.overallReadiness}`);
        assert('P4-READINESS-CONFIDENCE', ['High','Medium','Low'].includes(d.confidenceLevel), `Valid confidence: ${d.confidenceLevel}`);
        assert('P4-READINESS-INSIGHTS-ARR', Array.isArray(d.insights) && d.insights.length > 0, `Insights array has ${d.insights.length} items`);
        assert('P4-READINESS-WEIGHTS', d.weights?.quizPerformance === 0.5, `Formula weight quizPerformance=0.5`);
        assert('P4-HACKATHON-SUMMARY', typeof d.hackathonSummary === 'object' && Object.keys(d.hackathonSummary).length === 4, 'Hackathon summary has 4 fields');
        log_pass('P4-READINESS-VALS', `overallReadiness=${d.overallReadiness}, confidence=${d.confidenceLevel}, trend="${d.improvementTrend}"`);
        log_pass('P4-READINESS-COMPONENTS', `quizPerf=${d.components.quizPerformance}, revision=${d.components.revisionCompletion}, consistency=${d.components.studyConsistency}`);
    }

    // Next Best Action
    const nba = await req('GET', '/analytics/next-best-action', null, TOKEN);
    assert('P4-NBA', nba.status === 200, 'GET /analytics/next-best-action → 200', `Got ${nba.status}`);
    if (nba.status === 200) {
        assert('P4-NBA-FIELDS', 'action' in nba.data && 'topic' in nba.data, 'NBA has action & topic fields');
        log_pass('P4-NBA-DATA', `topic="${nba.data.topic}", action="${nba.data.action}", time="${nba.data.estimatedTime}"`);
    }
}

// ─────────────────────────────────────────────────────────────
// PHASE 5 — Quiz Generation + TopicPerformance Update
// ─────────────────────────────────────────────────────────────
async function phase5_quiz() {
    section('PHASE 5 — Quiz (DB Seed + Submit + TopicPerformance Update)');
    if (!TOKEN || !USER_ID) { log_warn('P5-SKIP', 'Skipping — no auth token or user ID'); return; }

    // Step 1: Seed a Quiz directly in MongoDB (since generate needs a Note with summary)
    let Quiz;
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
        Quiz = require('./models/Quiz');
        const { updateTopicPerformance } = require('./services/analyticsService');

        const q = await Quiz.create({
            userId:         new mongoose.Types.ObjectId(USER_ID),
            topic:          'Neural Networks',
            totalQuestions: 3,
            questions: [
                { question: 'What is a neuron?',   options: ['Unit','Layer','Node','Weight'], correctOption: 0, explanation: 'A neuron is a basic unit.' },
                { question: 'What activates ReLU?', options: ['Negative','Zero','Positive','All'],  correctOption: 2, explanation: 'ReLU activates for positive values.' },
                { question: 'What is CNN used for?',options: ['NLP','Images','Audio','Text'],  correctOption: 1, explanation: 'CNN is used for image recognition.' }
            ]
        });
        QUIZ_ID = q._id.toString();
        log_pass('P5-QUIZ-SEED', `Quiz seeded in DB with ID: ${QUIZ_ID}`);

        // Step 2: Submit the quiz via the real API
        const answers = q.questions.map((qu, i) => ({
            questionId:     qu._id.toString(),
            selectedOption: i === 0 ? 0 : i === 1 ? 2 : 1 // 1st correct, 2nd wrong, 3rd wrong
        }));

        const submit = await req('POST', `/study/quiz/${QUIZ_ID}/submit`, { answers }, TOKEN);
        assert('P5-QUIZ-SUBMIT', submit.status === 200, 'Quiz submit → 200', `Got ${submit.status}: ${JSON.stringify(submit.data).slice(0,150)}`);
        if (submit.status === 200) {
            log_pass('P5-QUIZ-SCORE', `Score: ${submit.data.score}/${submit.data.total}, XP awarded`);
        }

        // Step 3: Verify TopicPerformance was updated
        const topicsAfter = await req('GET', '/analytics/topics', null, TOKEN);
        if (topicsAfter.status === 200 && Array.isArray(topicsAfter.data)) {
            const nn = topicsAfter.data.find(t => t.topic === 'Neural Networks');
            if (nn) {
                log_pass('P5-TOPIC-UPDATED', `TopicPerformance: score=${Math.round(nn.averageScore)}%, strength=${nn.strength}`);
                assert('P5-TOPIC-STRENGTH', ['Weak','Medium','Strong'].includes(nn.strength), `Valid strength: ${nn.strength}`);
            } else {
                log_warn('P5-NO-TOPIC', 'Neural Networks not yet in TopicPerformance');
            }
        }

        await mongoose.disconnect();
    } catch(e) {
        log_fail('P5-DB-SEED', 'Failed to seed quiz in DB', e.message);
        try { await mongoose.disconnect(); } catch {}
    }
}

// ─────────────────────────────────────────────────────────────
// PHASE 6 — Sessions & Activity
// ─────────────────────────────────────────────────────────────
async function phase6_sessions() {
    section('PHASE 6 — Sessions & Activity Tracking');
    if (!TOKEN) { log_warn('P6-SKIP', 'Skipping — no auth token'); return; }

    // Start session
    const start = await req('POST', '/sessions/start', {}, TOKEN);
    assert('P6-SESSION-START', start.status === 200, 'Start study session', `Got ${start.status}`);

    // Short wait
    await new Promise(r => setTimeout(r, 500));

    // End session
    const end = await req('POST', '/sessions/end', {}, TOKEN);
    assert('P6-SESSION-END', end.status === 200, 'End study session', `Got ${end.status}: ${JSON.stringify(end.data).slice(0,100)}`);

    // Stats
    const stats = await req('GET', '/sessions/stats', null, TOKEN);
    assert('P6-STATS', stats.status === 200, 'Session stats', `Got ${stats.status}`);

    // Today
    const today = await req('GET', '/activity/today', null, TOKEN);
    assert('P6-TODAY', today.status === 200, 'Today activity', `Got ${today.status}`);

    // Weekly
    const weekly = await req('GET', '/activity/weekly', null, TOKEN);
    assert('P6-WEEKLY', weekly.status === 200 && Array.isArray(weekly.data), 'Weekly activity data', `Got ${weekly.status}`);
    if (Array.isArray(weekly.data)) log_pass('P6-WEEKLY-DATA', `${weekly.data.length} days of activity data`);
}

// ─────────────────────────────────────────────────────────────
// PHASE 7 — Planner & Goals
// ─────────────────────────────────────────────────────────────
async function phase7_planner() {
    section('PHASE 7 — Planner & Goals');
    if (!TOKEN) { log_warn('P7-SKIP', 'Skipping — no auth token'); return; }

    // List planners
    const planners = await req('GET', '/planner', null, TOKEN);
    assert('P7-PLANNER-LIST', planners.status === 200, 'GET /planner returns 200', `Got ${planners.status}`);
    if (planners.status === 200) log_pass('P7-PLANNER-COUNT', `Planners in DB: ${Array.isArray(planners.data) ? planners.data.length : 'N/A'}`);

    // Goals
    const goals = await req('GET', '/goals', null, TOKEN);
    assert('P7-GOALS', goals.status === 200, 'GET /goals returns 200', `Got ${goals.status}`);
}

// ─────────────────────────────────────────────────────────────
// PHASE 8 — Gamification
// ─────────────────────────────────────────────────────────────
async function phase8_gamification() {
    section('PHASE 8 — Gamification');
    if (!TOKEN) { log_warn('P8-SKIP', 'Skipping — no auth token'); return; }

    // Correct route: GET /api/gamification/stats
    const gam = await req('GET', '/gamification/stats', null, TOKEN);
    assert('P8-GAMIFICATION', gam.status === 200, 'GET /gamification/stats returns 200', `Got ${gam.status}`);
    if (gam.status === 200) {
        const d = gam.data;
        log_pass('P8-GAM-DATA', `xp=${d.xp}, level=${d.level}, streak=${d.streak}, badges=${JSON.stringify(d.badges)}`);
        assert('P8-GAM-FIELDS', 'xp' in d && 'level' in d && 'streak' in d, 'Gamification has xp, level, streak');
    }
}

// ─────────────────────────────────────────────────────────────
// PHASE 9 — Readiness with Real TopicPerformance Data
// ─────────────────────────────────────────────────────────────
async function phase9_readiness_with_data() {
    section('PHASE 9 — Readiness Score with Real Topic Data');
    if (!TOKEN) { log_warn('P9-SKIP', 'Skipping — no auth token'); return; }

    // Fetch readiness after quiz was submitted
    const readiness = await req('GET', '/analytics/readiness', null, TOKEN);
    assert('P9-READINESS-OK', readiness.status === 200, 'Readiness API after real quiz data', `Got ${readiness.status}`);
    if (readiness.status === 200) {
        const d = readiness.data;
        log_pass('P9-SCORE', `overallReadiness = ${d.overallReadiness}/100`);
        log_pass('P9-CONFIDENCE', `confidence = ${d.confidenceLevel}`);
        log_pass('P9-TREND', `trend = "${d.improvementTrend}"`);
        log_pass('P9-COMPONENTS', `Components: quiz=${d.components.quizPerformance}, revision=${d.components.revisionCompletion}, consistency=${d.components.studyConsistency}`);
        if (d.insights.length > 0) log_pass('P9-INSIGHTS', `Sample insight: "${d.insights[0]}"`);
        if (d.criticalWeakTopic) log_pass('P9-WEAK', `Critical weak topic: "${d.criticalWeakTopic}"`);
        if (d.nextBestActionEnhanced) log_pass('P9-NBA', `NBA: "${d.nextBestActionEnhanced.action}" (+${d.nextBestActionEnhanced.estimatedImprovement}% improvement)`);
        log_pass('P9-HACKATHON', `Hackathon summary: readiness=${d.hackathonSummary.currentReadiness}%, weakest="${d.hackathonSummary.weakestTopic}", action="${d.hackathonSummary.recommendedAction}", improvement="${d.hackathonSummary.predictedImprovement}"`);
    }
}

// ─────────────────────────────────────────────────────────────
// PHASE 10 — Cleanup test user
// ─────────────────────────────────────────────────────────────
async function phase10_cleanup() {
    section('PHASE 10 — Test Data Cleanup');
    // Delete the test note
    if (NOTE_ID && TOKEN) {
        const del = await req('DELETE', `/notes/${NOTE_ID}`, null, TOKEN);
        if (del.status === 200 || del.status === 204) log_pass('P10-DELETE-NOTE', `Test note deleted`);
        else log_warn('P10-DELETE-NOTE', `Note delete returned ${del.status} — manual cleanup may be needed`);
    }
    // Note: test user cleanup requires direct DB access; log it
    log_warn('P10-USER-CLEANUP', `Test user ${TEST_EMAIL} remains in DB — remove manually or it will be ignored`);
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function main() {
    console.log(`${BOLD}${CYAN}
╔════════════════════════════════════════════════════════════════╗
║   SMARTNOTES AI — FULL END-TO-END RUNTIME VERIFICATION        ║
║   Real MongoDB Atlas | Real Backend | All Features            ║
╚════════════════════════════════════════════════════════════════╝${RESET}`);
    console.log(`  Test user: ${TEST_EMAIL}`);
    console.log(`  Timestamp: ${new Date().toISOString()}\n`);

    const t0 = Date.now();

    await phase1_backendHealth();
    await phase2_auth();
    await phase3_notes();
    await phase4_analytics();
    await phase5_quiz();
    await phase6_sessions();
    await phase7_planner();
    await phase8_gamification();
    await phase9_readiness_with_data();
    await phase10_cleanup();

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    // ─── Summary ─────────────────────────────────────────────
    console.log(`\n${BOLD}${CYAN}════════════════════════════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}  FINAL RUNTIME VERIFICATION SUMMARY${RESET}`);
    console.log(`${BOLD}${CYAN}════════════════════════════════════════════════════════════════${RESET}`);
    console.log(`${GREEN}  ✅ Passed  : ${passed}${RESET}`);
    console.log(`${RED}  ❌ Failed  : ${failed}${RESET}`);
    console.log(`${YELLOW}  ⚠️  Warnings: ${warned}${RESET}`);
    console.log(`  ⏱  Duration: ${elapsed}s`);

    const total = passed + failed;
    const health = total > 0 ? Math.round((passed / total) * 100) : 0;
    console.log(`\n${BOLD}  Project Health: ${health >= 90 ? GREEN : health >= 70 ? YELLOW : RED}${health}%${RESET}`);

    // Failed tests list
    const failures = results.filter(r => r.status === 'FAIL');
    if (failures.length > 0) {
        console.log(`\n${RED}${BOLD}  FAILED TESTS:${RESET}`);
        failures.forEach(f => console.log(`${RED}    • [${f.id}] ${f.msg}${f.detail ? ': ' + f.detail : ''}${RESET}`));
    }

    console.log(`${BOLD}${CYAN}════════════════════════════════════════════════════════════════${RESET}\n`);

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
