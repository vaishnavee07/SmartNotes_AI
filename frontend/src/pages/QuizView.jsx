import React, { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { Target, CheckCircle2, AlertCircle, ArrowRight, Trophy, RotateCcw, Plus, Loader2, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import useActivityTracker from '../hooks/useActivityTracker';
import axios from '../api/axios';

const QuizView = () => {
    useActivityTracker('quizzes');
    // Generate State
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [topic, setTopic] = useState('');
    const [numQuestions, setNumQuestions] = useState(10);
    const [notes, setNotes] = useState([]);
    const [selectedNoteId, setSelectedNoteId] = useState('');

    // Play State
    const [currentQ, setCurrentQ] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [wrongAnswersList, setWrongAnswersList] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchNotes = async () => {
            try {
                const res = await axios.get('/notes');
                setNotes(res.data);
            } catch (err) {
                console.error('Failed to fetch notes for dropdown:', err);
            }
        };
        fetchNotes();
    }, []);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!selectedNoteId) return alert("Please select a valid Note.");
        setGenerating(true);
        try {
            const res = await axios.post('/study/quiz/generate', {
                topic,
                numQuestions,
                noteId: selectedNoteId
            });
            setActiveQuiz(res.data.quiz);
            // reset play state
            setCurrentQ(0);
            setSelectedAnswers({});
            setIsSubmitted(false);
            setScore(0);
            setWrongAnswersList([]);
        } catch (error) {
            console.error('Error generating quiz:', error);
            alert(error.response?.data?.error || 'Failed to generate quiz.');
        } finally {
            setGenerating(false);
        }
    };

    const handleSelect = (optionIndex) => {
        if (isSubmitted) return;
        setSelectedAnswers({ ...selectedAnswers, [currentQ]: optionIndex });
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // Format answers array for backend
            const answersArray = Object.keys(selectedAnswers).map(qIndex => ({
                questionId: activeQuiz.questions[qIndex]._id,
                selectedOption: selectedAnswers[qIndex]
            }));

            const res = await axios.post(`/study/quiz/${activeQuiz._id}/submit`, {
                answers: answersArray
            });

            setScore(res.data.score);
            setWrongAnswersList(res.data.wrongAnswers || []);
            setIsSubmitted(true);

            if (res.data.score === activeQuiz.totalQuestions) {
                confetti({
                    particleCount: 200,
                    spread: 120,
                    origin: { y: 0.5 },
                    colors: ['#10B981', '#3B82F6', '#F59E0B']
                });
            } else if (res.data.score > 0) {
                confetti({
                    particleCount: 80,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#8B5CF6', '#EC4899']
                });
            }
        } catch (err) {
            console.error(err);
            alert('Failed to submit quiz answers.');
        } finally {
            setSubmitting(false);
        }
    };

    const getOptionClass = (optionIndex) => {
        const isSelected = selectedAnswers[currentQ] === optionIndex;

        if (!isSubmitted) {
            return isSelected
                ? 'border-primary bg-primary/5 text-primary shadow-[0_4px_20px_rgba(139,92,246,0.15)] ring-2 ring-primary/50'
                : 'border-slate-200/60 hover:border-slate-300 hover:bg-white/60 text-slate-700 bg-white/40 shadow-sm';
        }

        const isCorrect = activeQuiz.questions[currentQ].correctOption === optionIndex;

        if (isCorrect) return 'border-success bg-success/10 text-success shadow-[0_0_20px_rgba(16,185,129,0.2)] ring-2 ring-success/50';
        if (isSelected && !isCorrect) return 'border-error bg-error/10 text-error opacity-90 ring-1 ring-error/50';

        return 'border-slate-200 opacity-40 text-slate-400 bg-slate-50';
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex min-h-screen text-slate-800 relative overflow-hidden"
        >
            <Sidebar />

            <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] -z-20 pointer-events-none animate-pulse-slow"></div>

            <main className="flex-1 ml-64 p-8 flex flex-col items-center justify-center min-h-screen relative z-10">

                <header className="w-full max-w-3xl mb-12 flex items-end justify-between">
                    <div>
                        <h1 className="text-4xl font-display font-bold mb-3 flex items-center gap-3">
                            <Target className="text-primary" size={36} />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">AI Quizzes</span>
                        </h1>
                        <p className="text-slate-500 font-medium">Test your knowledge and earn XP</p>
                    </div>
                </header>

                <div className="w-full max-w-3xl">
                    <AnimatePresence mode="wait">
                        {!activeQuiz ? (
                            <motion.div
                                key="quiz-setup"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="glass-panel p-8 border-white/60 shadow-xl shadow-slate-200/50"
                            >
                                <h2 className="text-2xl font-display font-bold text-slate-800 mb-8 flex items-center gap-2">
                                    <Sparkles className="text-primary" size={24} /> New Quiz
                                </h2>
                                <form onSubmit={handleGenerate} className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Topic / Subject</label>
                                        <input
                                            type="text"
                                            required
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            className="input-field shadow-inner bg-white/60 text-xl"
                                            placeholder="e.g. React.js Architecture"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Number of Questions</label>
                                        <select
                                            value={numQuestions}
                                            onChange={(e) => setNumQuestions(e.target.value)}
                                            className="input-field shadow-inner bg-white/60 font-medium"
                                        >
                                            <option value="5">5 Questions</option>
                                            <option value="10">10 Questions</option>
                                            <option value="20">20 Questions</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Source Note</label>
                                        <select
                                            required
                                            value={selectedNoteId}
                                            onChange={(e) => setSelectedNoteId(e.target.value)}
                                            className="input-field shadow-inner bg-white/60 text-lg cursor-pointer"
                                        >
                                            <option value="" disabled>Select a Note to generate from...</option>
                                            {notes.map(note => (
                                                <option key={note._id} value={note._id}>{note.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={generating || !topic.trim() || !selectedNoteId}
                                        className="w-full btn-primary bg-gradient-to-r from-primary via-secondary to-tertiary shadow-lg shadow-secondary/30 py-4 font-bold text-lg mt-4 disabled:opacity-50 relative overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {generating ? <><Loader2 className="animate-spin" size={20} /> Generating Quiz...</> : <><Plus size={20} /> Build Quiz Content</>}
                                        </span>
                                    </button>
                                </form>
                            </motion.div>
                        ) : !isSubmitted ? (
                            <motion.div
                                key="quiz-questions"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Progress Bar */}
                                <div className="flex gap-2 mb-10">
                                    {activeQuiz.questions.map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={`h-2.5 flex-1 rounded-full transition-all duration-500 overflow-hidden bg-white border border-slate-200 shadow-inner`}
                                        >
                                            <div className={`h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-700 ease-out`} style={{ width: idx < currentQ ? '100%' : (idx === currentQ ? '50%' : '0%') }}></div>
                                        </div>
                                    ))}
                                </div>

                                <div className="glass-panel border-white/60 p-10 relative overflow-hidden shadow-xl shadow-slate-200/50">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full -z-10"></div>

                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-lg tracking-widest uppercase">Question {currentQ + 1} of {activeQuiz.questions.length}</span>
                                    </div>

                                    <h2 className="text-2xl md:text-3xl font-display font-bold mb-10 leading-snug text-slate-800">
                                        {activeQuiz.questions[currentQ].question}
                                    </h2>

                                    <div className="space-y-4 relative z-10">
                                        {activeQuiz.questions[currentQ].options.map((opt, idx) => (
                                            <motion.div
                                                whileHover={!isSubmitted ? { scale: 1.01, x: 5 } : {}}
                                                whileTap={!isSubmitted ? { scale: 0.99 } : {}}
                                                key={idx}
                                                onClick={() => handleSelect(idx)}
                                                className={`p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex items-center justify-between group ${getOptionClass(idx)}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${selectedAnswers[currentQ] === idx ? 'bg-primary text-white' : 'bg-slate-100/80 text-slate-500 group-hover:bg-primary/20 group-hover:text-primary'}`}>
                                                        {String.fromCharCode(65 + idx)}
                                                    </div>
                                                    <span className="font-semibold text-lg">{opt}</span>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedAnswers[currentQ] === idx ? 'border-primary' : 'border-slate-300 group-hover:border-primary/50'}`}>
                                                    {selectedAnswers[currentQ] === idx && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    <div className="mt-10 pt-8 border-t border-slate-200/60 flex justify-between items-center relative z-10">
                                        <button
                                            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                                            disabled={currentQ === 0 || submitting}
                                            className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-md"
                                        >
                                            Previous
                                        </button>

                                        {currentQ < activeQuiz.questions.length - 1 ? (
                                            <button
                                                onClick={() => setCurrentQ(currentQ + 1)}
                                                disabled={selectedAnswers[currentQ] === undefined || submitting}
                                                className="btn-primary flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next Question <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleSubmit}
                                                disabled={Object.keys(selectedAnswers).length < activeQuiz.questions.length || submitting}
                                                className="btn-primary bg-gradient-to-r from-secondary to-tertiary flex items-center gap-2 shadow-lg shadow-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                                <span className="relative z-10 flex items-center gap-2">
                                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <>Submit & Score <CheckCircle2 size={18} /></>}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="quiz-results"
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="glass-panel border-white/60 p-12 overflow-hidden relative shadow-2xl shadow-slate-200 text-center"
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-secondary/5 to-success/5 animate-pulse-slow pointer-events-none"></div>

                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                                    transition={{ type: 'spring', damping: 10, delay: 0.2 }}
                                    className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 relative z-10 bg-white shadow-xl border-4 border-slate-50"
                                >
                                    <div className={`absolute inset-0 rounded-full bg-gradient-to-br opacity-20 blur-xl ${score === activeQuiz.totalQuestions ? 'from-success to-emerald-400' : 'from-primary to-secondary'}`}></div>
                                    <Trophy size={64} className={score === activeQuiz.totalQuestions ? 'text-success drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-primary drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]'} />
                                </motion.div>

                                <h2 className="text-4xl font-display font-extrabold mb-4 text-slate-800 relative z-10">
                                    {score === activeQuiz.totalQuestions ? 'Perfect Score!' : 'Great Effort!'}
                                </h2>

                                <div className="flex items-center justify-center gap-6 mb-10 relative z-10">
                                    <div className="bg-white/80 backdrop-blur px-6 py-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Score</span>
                                        <span className={`text-3xl font-black ${score === activeQuiz.totalQuestions ? 'text-success' : 'text-primary'}`}>{score}<span className="text-slate-300 text-2xl">/{activeQuiz.totalQuestions}</span></span>
                                    </div>
                                    <div className="bg-white/80 backdrop-blur px-6 py-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">XP Earned</span>
                                        <span className="text-3xl font-black text-tertiary">+30</span>
                                    </div>
                                </div>

                                {wrongAnswersList.length > 0 && (
                                    <div className="text-left mb-10 bg-white/50 p-6 rounded-2xl border border-slate-100 max-h-96 overflow-y-auto relative z-10">
                                        <h3 className="font-bold text-xl mb-6 text-slate-800 flex items-center gap-2">
                                            <AlertCircle className="text-error" /> Areas for Improvement
                                        </h3>
                                        <div className="space-y-6">
                                            {wrongAnswersList.map((wa, i) => (
                                                <div key={i} className="pb-6 border-b border-slate-200/50 last:border-0 last:pb-0">
                                                    <p className="font-bold text-slate-700 mb-2">Q: {wa.question}</p>
                                                    <div className="flex gap-4 mb-2 text-sm">
                                                        <span className="text-error font-semibold flex items-center gap-1"><X size={14} /> Your Answer: {wa.yourAnswer}</span>
                                                        <span className="text-success font-semibold flex items-center gap-1"><CheckCircle2 size={14} /> Correct: {wa.correctAnswer}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl italic">
                                                        <strong>Explanation:</strong> {wa.explanation}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="max-w-max mx-auto relative z-10 space-y-4 space-x-0 md:space-y-0 md:space-x-4 flex flex-col md:flex-row">
                                    <button onClick={() => setActiveQuiz(null)} className="btn-secondary py-4 px-8 text-lg font-bold shadow-sm">
                                        <RotateCcw size={20} className="mr-2" /> Make Another Quiz
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </motion.div>
    );
};

export default QuizView;
