const mongoose = require('mongoose');

// Individual question (normal or one option of an internal choice)
const questionOptionSchema = new mongoose.Schema({
    option: { type: String }, // 'A' or 'B' for internal choices, undefined for normal
    question: { type: String, required: true },
    marks: { type: Number, required: true }
}, { _id: false });

// A question row — either a single question or an internal choice (pick one of A or B)
const questionRowSchema = new mongoose.Schema({
    questionNumber: { type: Number, required: true },
    type: { type: String, enum: ['single', 'choice'], default: 'single' },
    // For type='single'
    question: { type: String },
    marks: { type: Number },
    // For type='choice'
    choice: [questionOptionSchema]
}, { _id: false });

// A section (A, B, C)
const sectionSchema = new mongoose.Schema({
    section: { type: String, required: true },       // 'A', 'B', 'C'
    instruction: { type: String, default: '' },
    questions: [questionRowSchema]
}, { _id: false });

const questionPaperSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    totalMarks: { type: Number, required: true },
    evaluatedTotal: { type: Number, required: true },
    sections: [sectionSchema]
}, { timestamps: true });

const QuestionPaper = mongoose.model('QuestionPaper', questionPaperSchema);
module.exports = QuestionPaper;
