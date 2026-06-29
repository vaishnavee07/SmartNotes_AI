import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import { Bot, Send, User, BookOpen, AlertCircle, Lightbulb, Target, Compass, ChevronRight, Loader2, MessageSquare } from 'lucide-react';
import api from '../api/axios';
import useActivityTracker from '../hooks/useActivityTracker';

const AITutor = () => {
    useActivityTracker('ai-tutor');
    const [question, setQuestion] = useState('');
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);
    const [activeDoubt, setActiveDoubt] = useState(null); // holds the response object
    const [notes, setNotes] = useState([]);
    const [selectedNoteId, setSelectedNoteId] = useState('');
    
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Fetch user's study notes for context selector
        api.get('/notes').then(res => setNotes(res.data)).catch(console.error);
        
        // Fetch doubt history
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/tutor/history');
            setHistory(res.data);
        } catch (err) {
            console.error('Error fetching tutor history', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!question.trim()) return;

        setLoading(true);
        setError(null);
        setActiveDoubt(null);
        
        try {
            const res = await api.post('/tutor/ask', {
                question,
                topic: topic || undefined,
                noteId: selectedNoteId || undefined
            });
            
            setActiveDoubt({
                question,
                ...res.data
            });
            
            setQuestion('');
            fetchHistory(); // refresh history sidebar
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to get an answer. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (activeDoubt) scrollToBottom();
    }, [activeDoubt]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex h-screen overflow-hidden text-slate-800 bg-slate-50/50"
        >
            <Sidebar />

            <div className="flex-1 ml-64 flex relative">
                {/* Background ambient light */}
                <div className="absolute top-40 left-10 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

                {/* Left side - Chat/Response Area */}
                <main className="flex-1 flex flex-col h-full border-r border-slate-200/60 bg-white/40">
                    <header className="px-8 py-6 border-b border-slate-200/50 backdrop-blur-md bg-white/50 sticky top-0 z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 text-white">
                            <Bot size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-display font-bold">AI Tutor</h1>
                            <p className="text-sm text-slate-500 font-medium">Ask questions, get structured explanations, and improve your readiness.</p>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-8 relative scroll-smooth">
                        {!activeDoubt && !loading && (
                            <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center animate-fade-in opacity-80">
                                <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                    <MessageSquare size={40} className="text-slate-400" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-700 mb-2">How can I help you today?</h2>
                                <p className="text-slate-500">I can explain complex topics, highlight common mistakes, and guide your next study step.</p>
                                
                                <div className="mt-8 flex flex-wrap gap-2 justify-center">
                                    <span className="px-3 py-1 bg-white border rounded-full text-xs font-semibold text-slate-600 shadow-sm cursor-pointer hover:border-primary transition-colors" onClick={() => setQuestion("Explain Neural Networks like I'm 5")}>Explain Neural Networks</span>
                                    <span className="px-3 py-1 bg-white border rounded-full text-xs font-semibold text-slate-600 shadow-sm cursor-pointer hover:border-primary transition-colors" onClick={() => setQuestion("What are the common mistakes in React hooks?")}>React Hooks mistakes</span>
                                    <span className="px-3 py-1 bg-white border rounded-full text-xs font-semibold text-slate-600 shadow-sm cursor-pointer hover:border-primary transition-colors" onClick={() => setQuestion("How does backpropagation work?")}>Backpropagation</span>
                                </div>
                            </div>
                        )}

                        {activeDoubt && (
                            <div className="max-w-3xl mx-auto space-y-8 animate-slide-up pb-8">
                                {/* User Question */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                        <User size={20} className="text-slate-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="inline-block bg-white p-4 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm">
                                            <p className="text-slate-800 font-medium">{activeDoubt.question}</p>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                Topic: {activeDoubt.topic}
                                            </span>
                                            {activeDoubt.hadNoteContext && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                                                    Context Applied
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* AI Response - Structured */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 text-white shadow-md">
                                        <Bot size={20} />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        
                                        {/* Simple Explanation */}
                                        <div className="bg-white p-5 rounded-2xl border border-primary/20 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <Lightbulb size={16} /> Simple Explanation
                                            </h3>
                                            <p className="text-slate-700 leading-relaxed font-medium">{activeDoubt.simpleExplanation}</p>
                                        </div>

                                        {/* Detailed Explanation */}
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <BookOpen size={16} /> Detailed Breakdown
                                            </h3>
                                            <p className="text-slate-600 leading-relaxed">{activeDoubt.detailedExplanation}</p>
                                        </div>

                                        {/* Two columns for Concepts and Mistakes */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {activeDoubt.keyConcepts?.length > 0 && (
                                                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                                                    <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <Target size={16} /> Key Concepts
                                                    </h3>
                                                    <ul className="space-y-2">
                                                        {activeDoubt.keyConcepts.map((concept, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                                                                <span className="text-emerald-500 mt-0.5">•</span> {concept}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {activeDoubt.commonMistakes?.length > 0 && (
                                                <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100">
                                                    <h3 className="text-sm font-bold text-rose-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <AlertCircle size={16} /> Common Mistakes
                                                    </h3>
                                                    <ul className="space-y-2">
                                                        {activeDoubt.commonMistakes.map((mistake, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm text-rose-800">
                                                                <span className="text-rose-500 mt-0.5">•</span> {mistake}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* Suggested Action */}
                                        <div className="bg-gradient-to-r from-secondary/10 to-primary/10 p-5 rounded-2xl border border-secondary/20 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-1 flex items-center gap-2">
                                                    <Compass size={16} /> Next Best Action
                                                </h3>
                                                <p className="text-slate-700 font-medium text-sm">{activeDoubt.suggestedAction}</p>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-white border-t border-slate-200/50 z-20">
                        {error && (
                            <div className="mb-4 text-sm text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
                            <div className="flex items-center gap-3 mb-3">
                                <select 
                                    className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-xl focus:ring-primary focus:border-primary block p-2"
                                    value={selectedNoteId}
                                    onChange={(e) => setSelectedNoteId(e.target.value)}
                                >
                                    <option value="">No Context (General AI)</option>
                                    {notes.map(n => (
                                        <option key={n._id} value={n._id}>{n.title}</option>
                                    ))}
                                </select>
                                <input 
                                    type="text" 
                                    placeholder="Topic (Optional)" 
                                    className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-xl focus:ring-primary focus:border-primary block p-2 w-32"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl py-4 pl-4 pr-14 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm"
                                    placeholder="Ask a question..."
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    disabled={loading}
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !question.trim()}
                                    className="absolute right-2 top-2 bottom-2 w-10 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                </button>
                            </div>
                        </form>
                    </div>
                </main>

                {/* Right side - History Sidebar */}
                <aside className="w-80 bg-white/60 border-l border-slate-200/50 flex flex-col">
                    <div className="p-6 border-b border-slate-200/50">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <Bot size={18} className="text-primary" /> Doubt History
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {history.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center mt-10">No questions asked yet.</p>
                        ) : (
                            history.map(item => (
                                <div 
                                    key={item._id} 
                                    onClick={() => setQuestion(item.question)}
                                    className="p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded">{item.topic}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 line-clamp-2 group-hover:text-primary transition-colors">{item.question}</p>
                                </div>
                            ))
                        )}
                    </div>
                </aside>
            </div>
        </motion.div>
    );
};

export default AITutor;
