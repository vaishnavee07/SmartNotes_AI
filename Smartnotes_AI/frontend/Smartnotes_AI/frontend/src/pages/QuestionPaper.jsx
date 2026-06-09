import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import axios from '../api/axios';
import { Loader2, FileText, Printer, Plus, Sparkles, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import useActivityTracker from '../hooks/useActivityTracker';

/* ──────────────────────────────────────────────────────────
   SECTION VIEWER — renders one section of the question paper
   Supports both single-answer and internal-choice questions
────────────────────────────────────────────────────────── */
const SectionViewer = ({ section, sectionIndex }) => {
    return (
        <div className="mb-10">
            {/* Section header */}
            <div className="mb-4">
                <h3 className="text-lg font-black uppercase tracking-widest bg-slate-900 text-white inline-block px-5 py-2 print:border print:border-black print:text-black print:bg-white">
                    Section {section.section}
                </h3>
                {section.instruction && (
                    <p className="mt-3 text-sm font-semibold italic text-slate-700 print:text-black bg-slate-50 print:bg-transparent p-2 border-l-4 border-slate-300 print:border-black">
                        {section.instruction}
                    </p>
                )}
            </div>

            <div className="space-y-6">
                {section.questions?.map((q, qIdx) => {
                    if (q.type === 'single') {
                        return (
                            <SingleQuestion
                                key={qIdx}
                                number={q.questionNumber || qIdx + 1}
                                question={q.question}
                                marks={q.marks}
                            />
                        );
                    }

                    if (q.type === 'choice') {
                        return (
                            <ChoiceQuestion
                                key={qIdx}
                                number={q.questionNumber || qIdx + 1}
                                choices={q.choice}
                            />
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────────
   SINGLE QUESTION — short answer, fixed marks
────────────────────────────────────────────────────────── */
const SingleQuestion = ({ number, question, marks }) => (
    <div className="flex gap-4 items-start pb-4 border-b border-slate-100 print:border-none">
        <span className="font-bold text-base min-w-[28px] text-slate-800">{number}.</span>
        <p className="flex-1 text-base leading-relaxed text-slate-800">{question}</p>
        <span className="font-bold text-sm bg-slate-100 print:bg-transparent px-2 py-1 rounded shrink-0 text-slate-700">
            [{marks} M]
        </span>
    </div>
);

/* ──────────────────────────────────────────────────────────
   CHOICE QUESTION — internal choice (A OR B format)
────────────────────────────────────────────────────────── */
const ChoiceQuestion = ({ number, choices }) => {
    const optA = choices?.[0];
    const optB = choices?.[1];
    const marks = optA?.marks || 0;

    return (
        <div className="pb-6 border-b border-slate-200 print:border-none">
            <div className="flex gap-2 items-center mb-3">
                <span className="font-bold text-base text-slate-800 min-w-[28px]">{number}.</span>
                <span className="font-bold text-sm bg-slate-200 print:bg-transparent px-2 py-1 rounded text-slate-700">
                    [{marks} M] — Answer EITHER A or B
                </span>
            </div>

            <div className="ml-8 space-y-3">
                {/* Option A */}
                <div className="flex gap-3 items-start p-4 bg-slate-50 print:bg-transparent rounded-xl border border-slate-200 print:border-none">
                    <span className="font-black text-primary text-sm min-w-[20px] mt-0.5">(A)</span>
                    <p className="flex-1 text-base leading-relaxed text-slate-800">{optA?.question}</p>
                </div>

                {/* OR divider */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-300" />
                    <span className="font-black text-slate-500 text-xs uppercase tracking-widest px-2">OR</span>
                    <div className="flex-1 h-px bg-slate-300" />
                </div>

                {/* Option B */}
                <div className="flex gap-3 items-start p-4 bg-slate-50 print:bg-transparent rounded-xl border border-slate-200 print:border-none">
                    <span className="font-black text-secondary text-sm min-w-[20px] mt-0.5">(B)</span>
                    <p className="flex-1 text-base leading-relaxed text-slate-800">{optB?.question}</p>
                </div>
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────────
   MAIN PAGE COMPONENT
────────────────────────────────────────────────────────── */
const QuestionPaper = () => {
    useActivityTracker('question-paper');

    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [viewingPaper, setViewingPaper] = useState(null);
    const paperRef = useRef(null);

    // Form state
    const [topic, setTopic] = useState('');
    const [marks, setMarks] = useState(50);
    const [difficulty, setDifficulty] = useState('Medium');
    const [notes, setNotes] = useState([]);
    const [selectedNoteId, setSelectedNoteId] = useState('');

    useEffect(() => {
        fetchPapers();
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const res = await axios.get('/notes');
            setNotes(res.data);
        } catch (error) {
            console.error('Error fetching notes:', error);
        }
    };

    const fetchPapers = async () => {
        try {
            const res = await axios.get('/study/question-papers');
            setPapers(res.data);
        } catch (error) {
            console.error('Error fetching question papers:', error);
            // Do NOT set mock data — surface real errors to user
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!selectedNoteId) return alert('Please select a valid Note.');
        setGenerating(true);
        try {
            const res = await axios.post('/study/question-paper/generate', {
                topic,
                marks,
                difficulty,
                noteId: selectedNoteId
            });
            const newPaper = res.data.questionPaper;
            setPapers(prev => [newPaper, ...prev]);
            setViewingPaper(newPaper);
        } catch (error) {
            console.error('Error generating question paper:', error);
            alert(error.response?.data?.error || 'Failed to generate question paper.');
        } finally {
            setGenerating(false);
        }
    };

    const handlePrint = () => window.print();

    const handleDownloadPDF = () => {
        const element = paperRef.current;
        const opt = {
            margin: 15,
            filename: `${(viewingPaper.subject || viewingPaper.topic || 'Paper').replace(/\s+/g, '_')}_Exam_Paper.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().from(element).set(opt).save();
    };

    if (loading) {
        return (
            <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 ml-64 p-8 flex items-center justify-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}>
                        <Loader2 className="text-primary" size={48} />
                    </motion.div>
                </div>
            </div>
        );
    }

    /* ── PAPER VIEWER ── */
    if (viewingPaper) {
        const paperTitle = viewingPaper.subject || viewingPaper.topic || 'Examination';
        return (
            <div className="flex min-h-screen">
                <Sidebar className="print:hidden" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 ml-64 p-8 max-w-5xl w-full print:ml-0 print:p-0 print:max-w-full"
                >
                    {/* Toolbar */}
                    <div className="flex items-center justify-between mb-8 print:hidden glass-panel py-4 px-6 sticky top-8 z-50 shadow-xl shadow-slate-200/50">
                        <button
                            onClick={() => setViewingPaper(null)}
                            className="text-slate-500 hover:text-primary transition-colors font-bold flex items-center gap-2 bg-slate-100 hover:bg-primary/10 px-4 py-2 rounded-xl"
                        >
                            ← Back
                        </button>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleDownloadPDF}
                                className="flex items-center gap-2 btn-secondary bg-white text-slate-700 hover:text-primary border border-slate-200 shadow-sm py-2.5 px-6"
                            >
                                <Download size={18} /> Download PDF
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 btn-primary bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/30 py-2.5 px-6"
                            >
                                <Printer size={18} /> Print Paper
                            </button>
                        </div>
                    </div>

                    {/* Printable content */}
                    <div
                        ref={paperRef}
                        className="bg-white text-black p-12 rounded-3xl shadow-2xl print:shadow-none print:p-6 print:rounded-none border border-slate-100 relative overflow-hidden"
                    >
                        {/* Watermark (screen only) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[150px] font-black text-slate-50/50 pointer-events-none -rotate-12 select-none print:hidden uppercase">
                            Mock Exam
                        </div>

                        {/* Paper Header */}
                        <div className="text-center mb-12 border-b-4 border-double border-slate-900 pb-8 relative z-10">
                            <h1 className="text-4xl font-black uppercase tracking-widest mb-4">
                                Final Examination
                            </h1>
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">
                                Course: {paperTitle}
                            </h2>
                            <div className="flex justify-between mt-6 text-sm font-bold px-12 bg-slate-100/50 print:bg-transparent py-3 rounded-lg">
                                <span>Time Allowed: 3 Hours</span>
                                <span className="capitalize">Level: {viewingPaper.difficulty}</span>
                                <span>Max Marks: {viewingPaper.totalMarks || viewingPaper.evaluatedTotal}</span>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="mb-8 p-4 border border-slate-300 rounded-lg bg-slate-50 print:bg-transparent relative z-10">
                            <p className="text-sm font-semibold text-slate-700">
                                <strong>General Instructions:</strong> Read all questions carefully. For internal choice questions, attempt EITHER option A OR option B — not both.
                            </p>
                        </div>

                        {/* Sections */}
                        <div className="relative z-10">
                            {viewingPaper.sections?.map((section, idx) => (
                                <SectionViewer key={idx} section={section} sectionIndex={idx} />
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="mt-16 text-center text-sm font-black tracking-widest border-t-4 border-double border-slate-900 pt-6 relative z-10">
                            *** END OF QUESTION PAPER *** | Total Marks: {viewingPaper.totalMarks || viewingPaper.evaluatedTotal}
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    /* ── LIST VIEW ── */
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="flex-1 ml-64 p-8 text-slate-800 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-tertiary/10 rounded-full blur-[120px] -z-20 pointer-events-none animate-pulse-slow" />

                {/* Page Header */}
                <div className="flex items-center gap-4 mb-12 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                        <FileText size={28} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-display font-bold text-slate-900 mb-2">Question Papers</h1>
                        <p className="text-slate-500 font-medium">Generate realistic university exam papers using AI.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                    {/* Generator Form */}
                    <div className="lg:col-span-1">
                        <div className="glass-panel p-8 border-white/60 shadow-xl shadow-slate-200/50 sticky top-8">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -z-10" />
                            <h2 className="text-2xl font-display font-bold text-slate-800 mb-8 flex items-center gap-2">
                                <Sparkles className="text-primary" size={24} /> New Paper
                            </h2>

                            <form onSubmit={handleGenerate} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                        Topic / Subject
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        className="input-field shadow-inner bg-white/60 text-lg"
                                        placeholder="e.g. React.js, Deep Learning"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                        Total Marks
                                    </label>
                                    <select
                                        value={marks}
                                        onChange={(e) => setMarks(e.target.value)}
                                        className="input-field shadow-inner bg-white/60 font-medium"
                                    >
                                        <option value="20">20 Marks — Quick Test (5×2 + 1 essay)</option>
                                        <option value="50">50 Marks — Midterm (5×2 + 3×8 + 16)</option>
                                        <option value="100">100 Marks — Final Exam (10×2 + 5×8 + 2×20)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                        Difficulty
                                    </label>
                                    <select
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value)}
                                        className="input-field shadow-inner bg-white/60 font-medium"
                                    >
                                        <option value="Easy">👶 Easy</option>
                                        <option value="Medium">🧠 Medium</option>
                                        <option value="Hard">🔥 Hard</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                        Source Note
                                    </label>
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
                                    {notes.length === 0 && (
                                        <p className="text-xs text-amber-600 mt-2 font-medium">
                                            No notes found. Upload study material in Study Area first.
                                        </p>
                                    )}
                                </div>

                                {/* Paper structure preview */}
                                {marks && (
                                    <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <p className="font-bold text-slate-700 mb-1">Structure Preview:</p>
                                        {String(marks) === '20' && <p>Section A: 5 × 2 = 10 | Section B: 1 × 10 = 10</p>}
                                        {String(marks) === '50' && <p>Section A: 5 × 2 = 10 | Section B: 3 × 8 = 24 | Section C: 1 × 16 = 16</p>}
                                        {String(marks) === '100' && <p>Section A: 10 × 2 = 20 | Section B: 5 × 8 = 40 | Section C: 2 × 20 = 40</p>}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={generating || !topic.trim() || !selectedNoteId}
                                    className="w-full btn-primary bg-gradient-to-r from-primary via-secondary to-tertiary shadow-lg shadow-secondary/30 py-4 font-bold text-lg mt-4 disabled:opacity-50 relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {generating
                                            ? <><Loader2 className="animate-spin" size={20} /> Generating...</>
                                            : <><Plus size={20} /> Generate Paper</>
                                        }
                                    </span>
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Paper History */}
                    <div className="lg:col-span-2">
                        <div className="glass-panel p-8 min-h-full">
                            <h2 className="text-2xl font-display font-bold text-slate-800 mb-8">Past Papers</h2>

                            {papers.length === 0 ? (
                                <div className="text-center text-slate-500 py-20 flex flex-col items-center">
                                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4 text-slate-300">
                                        <FileText size={40} />
                                    </div>
                                    <span className="font-medium text-lg">No question papers generated yet.</span>
                                    <p className="text-sm mt-2 text-slate-400">Generate your first paper using the form on the left.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {papers.map((paper, i) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            key={paper._id || i}
                                            className="bg-white/60 p-6 rounded-2xl border border-white/60 shadow-sm hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden"
                                            onClick={() => setViewingPaper(paper)}
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />

                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100/80 text-primary flex items-center justify-center border border-slate-200 group-hover:bg-primary group-hover:text-white transition-colors">
                                                    <FileText size={20} />
                                                </div>
                                                <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md border capitalize ${paper.difficulty === 'hard' || paper.difficulty === 'Hard'
                                                        ? 'bg-error/10 text-error border-error/20'
                                                        : paper.difficulty === 'easy' || paper.difficulty === 'Easy'
                                                            ? 'bg-success/10 text-success border-success/20'
                                                            : 'bg-primary/10 text-primary border-primary/20'
                                                    }`}>
                                                    {paper.difficulty}
                                                </span>
                                            </div>

                                            <h3 className="text-xl font-display font-bold text-slate-800 mb-6 line-clamp-2 relative z-10 group-hover:text-primary transition-colors">
                                                {paper.subject || paper.topic}
                                            </h3>

                                            <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 relative z-10">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Marks</span>
                                                    <span className="font-bold text-slate-700">{paper.totalMarks}</span>
                                                </div>
                                                <div className="flex flex-col text-center">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Sections</span>
                                                    <span className="font-bold text-slate-700">{paper.sections?.length || 0}</span>
                                                </div>
                                                <div className="flex flex-col text-right">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Date</span>
                                                    <span className="font-bold text-slate-700">{new Date(paper.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default QuestionPaper;
