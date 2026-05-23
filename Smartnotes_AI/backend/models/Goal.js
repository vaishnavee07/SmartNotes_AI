const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 300 },
    completed: { type: Boolean, default: false },
    xpAwarded: { type: Boolean, default: false }
}, { timestamps: true });

const Goal = mongoose.model('Goal', goalSchema);
module.exports = Goal;
