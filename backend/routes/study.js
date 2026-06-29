const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const Quiz = require('../models/Quiz');
const Flashcard = require('../models/Flashcard');
const { addXp, XP_RULES } = require('../services/gamificationService');
const { analyzeQuizPerformance, updateTopicPerformance } = require('../services/analyticsService');
const { callGroq } = require('../utils/aiService');
const { generateUniversityFlashcards, safeParseJSON } = require('../services/llmService');
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
        // Notes are now compact (≤600 words) — safe to use full text up to 3000 chars
        const safeText = text.slice(0, 3000);

        const numQ = numQuestions ? parseInt(numQuestions) : 10;

        const messages = [
            {
                role: 'system',
                content: `You are a strict technical examiner. Return ONLY a valid JSON array. No markdown. No explanation. No text outside the JSON.`
            },
            {
                role: 'user',
                content: `Generate exactly ${numQ} Multiple Choice Questions from the content below.

Return ONLY this JSON array:
[
  {
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOption": 0,
    "explanation": "Brief explanation of correct answer."
  }
]

CRITICAL: correctOption must be integer 0-3. Return ONLY the JSON array. No markdown or code fences.

Source Content:
${safeText}`
            }
        ];

        let generatedQuestions = [];
        try {
            const output = await callGroq(messages);
            generatedQuestions = safeParseJSON(output, 'array');
        } catch (err) {
            console.error("Quiz JSON Parse/Generation Error:", err.message);
            return res.status(500).json({ error: 'AI returned malformed JSON. Please try again.' });
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

        // Analyze performance specifically for this topic
        let topicPerformanceUpdate = null;
        try {
            if (quiz.totalQuestions > 0) {
                const percentage = (score / quiz.totalQuestions) * 100;
                topicPerformanceUpdate = await updateTopicPerformance(req.user.id, quiz.topic, percentage);
            }
        } catch (perfErr) {
            console.error('Failed to update topic performance:', perfErr);
        }

        res.json({
            score: score,
            total: quiz.totalQuestions,
            wrongAnswers: wrongAnswers,
            gamification,
            topicPerformance: topicPerformanceUpdate
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
                const parsed = safeParseJSON(output, 'object');

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

        // Use the university-style flashcard generator
        // Notes are now compact — 3000 char limit is ample
        const textForCards = text.slice(0, 3000);
        let generatedCards = null;
        try {
            generatedCards = await generateUniversityFlashcards(textForCards);
        } catch (err) {
            console.error("Flashcard Generation Error:", err.message);
            return res.status(500).json({ error: 'AI returned malformed JSON for flashcards. Please try again.' });
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

        const getEli5Prompt = (summaryText) => `
You are explaining the following academic content to a 5-year-old child.

STRICT INSTRUCTIONS:

- Use very simple words.
- Use short sentences.
- Use friendly tone.
- Use real-life examples if possible.
- Avoid technical jargon.
- Break complex ideas into tiny understandable pieces.
- Keep explanation short and clear.
- Do NOT format academically.
- Make it feel like you are talking to a child.

Content to explain:
${summaryText}
`;

        const messages = [
            {
                role: 'system',
                content: 'You are an enthusiastic elementary school teacher.'
            },
            {
                role: 'user',
                content: getEli5Prompt(safeText)
            }
        ];

        try {
            let combinedOutput = "";
            if (safeText.length > 4000) {
                const chunks = chunkText(safeText, 3000);
                for (const chunk of chunks) {
                    messages[1].content = getEli5Prompt(chunk);
                    const output = await callGroq(messages);
                    combinedOutput += output + "\n\n";
                }
            } else {
                messages[1].content = getEli5Prompt(safeText);
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

// @desc    Generate notes from text input
// @route   POST /api/study/generate-notes
// @access  Private
router.post('/generate-notes', protect, aiLimiter, async (req, res) => {
    try {
        const { text, title } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Please provide text content' });
        }

        const { generateNotesFromText } = require('../services/llmService');
        const { preprocessText, extractKeywords } = require('../services/nlpService');

        // Generate smart study notes
        const notes = await generateNotesFromText(text);
        
        // Process text for keywords
        const tokens = preprocessText(text);
        const keywords = extractKeywords(text);

        // Save to database if title provided
        if (title) {
            const note = await Note.create({
                userId: req.user.id,
                title: title || 'Text Input Note',
                sourceType: 'text',
                rawContent: text,
                processedContent: tokens.join(' '),
                keywords: keywords,
                summary: notes,
                content: notes
            });
            
            return res.status(201).json({ 
                success: true,
                notes: notes,
                noteId: note._id 
            });
        }

        res.json({ success: true, notes: notes });
    } catch (error) {
        console.error('Generate Notes Error:', error);
        res.status(500).json({ error: 'Failed to generate notes: ' + error.message });
    }
});

// @desc    Analyze YouTube video and generate notes
// @route   POST /api/study/analyze-youtube
// @access  Private
router.post('/analyze-youtube', protect, aiLimiter, async (req, res) => {
    try {
        const { url, title } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'Please provide a YouTube URL' });
        }

        // Step 1: Extract video ID — support all common YouTube URL formats
        const videoIdMatch = url.match(
            /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/))([A-Za-z0-9_-]{11})/
        );
        const videoId = videoIdMatch ? videoIdMatch[1] : null;

        if (!videoId) {
            return res.status(400).json({
                error: 'Could not extract video ID. Please use a standard YouTube URL (youtube.com/watch?v=..., youtu.be/..., or youtube.com/shorts/...)'
            });
        }

        const { YoutubeTranscript } = require('youtube-transcript');
        let analysisText = '';
        let contentSource = 'transcript';
        let transcriptAvailable = false;
        let videoTitle = title || '';
        let channelName = '';

        // Step 2: Always fetch oEmbed metadata first (reliable, no rate-limits)
        try {
            const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
            const oembedRes = await fetch(oembedUrl);
            if (oembedRes.ok) {
                const oembedData = await oembedRes.json();
                videoTitle = videoTitle || oembedData.title || '';
                channelName = oembedData.author_name || '';
                console.log('oEmbed metadata fetched. Title:', videoTitle);
            }
        } catch (oembedError) {
            console.warn('oEmbed fetch failed (non-fatal):', oembedError.message);
        }

        // Step 3: Try to fetch transcript (bonus — may be rate-limited by YouTube)
        try {
            const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
            const joined = transcriptData.map(item => item.text).join(' ').trim();
            if (joined && joined.length > 100) {
                analysisText = joined;
                contentSource = 'transcript';
                transcriptAvailable = true;
                console.log('Transcript fetched. Length:', analysisText.length);
            }
        } catch (transcriptError) {
            const errMsg = transcriptError.message || '';
            if (errMsg.includes('captcha') || errMsg.includes('too many')) {
                console.warn('Transcript rate-limited by YouTube — using metadata fallback.');
            } else if (errMsg.includes('disabled') || errMsg.includes('unavailable')) {
                console.warn('Transcript disabled for this video — using metadata fallback.');
            } else {
                console.warn('Transcript unavailable:', errMsg.slice(0, 100));
            }
        }

        // Step 4: Build analysis text from metadata if transcript not available
        if (!analysisText) {
            if (!videoTitle && !channelName) {
                return res.status(400).json({
                    error: 'Could not retrieve video information. Please verify the URL is correct and the video is publicly accessible.'
                });
            }
            analysisText = `Video Title: ${videoTitle}\nChannel: ${channelName}\nVideo ID: ${videoId}`;
            contentSource = 'metadata';
        }

        const { generateNotesFromYouTube } = require('../services/llmService');
        const { preprocessText, extractKeywords } = require('../services/nlpService');

        // Step 5: Generate study notes
        const notes = await generateNotesFromYouTube(analysisText);
        const tokens = preprocessText(analysisText);
        const keywords = extractKeywords(analysisText);

        // Step 6: Save to database
        const note = await Note.create({
            userId: req.user.id,
            title: videoTitle || title || `YouTube: ${videoId}`,
            sourceType: 'youtube',
            originalFileUrl: url,
            rawContent: analysisText,
            processedContent: tokens.join(' '),
            keywords: keywords,
            summary: notes,
            content: notes
        });

        res.status(201).json({
            success: true,
            notes: notes,
            noteId: note._id,
            videoId: videoId,
            videoTitle: videoTitle,
            channelName: channelName,
            contentSource: contentSource,
            transcriptAvailable: transcriptAvailable,
            message: transcriptAvailable
                ? 'Notes generated from full video transcript.'
                : 'Notes generated from video metadata. Transcript was unavailable for this video.'
        });
    } catch (error) {
        console.error('YouTube Analysis Error:', error);
        res.status(500).json({ error: 'Failed to analyze YouTube video: ' + error.message });
    }
});


module.exports = router;
