const mongoose = require('mongoose');

const planDaySchema = new mongoose.Schema({
    day: { type: String, required: true },
    topics: [{ type: String }],
    hours: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
});

const plannerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, default: '' },
    examDate: { type: Date, required: true },
    plan: [planDaySchema]
}, { timestamps: true });

const Planner = mongoose.model('Planner', plannerSchema);
module.exports = Planner;
