const mongoose = require('mongoose');

const flashcardItemSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true }
});

const flashcardSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note' }, // optional mapping to source note
    topic: { type: String, required: true },
    flashcards: {
        twoMark: [flashcardItemSchema],
        fiveMark: [flashcardItemSchema],
        tenMark: [flashcardItemSchema]
    }
}, { timestamps: true });

const Flashcard = mongoose.model('Flashcard', flashcardSchema);
module.exports = Flashcard;
