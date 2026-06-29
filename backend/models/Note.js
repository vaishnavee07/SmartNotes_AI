const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    sourceType: { type: String, enum: ['image', 'pdf', 'text', 'youtube'], required: true },
    originalFileUrl: { type: String }, // optional, path or URL if image/pdf
    rawContent: { type: String, required: true },
    processedContent: { type: String },
    keywords: [{ type: String }],
    summary: { type: String },
    content: { type: String },
    flashcards: { type: String },
    quiz: { type: String },
    questionPaper: { type: String },
    eli5: { type: String }
}, { timestamps: true });

const Note = mongoose.model('Note', noteSchema);
module.exports = Note;
