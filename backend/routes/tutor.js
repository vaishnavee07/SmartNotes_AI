const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const { askTutor, extractTopicFromQuestion } = require('../services/llmService');
const Note = require('../models/Note');
const Doubt = require('../models/Doubt');
const TopicPerformance = require('../models/TopicPerformance');

const tutorLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    message: { error: 'Too many requests. Please wait a moment.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ─── POST /api/tutor/ask ──────────────────────────────────────
// @desc    Answer a student question as an AI tutor
// @access  Private
router.post('/ask', protect, tutorLimiter, async (req, res) => {
    try {
        const { question, noteId, topic: providedTopic } = req.body;

        if (!question || question.trim().length < 3) {
            return res.status(400).json({ error: 'Please provide a valid question.' });
        }

        // Step 1: Gather note context if noteId provided
        let noteContext = '';
        if (noteId) {
            try {
                const note = await Note.findOne({ _id: noteId, userId: req.user.id });
                if (note && note.summary) {
                    noteContext = note.summary.slice(0, 1500); // limit context
                }
            } catch { /* ignore */ }
        }

        // Step 2: Detect topic
        const topic = providedTopic || await extractTopicFromQuestion(question);

        // Step 3 & 4: Call Groq via llmService
        const rawResponse = await askTutor(question, topic, noteContext);

        // Step 5: Parse structured response
        let parsed;
        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawResponse);
        } catch {
            // If JSON parse fails, build a fallback response
            parsed = {
                simpleExplanation: rawResponse?.slice(0, 300) || 'I encountered an issue formatting my response. Please try again.',
                detailedExplanation: '',
                keyConcepts: [],
                commonMistakes: [],
                relatedTopics: [topic],
                suggestedAction: `Review your notes on ${topic} and try generating a quiz.`
            };
        }

        // Step 6: Save doubt to DB
        let doubtId = null;
        try {
            const doubt = await Doubt.create({
                userId: req.user.id,
                question: question.trim(),
                topic,
                noteContext: noteContext ? noteContext.slice(0, 500) : undefined,
                response: {
                    simpleExplanation:   parsed.simpleExplanation || '',
                    detailedExplanation: parsed.detailedExplanation || '',
                    keyConcepts:         Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
                    commonMistakes:      Array.isArray(parsed.commonMistakes) ? parsed.commonMistakes : [],
                    relatedTopics:       Array.isArray(parsed.relatedTopics) ? parsed.relatedTopics : [],
                    suggestedAction:     parsed.suggestedAction || '',
                }
            });
            doubtId = doubt._id;
        } catch (dbErr) {
            console.error('Failed to save doubt:', dbErr.message);
        }

        // Step 7: Increment doubtCount in TopicPerformance
        try {
            await TopicPerformance.findOneAndUpdate(
                { userId: req.user.id, topic },
                { $inc: { doubtCount: 1 } },
                { upsert: true, new: true }
            );
        } catch (perfErr) {
            console.error('Failed to update doubtCount:', perfErr.message);
        }

        // Step 8: Return structured response
        res.json({
            topic,
            doubtId,
            simpleExplanation:   parsed.simpleExplanation || '',
            detailedExplanation: parsed.detailedExplanation || '',
            keyConcepts:         Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts.slice(0, 5) : [],
            commonMistakes:      Array.isArray(parsed.commonMistakes) ? parsed.commonMistakes.slice(0, 3) : [],
            relatedTopics:       Array.isArray(parsed.relatedTopics) ? parsed.relatedTopics.slice(0, 4) : [],
            suggestedAction:     parsed.suggestedAction || `Review your ${topic} notes and take a quiz.`,
            hadNoteContext:      !!noteContext,
        });

    } catch (error) {
        console.error('AI Tutor Error:', error);
        res.status(500).json({ error: 'AI Tutor encountered an issue: ' + error.message });
    }
});

// ─── GET /api/tutor/history ───────────────────────────────────
// @desc    Get user's doubt history
// @access  Private
router.get('/history', protect, async (req, res) => {
    try {
        const doubts = await Doubt.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .select('question topic createdAt response.simpleExplanation');
        res.json(doubts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
