/**
 * SmartNotes AI — Optimization Verification Tests
 * Run: node test-optimizations.js
 * Tests: safeParseJSON, generateSummary (conciseness), generateCompactRevisionNotes
 */

const {
    safeParseJSON,
    generateSummary,
    generateCompactRevisionNotes,
    generateUniversityFlashcards,
    generateQuiz,
} = require('./services/llmService');

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
    if (condition) {
        console.log(`  ✅ PASS: ${label}`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
        failed++;
    }
}

// ─── TEST 1: safeParseJSON — strips markdown fences ───────────────────────
console.log('\n[TEST 1] safeParseJSON — strips ```json fences');
try {
    const raw = '```json\n[{"question":"What is X?","answer":"X is Y."}]\n```';
    const result = safeParseJSON(raw, 'array');
    assert('returns array', Array.isArray(result));
    assert('has 1 item', result.length === 1);
    assert('item has question', !!result[0].question);
} catch (e) {
    assert('safeParseJSON with fences', false, e.message);
}

// ─── TEST 2: safeParseJSON — removes bad control chars ────────────────────
console.log('\n[TEST 2] safeParseJSON — removes bad control characters');
try {
    // Embed a bad control char (0x08 backspace) inside a JSON string
    const raw = '[{"question":"What\x08 is X?","answer":"Y"}]';
    const result = safeParseJSON(raw, 'array');
    assert('parses without error', Array.isArray(result));
    assert('control char stripped from question', !result[0].question.includes('\x08'));
} catch (e) {
    assert('safeParseJSON bad control chars', false, e.message);
}

// ─── TEST 3: safeParseJSON — handles unescaped newlines in strings ─────────
console.log('\n[TEST 3] safeParseJSON — handles unescaped newlines in answer strings');
try {
    const raw = '[{"question":"Q?","answer":"Line 1\nLine 2"}]';
    const result = safeParseJSON(raw, 'array');
    assert('parses without crash', Array.isArray(result));
    assert('has answer', !!result[0].answer);
} catch (e) {
    assert('safeParseJSON unescaped newlines', false, e.message);
}

// ─── TEST 4: safeParseJSON — object type ──────────────────────────────────
console.log('\n[TEST 4] safeParseJSON — object type extraction');
try {
    const raw = 'Some prefix text\n{"key": "value", "nested": {"a": 1}}\nSome suffix';
    const result = safeParseJSON(raw, 'object');
    assert('returns object', typeof result === 'object' && !Array.isArray(result));
    assert('has key', result.key === 'value');
    assert('has nested', result.nested?.a === 1);
} catch (e) {
    assert('safeParseJSON object', false, e.message);
}

// ─── TEST 5: generateSummary — conciseness check ──────────────────────────
console.log('\n[TEST 5] generateSummary — conciseness (≤350 words)');
const sampleText = `
Java Servlets are server-side Java programs that handle HTTP requests and responses.
They extend the capabilities of web servers. A servlet lifecycle consists of:
init() - called once when servlet is loaded
service() - called for each request
destroy() - called when servlet is unloaded
Servlets use HttpServletRequest and HttpServletResponse objects.
The doGet() and doPost() methods handle GET and POST requests respectively.
Session management can be done using HttpSession.
Cookies are small pieces of data stored on the client.
URL rewriting appends session ID to URLs.
`;

(async () => {
    try {
        console.log('  Calling Groq API for summary (this will take a few seconds)...');
        const summary = await generateSummary(sampleText, 600);
        const wordCount = summary.split(/\s+/).length;
        console.log(`  Summary word count: ${wordCount}`);
        console.log(`  Summary length: ${summary.length} chars`);
        assert('summary returned', !!summary && summary.length > 0);
        assert('summary ≤ 400 words', wordCount <= 400, `got ${wordCount} words`);
        assert('summary has bullet points', summary.includes('•') || summary.includes('-'), 'no bullets found');
        assert('summary not too short', wordCount >= 30, `only ${wordCount} words`);
    } catch (e) {
        assert('generateSummary API call', false, e.message);
    }

    // ─── TEST 6: generateCompactRevisionNotes ─────────────────────────────
    console.log('\n[TEST 6] generateCompactRevisionNotes — consolidation of chunk summaries');
    try {
        const fakeSummaries = [
            '📌 KEY CONCEPTS\n• Servlet – server-side Java program\n• init() – runs once on load\n\n⭐ EXAM POINTS\n• Servlets extend HttpServlet',
            '📌 KEY CONCEPTS\n• doGet() – handles GET requests\n• doPost() – handles POST requests\n\n📐 FORMULAS\n• N/A\n\n⭐ EXAM POINTS\n• Use HttpSession for session management',
            '📌 KEY CONCEPTS\n• Cookie – client-side storage\n• URL Rewriting – appends session ID to URL\n\n⭐ EXAM POINTS\n• Cookies are set via response.addCookie()',
        ];
        console.log('  Calling Groq API for consolidation (this will take a few seconds)...');
        const consolidated = await generateCompactRevisionNotes(fakeSummaries);
        const wordCount = consolidated.split(/\s+/).length;
        console.log(`  Consolidated note word count: ${wordCount}`);
        console.log(`  Consolidated note length: ${consolidated.length} chars`);
        assert('consolidated returned', !!consolidated && consolidated.length > 0);
        assert('consolidated ≤ 700 words', wordCount <= 700, `got ${wordCount} words`);
        assert('no duplication bloat (< 4000 chars)', consolidated.length < 4000, `${consolidated.length} chars`);
    } catch (e) {
        assert('generateCompactRevisionNotes', false, e.message);
    }

    // ─── TEST 7: generateUniversityFlashcards — JSON parse ────────────────
    console.log('\n[TEST 7] generateUniversityFlashcards — returns valid JSON object');
    try {
        const text = 'Servlets handle HTTP requests. doGet handles GET. doPost handles POST. Sessions use HttpSession. Cookies store client data.';
        console.log('  Calling Groq API for flashcards...');
        const cards = await generateUniversityFlashcards(text);
        assert('returns object', typeof cards === 'object' && !Array.isArray(cards));
        assert('has twoMark array', Array.isArray(cards.twoMark));
        assert('has fiveMark array', Array.isArray(cards.fiveMark));
        assert('has tenMark array', Array.isArray(cards.tenMark));
        assert('twoMark has items', cards.twoMark.length > 0);
        assert('each card has question+answer', !!(cards.twoMark[0]?.question && cards.twoMark[0]?.answer));
    } catch (e) {
        assert('generateUniversityFlashcards', false, e.message);
    }

    // ─── RESULTS ──────────────────────────────────────────────────────────
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
    if (failed === 0) {
        console.log('🎉 ALL TESTS PASSED — optimizations are working correctly!');
    } else {
        console.log('⚠️  Some tests failed. Check the errors above.');
        process.exit(1);
    }
})();
