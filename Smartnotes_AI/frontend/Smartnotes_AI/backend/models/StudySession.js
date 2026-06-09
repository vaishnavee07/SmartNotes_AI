const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Link to a roadmap day task (optional — null for note-based sessions)
    taskId: { type: mongoose.Schema.Types.ObjectId, default: null },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Planner', default: null },
    // Link to a note (optional)
    noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', default: null },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0 },
    // For backwards compat with existing sessions routes
    durationInHours: { type: Number, default: 0 },
    status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED'], default: 'IN_PROGRESS' }
}, { timestamps: true });

const StudySession = mongoose.model('StudySession', studySessionSchema);
module.exports = StudySession;
