/**
 * ============================================================
 * SMARTNOTES AI — FULL RUNTIME VERIFICATION WITH AI TUTOR
 * Uses REAL MongoDB Atlas | REAL Groq API | No Mocks
 * ============================================================
 * Run: node test_full_production.js
 */

const http = require('http');
const https = require('https');
const dotenv = require('dotenv');
dotenv.config();

const BASE = 'http://localhost:5000/api';
const TEST_EMAIL = `prod_test_${Date.now()}@smartnotes.ai`;
const TEST_PASS  = 'TestPass@2024';
const TEST_NAME  = 'Production Test User';

let TOKEN   = null;
let USER_ID = null;
let NOTE_ID = null;

// ─── Results ────────────────────────────────────────────────
const results = [];
let passed = 0, failed = 0, warned = 0;

// ─── HTTP helpers ────────────────────────────────────────────
const req = (method, path, body = null, token = null) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: `/api${path}`,
        method,
        headers: {
            'Content-Type': 'application/json',
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
    r.setTimeout(60000, () => { r.destroy(); reject(new Error('Request timeout after 60s')); });
    if (data) r.write(data);
    r.end();
});

// ─── Helpers ─────────────────────────────────────────────────
const GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', BOLD = '\x1b[1m', RESET = '\x1b[0m';
const log_pass = (id, msg) => { console.log(`${GREEN}  ✅ [${id}] ${msg}${RESET}`); passed++; results.push({ id, status: 'PASS', msg }); };
const log_fail = (id, msg, detail) => { console.log(`${RED}  ❌ [${id}] ${msg}${detail ? ' — ' + detail : ''}${RESET}`); failed++; results.push({ id, status: 'FAIL', msg, detail }); };
const log_warn = (id, msg) => { console.log(`${YELLOW}  ⚠️  [${id}] ${msg}${RESET}`); warned++; results.push({ id, status: 'WARN', msg }); };
const section = t => console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════\n  ${t}\n══════════════════════════════════════════${RESET}`);
const assert = (id, cond, msg, detail = '') => cond ? log_pass(id, msg) : log_fail(id, msg, detail);

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Phase 1: Route Health ────────────────────────────────────
async function phase1() {
    section('PHASE 1 — Backend Health & Route Registration');
    const routes = [
        { path: '/auth/login',               method: 'POST', expectNot404: true },
        { path: '/notes',                    method: 'GET',  expectAuth: true },
        { path: '/study/quiz/generate',      method: 'POST', expectAuth: true },
        { path: '/study/flashcard/generate', method: 'POST', expectAuth: true },
        { path: '/study/question-papers',    method: 'GET',  expectAuth: true },
        { path: '/planner',                  method: 'GET',  expectAuth: true },
        { path: '/analytics/topics',         method: 'GET',  expectAuth: true },
        { path: '/analytics/readiness',      method: 'GET',  expectAuth: true },
        { path: '/analytics/next-best-action',method:'GET',  expectAuth: true },
        { path: '/analytics/progress',       method: 'GET',  expectAuth: true },
        { path: '/sessions/stats',           method: 'GET',  expectAuth: true },
        { path: '/activity/weekly',          method: 'GET',  expectAuth: true },
        { path: '/gamification/stats',       method: 'GET',  expectAuth: true },
        { path: '/goals',                    method: 'GET',  expectAuth: true },
        { path: '/tutor/history',            method: 'GET',  expectAuth: true },
        { path: '/tutor/ask',                method: 'POST', expectAuth: true },
    ];

    for (const route of routes) {
        try {
            const r = await req(route.method, route.path, route.method === 'POST' ? {} : null);
            if (route.expectAuth) {
                assert(`P1-${route.path}`, r.status !== 404,
                    `Route ${route.method} ${route.path} registered`, `Got ${r.status}`);
            } else {
                assert(`P1-${route.path}`, r.status < 500,
                    `Route ${route.method} ${route.path} responds`, `Got ${r.status}`);
            }
        } catch (e) {
            log_fail(`P1-${route.path}`, `Route check failed`, e.message);
        }
    }
}

// ─── Phase 2: Auth ────────────────────────────────────────────
async function phase2() {
    section('PHASE 2 — Authentication');
    try {
        const r = await req('POST', '/auth/register', { name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASS });
        assert('P2-REGISTER', r.status === 201, 'Register new user', `Got ${r.status}: ${JSON.stringify(r.data)}`);
        if (r.status === 201 && r.data.token) {
            TOKEN = r.data.token;
            USER_ID = r.data._id;
            log_pass('P2-TOKEN', 'JWT token received');
        } else {
            log_fail('P2-TOKEN', 'No JWT token in register response', JSON.stringify(r.data));
        }
    } catch (e) {
        log_fail('P2-REGISTER', 'Register request failed', e.message);
        return;
    }

    // Login
    try {
        const r = await req('POST', '/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
        assert('P2-LOGIN', r.status === 200 && r.data.token, 'Login returns JWT', `Got ${r.status}`);
        if (r.data.token) TOKEN = r.data.token; // refresh token
    } catch (e) {
        log_fail('P2-LOGIN', 'Login request failed', e.message);
    }

    // Wrong password
    try {
        const r = await req('POST', '/auth/login', { email: TEST_EMAIL, password: 'WRONGPASS' });
        assert('P2-WRONG-PASS', r.status === 401, 'Wrong password rejected', `Got ${r.status}`);
    } catch (e) {
        log_fail('P2-WRONG-PASS', 'Wrong password test failed', e.message);
    }

    // Protected route
    try {
        const r = await req('GET', '/notes', null, TOKEN);
        assert('P2-PROTECTED', r.status !== 401, 'Protected route accepts valid token', `Got ${r.status}`);
    } catch (e) {
        log_fail('P2-PROTECTED', 'Protected route test failed', e.message);
    }
}

// ─── Phase 3: Notes ───────────────────────────────────────────
async function phase3() {
    section('PHASE 3 — Notes (Text Input)');
    if (!TOKEN) { log_warn('P3-SKIP', 'Skipping — no auth token'); return; }

    try {
        const r = await req('POST', '/study/generate-notes', {
            title: 'Test Note - Python Basics',
            text: 'Python is a high-level programming language. It supports object-oriented, imperative and functional programming. It has dynamic typing and automatic memory management. Variables are dynamically typed. Indentation defines code blocks.'
        }, TOKEN);
        assert('P3-CREATE-TEXT', r.status === 201 || r.status === 200, 'Text note created', `Got ${r.status}: ${JSON.stringify(r.data)?.slice(0,200)}`);
        if ((r.status === 201 || r.status === 200) && (r.data._id || r.data.noteId)) {
            NOTE_ID = r.data._id || r.data.noteId;
            log_pass('P3-NOTE-ID', `Note ID: ${NOTE_ID}`);
        }
    } catch (e) {
        log_fail('P3-CREATE-TEXT', 'Text note creation failed', e.message);
    }

    // List notes
    try {
        const r = await req('GET', '/notes', null, TOKEN);
        assert('P3-LIST', r.status === 200 && Array.isArray(r.data), 'Notes list returned', `Got ${r.status}`);
        // If text note creation failed, grab first existing note for downstream tests
        if (Array.isArray(r.data) && r.data.length > 0 && !NOTE_ID) {
            NOTE_ID = r.data[0]._id;
            log_warn('P3-NOTE-FALLBACK', `Using existing note ID: ${NOTE_ID}`);
        }
    } catch (e) {
        log_fail('P3-LIST', 'Notes list failed', e.message);
    }
}

// ─── Phase 4: AI Tutor ────────────────────────────────────────
async function phase4() {
    section('PHASE 4 — AI Tutor');
    if (!TOKEN) { log_warn('P4-SKIP', 'Skipping — no auth token'); return; }

    // Ask without context
    try {
        const r = await req('POST', '/tutor/ask', {
            question: 'What is object-oriented programming?',
            topic: 'Computer Science'
        }, TOKEN);
        assert('P4-ASK-NO-CTX', r.status === 200, 'AI Tutor responds without context', `Got ${r.status}: ${JSON.stringify(r.data)?.slice(0, 200)}`);

        if (r.status === 200) {
            const d = r.data;
            assert('P4-SIMPLE-EXPL', d.simpleExplanation?.length > 0, 'simpleExplanation present');
            assert('P4-DETAILED-EXPL', d.detailedExplanation?.length > 0, 'detailedExplanation present');
            assert('P4-KEY-CONCEPTS', Array.isArray(d.keyConcepts) && d.keyConcepts.length > 0, 'keyConcepts is array');
            assert('P4-TOPIC', d.topic?.length > 0, 'topic detected');
            assert('P4-DOUBT-ID', d.doubtId !== null && d.doubtId !== undefined, 'doubtId saved to DB');
        }
    } catch (e) {
        log_fail('P4-ASK-NO-CTX', 'AI Tutor ask failed', e.message);
    }

    // Ask with note context
    if (NOTE_ID) {
        try {
            const r = await req('POST', '/tutor/ask', {
                question: 'What does this note cover?',
                noteId: NOTE_ID
            }, TOKEN);
            assert('P4-ASK-CTX', r.status === 200, 'AI Tutor responds with note context', `Got ${r.status}: ${JSON.stringify(r.data)?.slice(0, 200)}`);
            if (r.status === 200) {
                assert('P4-NOTE-CTX-FLAG', r.data.hadNoteContext === true, 'hadNoteContext flag is true');
            }
        } catch (e) {
            log_fail('P4-ASK-CTX', 'AI Tutor ask with context failed', e.message);
        }
    }

    // Get history
    try {
        const r = await req('GET', '/tutor/history', null, TOKEN);
        assert('P4-HISTORY', r.status === 200 && Array.isArray(r.data), 'Tutor history returns array', `Got ${r.status}`);
        if (Array.isArray(r.data) && r.data.length > 0) {
            assert('P4-HISTORY-CONTENT', r.data[0].question?.length > 0, 'History has question');
        }
    } catch (e) {
        log_fail('P4-HISTORY', 'Tutor history failed', e.message);
    }
}

// ─── Phase 5: Study Features ──────────────────────────────────
async function phase5() {
    section('PHASE 5 — Quiz, Flashcards, Question Paper');
    if (!TOKEN || !NOTE_ID) { log_warn('P5-SKIP', 'Skipping — no auth token or note ID'); return; }

    // Quiz
    try {
        const r = await req('POST', '/study/quiz/generate', {
            topic: 'Python',
            numQuestions: 3,
            noteId: NOTE_ID
        }, TOKEN);
        assert('P5-QUIZ', r.status === 200 || r.status === 201, 'Quiz generated', `Got ${r.status}`);
        if (r.status === 200 || r.status === 201) {
            // Route returns { quiz, gamification } where quiz.questions is the array
            const quizObj = r.data.quiz || r.data;
            const qs = quizObj.questions || r.data.questions;
            assert('P5-QUIZ-QS', Array.isArray(qs) && qs.length > 0, `Quiz has questions (${qs?.length})`);
        }
    } catch (e) {
        log_fail('P5-QUIZ', 'Quiz generation failed', e.message);
    }

    // Flashcards
    try {
        const r = await req('POST', '/study/flashcard/generate', {
            topic: 'Python',
            noteId: NOTE_ID
        }, TOKEN);
        assert('P5-FLASH', r.status === 200 || r.status === 201, 'Flashcards generated', `Got ${r.status}`);
        if ((r.status === 200 || r.status === 201) && r.data) {
            assert('P5-FLASH-CONTENT', r.data.flashcards || r.data._id, 'Flashcard data returned');
        }
    } catch (e) {
        log_fail('P5-FLASH', 'Flashcard generation failed', e.message);
    }

    // Question papers list
    try {
        const r = await req('GET', '/study/question-papers', null, TOKEN);
        assert('P5-QPAPERS-LIST', r.status === 200 && Array.isArray(r.data), 'Question papers list', `Got ${r.status}`);
    } catch (e) {
        log_fail('P5-QPAPERS-LIST', 'Question papers list failed', e.message);
    }
}

// ─── Phase 6: Planner ─────────────────────────────────────────
async function phase6() {
    section('PHASE 6 — Study Planner');
    if (!TOKEN) { log_warn('P6-SKIP', 'Skipping — no auth token'); return; }

    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 7);

    try {
        const r = await req('POST', '/planner', {
            topic: 'Python Basics',
            examDate: examDate.toISOString().split('T')[0],
            availableHours: 3,
            noteContent: 'Python is a high-level programming language.'
        }, TOKEN);
        assert('P6-CREATE', r.status === 201 || r.status === 200, 'Planner created', `Got ${r.status}`);
        if ((r.status === 201 || r.status === 200) && r.data.plan) {
            assert('P6-PLAN-DAYS', Array.isArray(r.data.plan) && r.data.plan.length > 0, `Plan has ${r.data.plan.length} days`);
        }
    } catch (e) {
        log_fail('P6-CREATE', 'Planner creation failed', e.message);
    }

    // Get planner
    try {
        const r = await req('GET', '/planner', null, TOKEN);
        assert('P6-LIST', r.status === 200 && Array.isArray(r.data), 'Planner list returned', `Got ${r.status}`);
    } catch (e) {
        log_fail('P6-LIST', 'Planner list failed', e.message);
    }
}

// ─── Phase 7: Analytics ───────────────────────────────────────
async function phase7() {
    section('PHASE 7 — Analytics');
    if (!TOKEN) { log_warn('P7-SKIP', 'Skipping — no auth token'); return; }

    const endpoints = [
        { path: '/analytics/topics', id: 'P7-TOPICS' },
        { path: '/analytics/progress', id: 'P7-PROGRESS' },
        { path: '/analytics/readiness', id: 'P7-READINESS' },
        { path: '/analytics/next-best-action', id: 'P7-NBA' },
    ];

    for (const e of endpoints) {
        try {
            const r = await req('GET', e.path, null, TOKEN);
            assert(e.id, r.status === 200, `${e.path} returns 200`, `Got ${r.status}: ${JSON.stringify(r.data)?.slice(0,100)}`);
        } catch (err) {
            log_fail(e.id, `${e.path} failed`, err.message);
        }
    }
}

// ─── Phase 8: Gamification ────────────────────────────────────
async function phase8() {
    section('PHASE 8 — Gamification');
    if (!TOKEN) { log_warn('P8-SKIP', 'Skipping — no auth token'); return; }

    try {
        const r = await req('GET', '/gamification/stats', null, TOKEN);
        assert('P8-STATS', r.status === 200, 'Gamification stats returned', `Got ${r.status}`);
        if (r.status === 200) {
            assert('P8-XP', r.data.xp !== undefined, 'XP field present');
            assert('P8-LEVEL', r.data.level !== undefined, 'Level field present');
        }
    } catch (e) {
        log_fail('P8-STATS', 'Gamification stats failed', e.message);
    }

    try {
        const r = await req('GET', '/goals', null, TOKEN);
        assert('P8-GOALS', r.status === 200 && Array.isArray(r.data), 'Goals list returned', `Got ${r.status}`);
    } catch (e) {
        log_fail('P8-GOALS', 'Goals list failed', e.message);
    }
}

// ─── Phase 9: Sessions & Activity ─────────────────────────────
async function phase9() {
    section('PHASE 9 — Sessions & Activity');
    if (!TOKEN) { log_warn('P9-SKIP', 'Skipping — no auth token'); return; }

    try {
        const r = await req('GET', '/sessions/stats', null, TOKEN);
        assert('P9-SESSIONS', r.status === 200, 'Sessions stats returned', `Got ${r.status}`);
    } catch (e) {
        log_fail('P9-SESSIONS', 'Sessions stats failed', e.message);
    }

    try {
        const r = await req('GET', '/activity/weekly', null, TOKEN);
        assert('P9-ACTIVITY', r.status === 200, 'Weekly activity returned', `Got ${r.status}`);
    } catch (e) {
        log_fail('P9-ACTIVITY', 'Weekly activity failed', e.message);
    }
}

// ─── Summary ─────────────────────────────────────────────────
function printSummary(durationMs) {
    const width = 64;
    const line  = '═'.repeat(width);
    console.log(`\n${BOLD}${CYAN}${line}${RESET}`);
    console.log(`${BOLD}${CYAN}  PRODUCTION VERIFICATION SUMMARY${RESET}`);
    console.log(`${BOLD}${CYAN}${line}${RESET}`);
    console.log(`  ${GREEN}✅ Passed  : ${passed}${RESET}`);
    console.log(`  ${RED}❌ Failed  : ${failed}${RESET}`);
    console.log(`  ${YELLOW}⚠️  Warnings: ${warned}${RESET}`);
    console.log(`  ⏱  Duration: ${(durationMs/1000).toFixed(1)}s`);
    const health = Math.round((passed / (passed + failed)) * 100) || 0;
    console.log(`\n  Project Health: ${health >= 90 ? GREEN : health >= 70 ? YELLOW : RED}${health}%${RESET}`);

    const failures = results.filter(r => r.status === 'FAIL');
    if (failures.length) {
        console.log(`\n  FAILED TESTS:`);
        failures.forEach(f => console.log(`    • [${f.id}] ${f.msg}${f.detail ? ': ' + f.detail : ''}`));
    } else {
        console.log(`\n  ${GREEN}${BOLD}ALL TESTS PASSED — Application is production-ready! 🚀${RESET}`);
    }
    console.log(`${BOLD}${CYAN}${line}${RESET}\n`);
}

// ─── Main ─────────────────────────────────────────────────────
(async () => {
    const start = Date.now();
    console.log(`${BOLD}${CYAN}\n${'═'.repeat(64)}\n  SMARTNOTES AI — PRODUCTION RUNTIME VERIFICATION\n  Real MongoDB Atlas | Real Groq API | No Mocks\n${'═'.repeat(64)}${RESET}`);
    console.log(`  Test user: ${TEST_EMAIL}\n  Timestamp: ${new Date().toISOString()}\n`);

    await phase1();
    await phase2();
    await phase3();
    await phase4();
    await phase5();
    await phase6();
    await phase7();
    await phase8();
    await phase9();

    printSummary(Date.now() - start);

    // Exit properly
    setTimeout(() => process.exit(failed > 0 ? 1 : 0), 500);
})();
