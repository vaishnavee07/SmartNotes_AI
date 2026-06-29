const mongoose = require('mongoose');

const activitySessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    page: {
        type: String,
        enum: ['study', 'flashcards', 'quizzes', 'planner', 'question-paper', 'other'],
        required: true
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true } // date only (midnight), for fast day queries
}, { timestamps: true });

// Index for fast daily lookups
activitySessionSchema.index({ userId: 1, date: 1 });

const ActivitySession = mongoose.model('ActivitySession', activitySessionSchema);
module.exports = ActivitySession;
