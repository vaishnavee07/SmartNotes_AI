const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true },
    topic:    { type: String, default: 'General' },
    response: {
        simpleExplanation:    String,
        detailedExplanation:  String,
        keyConcepts:          [String],
        commonMistakes:       [String],
        relatedTopics:        [String],
        suggestedAction:      String,
    },
    noteContext: { type: String },   // snippet of note used as context
    createdAt:   { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Doubt', doubtSchema);
