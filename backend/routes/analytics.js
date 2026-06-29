const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const TopicPerformance = require('../models/TopicPerformance');
const { getSmartRecommendation, getNextBestAction } = require('../services/recommendationService');
const { computeReadiness } = require('../services/readinessService');

// ============================================================
// GET /api/analytics/topics
// Get all tracked topics sorted by priorityScore desc
// ============================================================
router.get('/topics', protect, async (req, res) => {
    try {
        const topics = await TopicPerformance.find({ userId: req.user.id })
            .sort({ priorityScore: -1, averageScore: 1 });

        // Map recommendations onto the response
        const mapped = topics.map(t => {
            const data = t.toObject();
            data.recommendation = getSmartRecommendation(data);
            return data;
        });

        res.json(mapped);
    } catch (error) {
        console.error('[Analytics Topics Error]', error);
        res.status(500).json({ error: 'Failed to fetch topic performance' });
    }
});

// ============================================================
// GET /api/analytics/next-best-action
// Get the single most valuable next action for the student
// ============================================================
router.get('/next-best-action', protect, async (req, res) => {
    try {
        const action = await getNextBestAction(req.user.id);
        res.json(action);
    } catch (error) {
        console.error('[Analytics NBA Error]', error);
        res.status(500).json({ error: 'Failed to fetch next best action' });
    }
});

// ============================================================
// GET /api/analytics/progress
// Get overall dashboard progress metrics
// ============================================================
router.get('/progress', protect, async (req, res) => {
    try {
        const topics = await TopicPerformance.find({ userId: req.user.id });
        
        if (topics.length === 0) {
            return res.json({ 
                topicsCompleted: 0,
                quizAverage: 0,
                revisionCompletion: 0,
                readinessScore: 0,
                readinessLabel: 'Not enough data' 
            });
        }

        let sumAverage = 0;
        let sumRevision = 0;
        let sumReadinessDelta = 0;

        topics.forEach(t => {
            sumAverage += t.averageScore;
            // Simple mock for revision %: 100% if revised, else 0
            sumRevision += (t.revisionAttempts > 0 ? 100 : 0);
            sumReadinessDelta += t.readinessContribution || 0;
        });

        const topicsCompleted = topics.length;
        const quizAverage = Math.round(sumAverage / topics.length);
        const revisionCompletion = Math.round(sumRevision / topics.length);
        
        // Base readiness on quiz average + delta from strengths
        let readinessScore = Math.min(100, Math.max(0, quizAverage + sumReadinessDelta));

        res.json({ 
            topicsCompleted,
            quizAverage,
            revisionCompletion,
            readinessScore,
            readinessLabel: readinessScore >= 80 ? 'Ready' : readinessScore >= 60 ? 'Needs Practice' : 'Not Ready' 
        });
    } catch (error) {
        console.error('[Analytics Progress Error]', error);
        res.status(500).json({ error: 'Failed to fetch progress metrics' });
    }
});

// ============================================================
// GET /api/analytics/readiness
// Phase 4 — Exam Readiness Score Engine
// Returns a full readiness profile with score, insights, NBA,
// topic breakdown, and hackathon demo summary.
// ============================================================
router.get('/readiness', protect, async (req, res) => {
    try {
        const readiness = await computeReadiness(req.user.id);
        res.json(readiness);
    } catch (error) {
        console.error('[Analytics Readiness Error]', error);
        res.status(500).json({ error: 'Failed to compute readiness score' });
    }
});

module.exports = router;
