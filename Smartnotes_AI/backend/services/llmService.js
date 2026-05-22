const Groq = require('groq-sdk');
const dotenv = require('dotenv');

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const MODEL = 'llama-3.1-8b-instant';

// ─────────────────────────────────────────────────────────────
// CORE GROQ CALLER
// temperature: 0.7 for freeform text, 0.3 for JSON outputs
// ─────────────────────────────────────────────────────────────
const callGroq = async (systemPrompt, userPrompt, maxTokens = 500, temperature = 0.7) => {
    try {
        const payload = {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: MODEL,
            temperature,
            max_tokens: maxTokens,
        };
        const chatCompletion = await groq.chat.completions.create(payload);
        return chatCompletion.choices[0].message.content;
    } catch (error) {
        console.error('Groq API Error:', error.response?.data || error.message);
        throw new Error('LLM generation failed: ' + (error.message || 'Unknown error'));
    }
};

// ─────────────────────────────────────────────────────────────
// SAFE JSON PARSER
// Strips markdown wrappers, removes bad control characters,
// extracts first valid JSON array or object, then parses.
// type: 'array' | 'object' — which bracket type to extract
// ─────────────────────────────────────────────────────────────
const safeParseJSON = (raw, type = 'array') => {
    if (!raw) {
        throw new Error(`Empty LLM response, cannot parse ${type}`);
    }

    // 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
    let cleaned = raw
        .replace(/^```+(?:json)?\s*/im, '')
        .replace(/\s*```+$/im, '')
        .trim();

    // 2. Remove invalid control characters (0x00–0x1F except \t \n \r)
    // The "Bad control character in string literal" error is usually caused by 
    // real newlines or other hidden chars inside a string.
    // eslint-disable-next-line no-control-regex
    cleaned = cleaned.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '');

    // 3. Normalise Windows line endings and sanitize remaining problematic newlines
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Attempt to handle cases where the model puts unescaped newlines in the middle of a string
    // This is a partial fix: it looks for newlines that are not preceded by a comma/bracket/digit/quote
    // However, it's safer to just let the regex below find the JSON block first.

    // 4. Extract first matching JSON block based on depth counting to handle nested structures
    const openChar  = type === 'array' ? '[' : '{';
    const closeChar = type === 'array' ? ']' : '}';
    
    const start = cleaned.indexOf(openChar);
    if (start === -1) {
        throw new Error(`No valid JSON ${type} start (${openChar}) found in LLM response`);
    }

    // Find the matching closing bracket by tracking depth
    let depth = 0;
    let end = -1;
    for (let i = start; i < cleaned.length; i++) {
        if (cleaned[i] === openChar) depth++;
        else if (cleaned[i] === closeChar) {
            depth--;
            if (depth === 0) {
                end = i;
                break;
            }
        }
    }

    if (end === -1) {
        // Fallback to last index if depth matching fails
        end = cleaned.lastIndexOf(closeChar);
    }

    if (end === -1 || end <= start) {
        throw new Error(`No valid JSON ${type} found in LLM response`);
    }

    let jsonString = cleaned.slice(start, end + 1);

    // 5. Final sanitation — walk character by character and escape any literal
    // newlines / tabs / carriage-returns found inside JSON string values.
    // The regex approach is unreliable because it can't handle nested quotes correctly.
    let sanitized = '';
    let inString = false;
    let i2 = 0;
    while (i2 < jsonString.length) {
        const ch = jsonString[i2];
        if (ch === '"' && (i2 === 0 || jsonString[i2 - 1] !== '\\')) {
            inString = !inString;
            sanitized += ch;
        } else if (inString) {
            // Inside a string — escape problematic raw characters
            if      (ch === '\n') sanitized += '\\n';
            else if (ch === '\r') sanitized += '\\r';
            else if (ch === '\t') sanitized += '\\t';
            else                  sanitized += ch;
        } else {
            sanitized += ch;
        }
        i2++;
    }
    jsonString = sanitized;

    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse cleaned JSON string:", jsonString);
        throw new Error(`JSON parse failed: ${e.message}`);
    }
};

// ─────────────────────────────────────────────────────────────
// 1. CONCISE CHUNK SUMMARY
// Generates exam-focused bullet notes from one text chunk.
// Target: ≤ 300 words per chunk, bullet points only.
// ─────────────────────────────────────────────────────────────
const generateSummary = async (text, maxTokens = 800) => {
    const contentText = text.slice(0, 4000);

    const systemPrompt = `You are a university exam revision assistant. Your job is to extract only the most important information for last-minute exam preparation.`;

    const userPrompt = `Extract ALL key points from the content below for university exam revision.

RULES:
- Cover EVERY topic and concept mentioned — do not skip anything.
- Use ONLY bullet points. No long paragraphs.
- One bullet per concept/definition/formula.
- Keep each bullet to one clear line.
- Format:

📌 KEY CONCEPTS
• [concept] – [one-line definition]
• [concept] – [one-line definition]

📐 FORMULAS / DEFINITIONS (if any)
• [formula or term] = [value/meaning]

⭐ IMPORTANT POINTS
• [important exam point]
• [important exam point]

Content:
${contentText}`;

    return await callGroq(systemPrompt, userPrompt, maxTokens, 0.5);
};

// ─────────────────────────────────────────────────────────────
// 2. FULL REVISION NOTES CONSOLIDATOR
// Takes all per-chunk bullet summaries and merges them into
// one complete revision note covering ALL topics in the document.
// ─────────────────────────────────────────────────────────────
const generateCompactRevisionNotes = async (chunkSummaries) => {
    // Join all summaries — allow up to 12000 chars so no topic is cut off
    const combined = chunkSummaries.join('\n\n---\n\n').slice(0, 12000);

    const systemPrompt = `You are a university exam revision assistant. Your job is to create comprehensive revision notes that cover EVERY topic from the provided summaries.`;

    const userPrompt = `Below are section-by-section bullet summaries from a university document.
Merge them into ONE COMPREHENSIVE REVISION NOTE that covers ALL topics.

RULES:
- Include key points from EVERY section — do not skip any topic.
- Remove exact duplicates but keep all unique concepts.
- Use bullet points only. No long paragraphs.
- Group related concepts under clear headings.
- Format:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 TOPIC OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• [what this document covers overall]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 KEY DEFINITIONS & CONCEPTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• [Term] – [definition]
• [Term] – [definition]
(list ALL terms from all sections)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 FORMULAS & RULES (if any)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• [Formula / Rule]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ KEY EXAM POINTS (ALL topics)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• [exam point from section 1]
• [exam point from section 2]
• [exam point from section 3]
(include important points from every section)

Section Summaries to merge:
${combined}`;

    // 2000 tokens gives room for comprehensive notes covering all topics
    return await callGroq(systemPrompt, userPrompt, 2000, 0.5);
};

// ─────────────────────────────────────────────────────────────
// 3. UNIVERSITY FLASHCARDS (2/5/10 mark format)
// Uses safeParseJSON for robust parsing.
// ─────────────────────────────────────────────────────────────
const generateUniversityFlashcards = async (text) => {
    // Hard cap — compact notes should be well under this
    const safeText = text.slice(0, 3000);

    const systemPrompt = `You are a university exam flashcard generator. Return ONLY valid JSON. No markdown. No explanation. No text before or after the JSON.`;

    const userPrompt = `Generate exam-oriented flashcards from the text below.

Return ONLY this exact JSON structure:
{
  "twoMark": [
    { "question": "Define X?", "answer": "X is [2-3 line answer]." },
    { "question": "Define Y?", "answer": "Y is [2-3 line answer]." },
    { "question": "What is Z?", "answer": "Z is [2-3 line answer]." },
    { "question": "Explain W?", "answer": "W is [2-3 line answer]." }
  ],
  "fiveMark": [
    { "question": "Explain A in detail.", "answer": "Introduction: [2 lines].\\nKey Points:\\n• Point 1\\n• Point 2\\n• Point 3\\nConclusion: [1 line]." },
    { "question": "Describe B.", "answer": "Introduction: [2 lines].\\nKey Points:\\n• Point 1\\n• Point 2\\n• Point 3\\nConclusion: [1 line]." },
    { "question": "What is C and its uses?", "answer": "Introduction: [2 lines].\\nKey Points:\\n• Point 1\\n• Point 2\\n• Point 3\\nConclusion: [1 line]." }
  ],
  "tenMark": [
    { "question": "Discuss D in detail.", "answer": "Introduction: [3 lines].\\nExplanation:\\n• [point]\\n• [point]\\nApplications:\\n• [point]\\nConclusion: [2 lines]." },
    { "question": "Explain E with examples.", "answer": "Introduction: [3 lines].\\nExplanation:\\n• [point]\\n• [point]\\nApplications:\\n• [point]\\nConclusion: [2 lines]." }
  ]
}

CRITICAL:
- Return ONLY the JSON object above. No other text.
- Use \\n for line breaks inside answer strings.
- Escape all double quotes inside strings as \\".
- Do NOT include markdown or code fences.

Text:
${safeText}`;

    const response = await callGroq(systemPrompt, userPrompt, 2000, 0.3);

    try {
        return safeParseJSON(response, 'object');
    } catch (e) {
        console.error('JSON Parse Error in generateUniversityFlashcards:', e.message);
        console.error('Raw response (first 500 chars):', response.slice(0, 500));
        throw new Error('Failed to parse flashcards JSON. Please try again.');
    }
};

// ─────────────────────────────────────────────────────────────
// 4. SIMPLE FLASHCARDS (basic Q&A array)
// ─────────────────────────────────────────────────────────────
const generateFlashcards = async (text) => {
    const safeText = text.slice(0, 2500);

    const systemPrompt = `You are a flashcard generator. Return ONLY a valid JSON array. No markdown. No explanation. No text outside the JSON array.`;

    const userPrompt = `Generate exactly 10 flashcards from the text below.

Return ONLY this JSON array:
[
  { "question": "Question text?", "answer": "Answer text." }
]

CRITICAL:
- Return ONLY the JSON array. No other text.
- Escape any double quotes inside strings as \\".
- Do NOT use markdown or code fences.

Text:
${safeText}`;

    const response = await callGroq(systemPrompt, userPrompt, 1000, 0.3);

    try {
        return safeParseJSON(response, 'array');
    } catch (e) {
        console.error('JSON Parse Error in generateFlashcards:', e.message);
        throw new Error('Failed to parse flashcards JSON. Please try again.');
    }
};

// ─────────────────────────────────────────────────────────────
// 5. MULTIPLE CHOICE QUIZ
// ─────────────────────────────────────────────────────────────
const generateQuiz = async (content, numQuestions = 10) => {
    const safeContent = content.slice(0, 2500);

    const systemPrompt = `You are a strict technical examiner. Return ONLY a valid JSON array. No markdown. No explanation. No text outside the JSON.`;

    const userPrompt = `Generate exactly ${numQuestions} Multiple Choice Questions from the content below.

Return ONLY this JSON array:
[
  {
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOption": 0,
    "explanation": "Brief explanation of why the answer is correct."
  }
]

CRITICAL:
- correctOption must be an integer 0-3.
- Return ONLY the JSON array. No other text.
- Escape any double quotes inside strings as \\".
- Do NOT use markdown or code fences.

Source Content:
${safeContent}`;

    const response = await callGroq(systemPrompt, userPrompt, 2000, 0.3);

    try {
        return safeParseJSON(response, 'array');
    } catch (e) {
        console.error('JSON Parse Error in generateQuiz:', e.message);
        throw new Error('Failed to parse quiz JSON. Please try again.');
    }
};

// ─────────────────────────────────────────────────────────────
// 6. STRUCTURED EXAM ANSWER (5M / 8M / 16M)
// ─────────────────────────────────────────────────────────────
const generateStructuredAnswer = async (question, marks) => {
    const safeText = question.slice(0, 2500);
    const systemPrompt = `You are answering a university exam question worth ${marks} marks. Structure your answer with a brief introduction, clearly headed main body points, and a short conclusion. Be concise and exam-appropriate.`;
    return await callGroq(systemPrompt, safeText, 1000, 0.7);
};

// ─────────────────────────────────────────────────────────────
// 7. STUDY PLANNER / REVISION ROADMAP
// ─────────────────────────────────────────────────────────────
const generateRevisionRoadmap = async (pdfText, examDate, availableHours) => {
    const safeText = pdfText.slice(0, 2500);

    const systemPrompt = `You are an expert academic planner. Return ONLY a valid JSON object. No markdown. No explanation.`;

    const userPrompt = `Create a day-by-day study schedule leading up to the exam on ${examDate}. The student can study ${availableHours} hours per day.

Return ONLY this JSON object:
{
  "examDate": "${examDate}",
  "plan": [
    {
      "day": "Day 1 (YYYY-MM-DD)",
      "topics": ["Topic 1", "Topic 2"],
      "hours": ${availableHours},
      "status": "pending"
    }
  ]
}

Rules:
- Divide topics logically across available days.
- Include at least 1 revision day.
- Return ONLY the JSON object. No other text.
- Do NOT use markdown or code fences.

Source Content:
${safeText}`;

    const response = await callGroq(systemPrompt, userPrompt, 1500, 0.3);

    try {
        return safeParseJSON(response, 'object');
    } catch (e) {
        console.error('JSON Parse Error in generateRevisionRoadmap:', e.message);
        throw new Error('Failed to parse roadmap JSON. Please try again.');
    }
};

// ─────────────────────────────────────────────────────────────
// 8. QUESTION PAPER GENERATOR
// ─────────────────────────────────────────────────────────────
const generateQuestionPaper = async (content, marks, difficulty) => {
    let structureStr = '';
    if (parseInt(marks) === 50) {
        structureStr = `
- Section A: 5 questions × 2 marks each
- Section B: 2 questions × 8 marks each
- Section C: 1 question × 16 marks`;
    } else {
        structureStr = `
- Section A: 10 questions × 2 marks each
- Section B: 5 questions × 8 marks each
- Section C: 5 questions × 16 marks each`;
    }

    const systemPrompt = `You are a University Professor. Return ONLY a valid JSON object. No markdown. No explanation.`;

    const userPrompt = `Generate a formal university exam question paper worth ${marks} marks at ${difficulty} difficulty.

Structure: ${structureStr}

Return ONLY this JSON:
{
  "sections": [
    {
      "sectionName": "Section A",
      "marksPerQuestion": 2,
      "questions": [ { "question": "..." } ]
    },
    {
      "sectionName": "Section B",
      "marksPerQuestion": 8,
      "questions": [ { "question": "..." } ]
    },
    {
      "sectionName": "Section C",
      "marksPerQuestion": 16,
      "questions": [ { "question": "..." } ]
    }
  ]
}

Rules:
- ALL questions MUST be from the Source Content.
- NO Multiple Choice Questions.
- Return ONLY the JSON object. No other text.

Source Content:
${content.slice(0, 2500)}`;

    const response = await callGroq(systemPrompt, userPrompt, 2000, 0.3);

    try {
        return safeParseJSON(response, 'object');
    } catch (e) {
        console.error('JSON Parse Error in generateQuestionPaper:', e.message);
        throw new Error('Failed to parse question paper JSON. Please try again.');
    }
};

// ─────────────────────────────────────────────────────────────
// 9. STUDY CHAT (contextual tutor response)
// ─────────────────────────────────────────────────────────────
const studyChatResponse = async (context, query) => {
    const safeContext = context.slice(0, 2500);
    const systemPrompt = `You are a helpful tutor answering a student's question based strictly on their notes. Be concise and clear. Context: ${safeContext}`;
    return await callGroq(systemPrompt, query, 600, 0.7);
};

// ─────────────────────────────────────────────────────────────
// 10. GENERATE NOTES FROM RAW TEXT INPUT
// ─────────────────────────────────────────────────────────────
const generateNotesFromText = async (text) => {
    return await generateSummary(text, 800);
};

// ─────────────────────────────────────────────────────────────
// 11. GENERATE NOTES FROM YOUTUBE TRANSCRIPT
// ─────────────────────────────────────────────────────────────
const generateNotesFromYouTube = async (transcript) => {
    const safeTranscript = transcript.slice(0, 5000);

    const systemPrompt = `You are a university exam revision assistant creating concise notes from a YouTube video transcript.`;

    const userPrompt = `Generate CONCISE EXAM REVISION NOTES from this YouTube video transcript.

STRICT RULES:
- Maximum 400-500 words total.
- Use ONLY bullet points. No long paragraphs.
- Format:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 TOPIC OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• [2-3 bullet overview]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 KEY DEFINITIONS & CONCEPTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• [Term] – [concise definition]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ KEY EXAM POINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• [exam point]

Video Transcript:
${safeTranscript}`;

    return await callGroq(systemPrompt, userPrompt, 1000, 0.5);
};

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────
module.exports = {
    generateSummary,
    generateCompactRevisionNotes,
    generateFlashcards,
    generateQuiz,
    generateStructuredAnswer,
    generateRevisionRoadmap,
    studyChatResponse,
    generateQuestionPaper,
    generateUniversityFlashcards,
    generateNotesFromText,
    generateNotesFromYouTube,
    safeParseJSON,
};
