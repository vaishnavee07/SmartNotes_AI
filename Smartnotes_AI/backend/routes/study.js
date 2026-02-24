const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const Quiz = require('../models/Quiz');
const Flashcard = require('../models/Flashcard');
const { addXp, XP_RULES } = require('../services/gamificationService');
const { analyzeQuizPerformance } = require('../services/analyticsService');
const { callGroq } = require('../utils/aiService');
const Note = require('../models/Note');
const QuestionPaper = require('../models/QuestionPaper');

const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: { error: 'Too many requests from this IP, please try again after a minute' },
    standardHeaders: true,
    legacyHeaders: false,
});

function chunkText(text, size = 3000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.slice(i, i + size));
    }
    return chunks;
}

// @desc    Generate a quiz from a saved Note
// @route   POST /api/study/quiz/generate
// @access  Private
router.post('/quiz/generate', protect, aiLimiter, async (req, res) => {
    try {
        const { topic, numQuestions, noteId } = req.body;

        if (!topic || !noteId) {
            return res.status(400).json({ error: 'Please provide topic and select a note' });
        }

        const note = await Note.findOne({ _id: noteId, userId: req.user.id });
        if (!note) {
            return res.status(404).json({ error: 'Selected note not found' });
        }

        const text = note.summary;

        if (!text) {
            return res.status(400).json({ error: 'Note summary is missing. Please generate summary first.' });
        }

        if (note.quiz) {
            try {
                const cached = JSON.parse(note.quiz);
                if (cached.quiz && cached.quiz.totalQuestions === parseInt(numQuestions || 10)) {
                    return res.status(200).json(cached);
                }
            } catch (e) {
                // Ignore parse errors
            }
        }

        console.log("Original summary length:", text.length);
        const safeText = text.slice(0, 2500);

        const messages = [
            {
                role: 'system',
                content: `You are a strict technical examiner. Generate exactly ${numQuestions ? parseInt(numQuestions) : 10} Multiple Choice Questions based strictly on the Source Content below.

CRITICAL INSTRUCTIONS:
1. Each question must have EXACTLY 4 options.
2. Each question must include an 'explanation' string explaining why the correct answer is correct.
3. Return ONLY a valid JSON array of objects. NO markdown formatting. NO intro. NO \`\`\`json wrappers.

Strict JSON Output format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOption": 1, 
    "explanation": "Explanation for the correct answer..."
  }
]
Note: 'correctOption' must be an integer index between 0 and 3.`
            },
            {
                role: 'user',
                content: `Source Content:\n${safeText}`
            }
        ];

        let generatedQuestions = [];
        try {
            if (safeText.length > 4000) {
                const chunks = chunkText(safeText, 3000);
                for (const chunk of chunks) {
                    messages[1].content = `Source Content:\n${chunk}`;
                    const output = await callGroq(messages);

                    const raw = output.trim();
                    const jsonStart = raw.indexOf("[");
                    const jsonEnd = raw.lastIndexOf("]");

                    if (jsonStart === -1 || jsonEnd === -1) {
                        throw new Error("Invalid JSON returned from LLM");
                    }

                    const jsonString = raw.slice(jsonStart, jsonEnd + 1);
                    const parsed = JSON.parse(jsonString);
                    generatedQuestions = generatedQuestions.concat(parsed);
                }
            } else {
                messages[1].content = `Source Content:\n${safeText}`;
                const output = await callGroq(messages);

                const raw = output.trim();
                const jsonStart = raw.indexOf("[");
                const jsonEnd = raw.lastIndexOf("]");

                if (jsonStart === -1 || jsonEnd === -1) {
                    throw new Error("Invalid JSON returned from LLM");
                }

                const jsonString = raw.slice(jsonStart, jsonEnd + 1);
                generatedQuestions = JSON.parse(jsonString);
            }
        } catch (err) {
            console.error("JSON Parse/Generation Error:", err);
            return res.status(500).json({ error: 'LLM Error: ' + err.message });
        }

        if (!Array.isArray(generatedQuestions)) {
            return res.status(500).json({ error: "Quiz questions is not an array" });
        }

        // Map to schema
        const quizData = {
            userId: req.user.id,
            topic: topic,
            questions: generatedQuestions.map(q => ({
                question: q.question,
                options: q.options,
                correctOption: q.correctOption,
                explanation: q.explanation || "Correct answer explanation not provided by AI."
            })),
            totalQuestions: generatedQuestions.length,
        };

        const quiz = await Quiz.create(quizData);

        // Add XP for generation
        const gamification = await addXp(req.user.id, 'QUIZ_GENERATE');

        const resultResponse = { quiz, gamification };
        note.quiz = JSON.stringify(resultResponse);
        await note.save();

        res.status(201).json(resultResponse);
    } catch (error) {
        console.error('Quiz Generation Error:', error);
        res.status(500).json({ error: 'System Error: ' + (error.message || error.toString()) });
    }
});

// @desc    Submit quiz answers
// @route   POST /api/study/quiz/:id/submit
// @access  Private
router.post('/quiz/:id/submit', protect, async (req, res) => {
    try {
        const { answers } = req.body; // array of { questionId, selectedOption }
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

        let score = 0;
        const wrongAnswers = [];

        quiz.questions.forEach((q, index) => {
            const submitted = answers.find(a => a.questionId === q._id.toString());
            if (submitted) {
                q.selectedOption = submitted.selectedOption;
                q.isCorrect = (submitted.selectedOption === q.correctOption);

                if (q.isCorrect) {
                    score += 1;
                } else {
                    wrongAnswers.push({
                        question: q.question,
                        yourAnswer: q.options[submitted.selectedOption] || "No Answer",
                        correctAnswer: q.options[q.correctOption],
                        explanation: q.explanation || "No explanation provided"
                    });
                }
            } else {
                // If question wasn't answered
                wrongAnswers.push({
                    question: q.question,
                    yourAnswer: "Not Answered",
                    correctAnswer: q.options[q.correctOption],
                    explanation: q.explanation || "No explanation provided"
                });
            }
        });

        quiz.score = score;
        await quiz.save(); // pre-save calculates accuracy

        // Add XP
        const gamification = await addXp(req.user.id, 'QUIZ_COMPLETE');

        // Analyze performance async
        setTimeout(() => {
            analyzeQuizPerformance(req.user.id).catch(console.error);
        }, 0);

        res.json({
            score: score,
            total: quiz.totalQuestions,
            wrongAnswers: wrongAnswers,
            gamification
        });
    } catch (error) {
        console.error('Quiz Submit Error:', error);
        res.status(500).json({ error: error.message || 'Failed to submit quiz' });
    }
});

// ============================================================
// MARK VALIDATION HELPER
// For internal-choice questions, count only ONE option's marks
// ============================================================
function evaluatePaperTotal(sections) {
    let total = 0;
    for (const section of sections) {
        for (const q of section.questions) {
            if (q.type === 'choice' && Array.isArray(q.choice) && q.choice.length > 0) {
                // Count only the first option (A) marks — both must be equal
                total += q.choice[0].marks || 0;
            } else {
                total += q.marks || 0;
            }
        }
    }
    return total;
}

// ============================================================
// UNIVERSITY PAPER STRUCTURES
// ============================================================
const PAPER_STRUCTURES = {
    20: {
        description: '20 marks: Section A (5×2=10), Section B (1 internal choice × 10=10)',
        sections: [
            {
                section: 'A',
                instruction: 'Answer ALL questions. Each question carries 2 marks.',
                type: 'single',
                count: 5,
                marksEach: 2
            },
            {
                section: 'B',
                instruction: 'Answer ANY ONE. The question carries 10 marks.',
                type: 'choice',
                count: 1,
                marksEach: 10
            }
        ],
        total: 20
    },
    50: {
        description: '50 marks: Section A (5×2=10), Section B (3 internal choice × 8=24), Section C (1 internal choice × 16=16)',
        sections: [
            {
                section: 'A',
                instruction: 'Answer ALL questions. Each question carries 2 marks.',
                type: 'single',
                count: 5,
                marksEach: 2
            },
            {
                section: 'B',
                instruction: 'Answer ANY ONE from each question. Each carries 8 marks.',
                type: 'choice',
                count: 3,
                marksEach: 8
            },
            {
                section: 'C',
                instruction: 'Answer ANY ONE. The question carries 16 marks.',
                type: 'choice',
                count: 1,
                marksEach: 16
            }
        ],
        total: 50
    },
    100: {
        description: '100 marks: Section A (10×2=20), Section B (5 internal choice × 8=40), Section C (2 internal choice × 20=40)',
        sections: [
            {
                section: 'A',
                instruction: 'Answer ALL questions. Each question carries 2 marks.',
                type: 'single',
                count: 10,
                marksEach: 2
            },
            {
                section: 'B',
                instruction: 'Answer ANY ONE from each question. Each carries 8 marks.',
                type: 'choice',
                count: 5,
                marksEach: 8
            },
            {
                section: 'C',
                instruction: 'Answer ANY ONE. Each question carries 20 marks.',
                type: 'choice',
                count: 2,
                marksEach: 20
            }
        ],
        total: 100
    }
};

// @desc    Generate a question paper from a saved Note
// @route   POST /api/study/question-paper/generate
// @access  Private
router.post('/question-paper/generate', protect, aiLimiter, async (req, res) => {
    try {
        const { topic, marks, difficulty: rawDifficulty, noteId } = req.body;
        const difficulty = (rawDifficulty || 'medium').toLowerCase();

        if (!topic || !marks || !difficulty || !noteId) {
            return res.status(400).json({ error: 'Please provide topic, marks, difficulty, and select a note' });
        }

        const note = await Note.findOne({ _id: noteId, userId: req.user.id });
        if (!note) return res.status(404).json({ error: 'Selected note not found' });

        const text = note.summary || note.content || note.rawText;
        if (!text) return res.status(400).json({ error: 'Note content is missing. Please generate a summary first.' });

        const m = parseInt(marks);
        const structure = PAPER_STRUCTURES[m] || PAPER_STRUCTURES[50];
        const safeText = text.slice(0, 3000);

        // -------------------------------------------------------
        // Build the question slot requirements so the LLM knows
        // exactly how many questions and what type for each section
        // -------------------------------------------------------
        const slotDescription = structure.sections.map(s => {
            if (s.type === 'single') {
                return `- Section ${s.section}: ${s.count} short-answer questions (${s.marksEach} marks each). Provide as array "section${s.section}": ["q1","q2",...]`;
            } else {
                return `- Section ${s.section}: ${s.count} essay/long question(s) with internal choice (${s.marksEach} marks each, student answers ONE of A or B). Provide as array "section${s.section}": [["qA1","qB1"],["qA2","qB2"],...]`;
            }
        }).join('\n');

        // -------------------------------------------------------
        // PROMPT: Ask ONLY for question text — marks are assigned by us
        // -------------------------------------------------------
        const systemPrompt = `You are a University Professor. Generate exam questions for the topic: "${topic}" at ${difficulty} difficulty.
Derive ALL questions strictly from the Source Content.
Do NOT write MCQs. Use descriptive, analytical, application-level questions only.

Return a single JSON object with EXACTLY these fields — ONLY question text, no marks:
${slotDescription}

Return ONLY the JSON object. No markdown. No explanation. No extra keys.
Example for a 20-mark paper:
{"sectionA":["What is X?","Explain Y.","Describe Z.","Define W.","List V."],"sectionB":[["Discuss A in detail.","Write a note on B."]]}`;

        let parsedContent = null;
        let attempts = 0;
        const MAX_ATTEMPTS = 3;

        while (attempts < MAX_ATTEMPTS) {
            attempts++;
            try {
                const messages = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Source Content:\n${safeText}` }
                ];

                const output = await callGroq(messages);
                const raw = output.trim();

                // Aggressively strip any markdown wrapping
                const cleaned = raw
                    .replace(/^```+(?:json)?\s*/i, '')
                    .replace(/\s*```+$/i, '')
                    .trim();

                const jsonStart = cleaned.indexOf('{');
                const jsonEnd = cleaned.lastIndexOf('}');
                if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found in LLM response');

                const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));

                // Validate each section has the right count
                let valid = true;
                for (const s of structure.sections) {
                    const key = `section${s.section}`;
                    if (!Array.isArray(parsed[key]) || parsed[key].length === 0) {
                        throw new Error(`Missing or empty section${s.section} in LLM response`);
                    }
                    // For choice sections, each item must be a 2-element array
                    if (s.type === 'choice') {
                        for (const item of parsed[key]) {
                            if (!Array.isArray(item) || item.length < 2) {
                                throw new Error(`Section ${s.section} choice item must be array of 2 questions`);
                            }
                        }
                    }
                }

                if (valid) {
                    parsedContent = parsed;
                    break;
                }
            } catch (err) {
                console.error(`[Paper] Attempt ${attempts} failed:`, err.message);
                if (attempts >= MAX_ATTEMPTS) {
                    return res.status(500).json({ error: `LLM Error after ${MAX_ATTEMPTS} attempts: ${err.message}` });
                }
            }
        }

        if (!parsedContent) {
            return res.status(500).json({ error: 'Failed to generate questions after retries.' });
        }

        // -------------------------------------------------------
        // BUILD PAPER STRUCTURE FROM PRE-DEFINED MARKS (guaranteed total)
        // -------------------------------------------------------
        const builtSections = [];
        let questionNumber = 1;

        for (const s of structure.sections) {
            const key = `section${s.section}`;
            const rawQuestions = parsedContent[key] || [];
            const questions = [];

            for (let i = 0; i < s.count; i++) {
                if (s.type === 'single') {
                    const q = rawQuestions[i] || `Explain an important concept from ${topic}.`;
                    questions.push({
                        questionNumber,
                        type: 'single',
                        question: typeof q === 'string' ? q : String(q),
                        marks: s.marksEach
                    });
                } else {
                    // Internal choice
                    const pair = rawQuestions[i];
                    const qA = Array.isArray(pair) ? (pair[0] || `Discuss ${topic} in detail.`) : `Discuss ${topic} in detail.`;
                    const qB = Array.isArray(pair) ? (pair[1] || `Write a detailed note on ${topic}.`) : `Write a detailed note on ${topic}.`;
                    questions.push({
                        questionNumber,
                        type: 'choice',
                        choice: [
                            { option: 'A', question: String(qA), marks: s.marksEach },
                            { option: 'B', question: String(qB), marks: s.marksEach }
                        ]
                    });
                }
                questionNumber++;
            }

            builtSections.push({
                section: s.section,
                instruction: s.instruction,
                questions
            });
        }

        // Verify total — must always be exact now
        const evaluatedTotal = evaluatePaperTotal(builtSections);
        console.log(`[Paper] Built paper: evaluatedTotal=${evaluatedTotal} (target=${m})`);

        // Persist to DB
        const questionPaper = await QuestionPaper.create({
            userId: req.user.id,
            subject: topic,
            totalMarks: m,
            difficulty,
            sections: builtSections,
            evaluatedTotal
        });

        const gamification = await addXp(req.user.id, 'PAPER_GENERATE');

        const resultResponse = { questionPaper, gamification };

        // Cache on note (force invalidate cache on new generation)
        note.questionPaper = JSON.stringify(resultResponse);
        await note.save();

        res.status(201).json(resultResponse);
    } catch (error) {
        console.error('Paper Generation Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate question paper' });
    }
});



// @desc    Get all question papers for user
// @route   GET /api/study/question-papers
// @access  Private
router.get('/question-papers', protect, async (req, res) => {
    try {
        const papers = await QuestionPaper.find({ userId: req.user.id }).sort('-createdAt');
        res.json(papers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @desc    Generate flashcards from a saved Note
// @route   POST /api/study/flashcard/generate
// @access  Private
router.post('/flashcard/generate', protect, aiLimiter, async (req, res) => {
    try {
        const { topic, noteId } = req.body;

        if (!topic || !noteId) {
            return res.status(400).json({ error: 'Please provide topic and select a note' });
        }

        const note = await Note.findOne({ _id: noteId, userId: req.user.id });
        if (!note) {
            return res.status(404).json({ error: 'Selected note not found' });
        }

        const text = note.summary;

        if (!text) {
            return res.status(400).json({ error: 'Note summary is missing. Please generate summary first.' });
        }

        if (note.flashcards) {
            try {
                const cached = JSON.parse(note.flashcards);
                // Only return cache if it matches the new Exam Revision format
                if (cached.flashcards && cached.flashcards.flashcards && cached.flashcards.flashcards.twoMark) {
                    return res.status(200).json(cached);
                }
            } catch (e) {
                // Ignore parse errors and generate fresh
            }
        }

        console.log("Original summary length:", text.length);
        const safeText = text.slice(0, 4000);

        const messages = [
            {
                role: 'system',
                content: `Generate exam-oriented revision flashcards from the text.

Rules:
- Include only important and high-weight topics.
- Return:
   4 × 2-mark questions (short definition style answers)
   3 × 5-mark questions (medium explanation answers)
   2 × 10-mark questions (detailed explanation answers)
- Answers must match expected university writing style.
- No MCQs.
- No filler content.

Return STRICT JSON:

{
  "twoMark": [
    { "question": "...", "answer": "..." }
  ],
  "fiveMark": [
    { "question": "...", "answer": "..." }
  ],
  "tenMark": [
    { "question": "...", "answer": "..." }
  ]
}

Return only valid JSON.`
            },
            {
                role: 'user',
                content: `Text:\n${safeText}`
            }
        ];

        let generatedCards = null;
        try {
            messages[1].content = `Text:\n${safeText}`;
            const output = await callGroq(messages);

            const raw = output.trim();
            const jsonStart = raw.indexOf("{");
            const jsonEnd = raw.lastIndexOf("}");

            if (jsonStart === -1 || jsonEnd === -1) {
                throw new Error("Invalid JSON returned from LLM");
            }

            const jsonString = raw.slice(jsonStart, jsonEnd + 1);
            generatedCards = JSON.parse(jsonString);
        } catch (err) {
            console.error("JSON Parse/Generation Error:", err);
            return res.status(500).json({ error: 'LLM Error: ' + err.message });
        }

        if (!generatedCards || !generatedCards.twoMark) {
            return res.status(500).json({ error: "Flashcards format is invalid" });
        }

        const deckData = {
            userId: req.user.id,
            topic: topic,
            noteId: note._id,
            flashcards: generatedCards
        };

        const flashcardDeck = await Flashcard.create(deckData);

        const resultResponse = { flashcards: flashcardDeck };
        note.flashcards = JSON.stringify(resultResponse);
        await note.save();

        res.status(201).json(resultResponse);
    } catch (error) {
        console.error('Flashcard Generation Error:', error);
        res.status(500).json({ error: 'System Error: ' + (error.message || error.toString()) });
    }
});

// @desc    Explain a note like I'm 5
// @route   GET /api/study/explain/:id
// @access  Private
router.get('/explain/:id', protect, aiLimiter, async (req, res) => {
    try {
        const note = await Note.findOne({ _id: req.params.id, userId: req.user.id });
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const text = note.summary;
        if (!text) {
            return res.status(400).json({ error: 'Note summary is missing. Please generate summary first.' });
        }

        if (note.eli5) {
            return res.status(200).json({ result: note.eli5 });
        }

        console.log("Original summary length:", text.length);
        const safeText = text.slice(0, 2500);

        const messages = [
            {
                role: 'system',
                content: 'You are an enthusiastic elementary school teacher. Explain the following text so that a 5-year-old child can easily understand it. Use simple words, fun analogies, and a friendly tone. Limit to 3 short paragraphs.'
            },
            {
                role: 'user',
                content: `Text to explain:\n${safeText}`
            }
        ];

        try {
            let combinedOutput = "";
            if (safeText.length > 4000) {
                const chunks = chunkText(safeText, 3000);
                for (const chunk of chunks) {
                    messages[1].content = `Text to explain:\n${chunk}`;
                    const output = await callGroq(messages);
                    combinedOutput += output + "\n\n";
                }
            } else {
                messages[1].content = `Text to explain:\n${safeText}`;
                combinedOutput = await callGroq(messages);
            }

            note.eli5 = combinedOutput.trim();
            await note.save();

            res.json({ result: note.eli5 });
        } catch (err) {
            res.status(500).json({ error: 'LLM generation failed', details: err.message });
        }
    } catch (error) {
        console.error('Explain Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate explanation' });
    }
});

module.exports = router;
