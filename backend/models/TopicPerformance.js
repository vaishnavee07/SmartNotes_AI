const mongoose = require('mongoose');

const topicPerformanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topic: { type: String, required: true },
    averageScore: { type: Number, default: 0 },
    totalQuizzes: { type: Number, default: 0 },
    strength: { type: String, enum: ['Weak', 'Medium', 'Strong'], default: 'Medium' },
    priorityScore: { type: Number, default: 0 }, // Increases if consecutively weak
    doubtCount: { type: Number, default: 0 },    // For AI Doubt Solver phase
    revisionAttempts: { type: Number, default: 0 },
    lastQuizDate: { type: Date, default: Date.now },
    lastImprovedAt: { type: Date },
    readinessContribution: { type: Number, default: 0 } // Strong adds +, Weak adds -
}, { timestamps: true });

// Compound index to ensure one record per user per topic
topicPerformanceSchema.index({ userId: 1, topic: 1 }, { unique: true });

module.exports = mongoose.model('TopicPerformance', topicPerformanceSchema);
