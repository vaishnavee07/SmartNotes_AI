const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctOption: { type: Number, required: true }, // Index of the correct option
    explanation: { type: String, required: true },
    selectedOption: { type: Number }, // Index of the selected option
    isCorrect: { type: Boolean },
});

const quizSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note' }, // optional
    topic: { type: String, required: true },
    questions: [quizQuestionSchema],
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, required: true },
    accuracy: { type: Number, default: 0 }, // percentage
}, { timestamps: true });

// Pre-save calculate accuracy
quizSchema.pre('save', function () {
    if (this.totalQuestions > 0) {
        this.accuracy = (this.score / this.totalQuestions) * 100;
    }
});

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;
