import React, { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { Layers, RotateCcw, Sparkles, Plus, Loader2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../api/axios';
import useActivityTracker from '../hooks/useActivityTracker';

const QuestionItem = ({ card, marks }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="mb-4 bg-white/70 border border-slate-200/60 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-start justify-between p-5 text-left bg-white/50 hover:bg-white/80 transition-colors"
            >
                <div className="flex gap-4 items-start">
                    <span className={`font-bold text-sm px-3 py-1 rounded-full whitespace-nowrap h-fit mt-0.5 ${marks === 2 ? 'bg-green-100 text-green-700' :
                        marks === 5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        {marks} Marks
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 leading-snug pr-4">{card.question}</h3>
                </div>
                <div className="text-slate-400 mt-1 ml-2 flex-shrink-0 bg-slate-100 rounded-full p-1">
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-100"
                    >
                        <div className="p-6 bg-slate-50/50 pl-24">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Answer</h4>
                            <p className="text-slate-700 leading-relaxed text-lg whitespace-pre-wrap">{card.answer}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Flashcards = () => {
    useActivityTracker('flashcards');
    // Generate State
    const [activeDeck, setActiveDeck] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [topic, setTopic] = useState('');
    const [notes, setNotes] = useState([]);
    const [selectedNoteId, setSelectedNoteId] = useState('');

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
            const res = await axios.post('/study/flashcard/generate', {
                topic,
                noteId: selectedNoteId
            });
            setActiveDeck(res.data);
        } catch (error) {
            console.error('Error generating flashcards:', error);
            alert(error.response?.data?.error || 'Failed to generate flashcards.');
        } finally {
            setGenerating(false);
        }
    };

    const getQuestions = () => {
        if (!activeDeck || !activeDeck.flashcards || !activeDeck.flashcards.flashcards) {
            return { twoMark: [], fiveMark: [], tenMark: [] };
        }
        return activeDeck.flashcards.flashcards;
    };

    const { twoMark, fiveMark, tenMark } = getQuestions();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex min-h-screen text-slate-800 relative overflow-hidden"
        >
            <Sidebar />

            <div className="absolute top-20 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-20 pointer-events-none animate-pulse-slow"></div>
            <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-[80px] -z-20 pointer-events-none animate-blob"></div>

            <main className="flex-1 ml-64 p-8 flex flex-col items-center justify-start min-h-screen relative z-10 overflow-y-auto">
                <header className="w-full max-w-4xl mb-12 mt-4">
                    <h1 className="text-4xl font-display font-bold mb-3 flex items-center gap-3">
                        <Layers className="text-secondary" size={36} />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Exam Revision</span>
                    </h1>
                    <p className="text-slate-500 font-medium">Generate structured exam questions (2M, 5M, 10M) directly from your notes.</p>
                </header>

                <div className="w-full max-w-4xl perspective-1000">
                    <AnimatePresence mode="wait">
                        {!activeDeck ? (
                            <motion.div
                                key="flashcard-setup"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="glass-panel p-8 border-white/60 shadow-xl shadow-slate-200/50 max-w-2xl mx-auto"
                            >
                                <h2 className="text-2xl font-display font-bold text-slate-800 mb-8 flex items-center gap-2">
                                    <Sparkles className="text-secondary" size={24} /> New Revision Material
                                </h2>
                                <form onSubmit={handleGenerate} className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Topic / Subject</label>
                                        <input
                                            type="text"
                                            required
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            className="input-field shadow-inner bg-white/60 text-lg"
                                            placeholder="e.g. Distributed Systems"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Source Note (Strictly bounded context)</label>
                                        <select
                                            required
                                            value={selectedNoteId}
                                            onChange={(e) => setSelectedNoteId(e.target.value)}
                                            className="input-field shadow-inner bg-white/60 text-lg cursor-pointer"
                                        >
                                            <option value="" disabled>Select a Note to generate exam questions from...</option>
                                            {notes.map(note => (
                                                <option key={note._id} value={note._id}>{note.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={generating || !topic.trim() || !selectedNoteId}
                                        className="w-full btn-primary bg-gradient-to-r from-secondary via-primary to-tertiary shadow-lg shadow-secondary/30 py-4 font-bold text-lg mt-4 disabled:opacity-50 relative overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {generating ? <><Loader2 className="animate-spin" size={20} /> Generating Exam Questions...</> : <><Plus size={20} /> Build Revision Kit</>}
                                        </span>
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="flashcard-deck"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full pb-20"
                            >
                                <div className="flex items-center justify-between mb-10 bg-white/40 p-6 rounded-3xl border border-white/60 shadow-sm backdrop-blur">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                                            <BookOpen size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold font-display text-slate-800">Exam Revision Layout</h2>
                                            <p className="text-slate-500 font-medium">Topic: <span className="text-primary font-bold">{topic}</span></p>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveDeck(null)} className="btn-secondary py-2 px-6">
                                        <RotateCcw size={16} /> New Deck
                                    </button>
                                </div>

                                {twoMark && twoMark.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                                        <h2 className="text-2xl font-display font-black text-slate-800 mb-6 flex items-center gap-3">
                                            <span className="text-green-500">🟢</span> 2 Mark Questions
                                        </h2>
                                        <div className="space-y-4">
                                            {twoMark.map((card, idx) => <QuestionItem key={`2m-${idx}`} card={card} marks={2} />)}
                                        </div>
                                    </motion.div>
                                )}

                                {fiveMark && fiveMark.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-12">
                                        <h2 className="text-2xl font-display font-black text-slate-800 mb-6 flex items-center gap-3">
                                            <span className="text-yellow-500">🟡</span> 5 Mark Questions
                                        </h2>
                                        <div className="space-y-4">
                                            {fiveMark.map((card, idx) => <QuestionItem key={`5m-${idx}`} card={card} marks={5} />)}
                                        </div>
                                    </motion.div>
                                )}

                                {tenMark && tenMark.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-12">
                                        <h2 className="text-2xl font-display font-black text-slate-800 mb-6 flex items-center gap-3">
                                            <span className="text-red-500">🔴</span> 10 Mark Questions
                                        </h2>
                                        <div className="space-y-4">
                                            {tenMark.map((card, idx) => <QuestionItem key={`10m-${idx}`} card={card} marks={10} />)}
                                        </div>
                                    </motion.div>
                                )}

                                <div className="text-center mt-12">
                                    <button onClick={() => setActiveDeck(null)} className="btn-primary py-4 px-10 text-lg w-full max-w-sm mx-auto shadow-xl shadow-primary/30">
                                        <RotateCcw size={20} /> Finish & Create Another
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

export default Flashcards;
