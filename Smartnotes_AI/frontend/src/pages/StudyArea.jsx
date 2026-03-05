import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { FileUp, Book, Brain, FileText, Image as ImageIcon, Sparkles, X, ChevronRight, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import html2pdf from 'html2pdf.js';
import useActivityTracker from '../hooks/useActivityTracker';

const StudyArea = () => {
    useActivityTracker('study');
    const navigate = useNavigate();
    const summaryRef = useRef(null);
    const [notes, setNotes] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [noteTitle, setNoteTitle] = useState('');
    const [activeNote, setActiveNote] = useState(null);
    const [isAiOrbOpen, setIsAiOrbOpen] = useState(false);
    const [explaining, setExplaining] = useState(false);
    const [explanation, setExplanation] = useState(null);
    
    // New states for text and YouTube input
    const [inputText, setInputText] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [generatedNotes, setGeneratedNotes] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'text', 'youtube'

    const handleOpenNote = async (note) => {
        setActiveNote(note);
        try {
            await api.post('/sessions/start', { noteId: note._id });
        } catch (err) {
            console.error('Session start error:', err);
        }
    };

    const handleCloseNote = async () => {
        setActiveNote(null);
        setExplanation(null);
        try {
            await api.post('/sessions/end');
        } catch (err) {
            console.error('Session end error:', err);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const res = await api.get('/notes');
            if (res.data.length === 0) {
                // Mock note for demonstration of Gen-Z UI if backend is empty
                setNotes([{
                    _id: 'mock1',
                    title: 'Chapter 4: Neural Networks',
                    summary: 'An introduction to deep learning, backpropagation, and activation functions.',
                    sourceType: 'text',
                    createdAt: new Date().toISOString(),
                    content: `# Introduction to Neural Networks\n\nNeural networks are computing systems inspired by the biological **<glow>neural networks</glow>** that constitute animal brains.\n\n## Architecture\n\nAn artificial neural network is an interconnected group of nodes, inspired by a simplification of neurons in a brain. Here, each circular node represents an artificial neuron and an arrow represents a connection from the output of one artificial neuron to the input of another.\n\n## Backpropagation\n\nThe algorithm is used to effectively train a neural network through a method called **<glow>chain rule</glow>**. In simple terms, after each forward pass through a network, backpropagation performs a backward pass while adjusting the model's parameters (weights and biases).`
                }]);
            } else {
                setNotes(res.data);
            }
        } catch (e) {
            console.error('Failed to fetch notes');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile || !noteTitle) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('title', noteTitle);

        const fileType = selectedFile.type;
        const sourceType = fileType.includes('pdf') ? 'pdf' : (fileType.includes('image') ? 'image' : 'text');
        formData.append('sourceType', sourceType);
        formData.append('file', selectedFile);

        try {
            await api.post('/notes/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSelectedFile(null);
            setNoteTitle('');
            fetchNotes();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Failed to upload/parse note. Ensure PDF is valid.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleExplain = async () => {
        if (!activeNote) return;
        setExplaining(true);
        setExplanation(null);
        try {
            const res = await api.get(`/study/explain/${activeNote._id}`);
            setExplanation(res.data.result);
        } catch (error) {
            console.error('Explain error:', error);
            alert('Failed to generate explanation.');
        } finally {
            setExplaining(false);
        }
    };

    const handleGenerateFromText = async () => {
        if (!inputText.trim()) {
            alert('Please enter some text');
            return;
        }

        setIsGenerating(true);
        setGeneratedNotes(null);
        try {
            const res = await api.post('/study/generate-notes', {
                text: inputText,
                title: noteTitle || 'Text Input Note'
            });
            setGeneratedNotes(res.data.notes);
            setInputText('');
            setNoteTitle('');
            fetchNotes();
            alert('Notes generated and saved successfully!');
        } catch (error) {
            console.error('Generate notes error:', error);
            alert(error.response?.data?.error || 'Failed to generate notes');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAnalyzeYouTube = async () => {
        if (!youtubeUrl.trim()) {
            alert('Please enter a YouTube URL');
            return;
        }

        if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
            alert('Please enter a valid YouTube URL');
            return;
        }

        setIsGenerating(true);
        setGeneratedNotes(null);
        try {
            const res = await api.post('/study/analyze-youtube', {
                url: youtubeUrl,
                title: noteTitle || 'YouTube Video Notes'
            });
            setGeneratedNotes(res.data.notes);
            setYoutubeUrl('');
            setNoteTitle('');
            fetchNotes();
            alert('YouTube video analyzed and notes saved successfully!');
        } catch (error) {
            console.error('YouTube analysis error:', error);
            alert(error.response?.data?.error || 'Failed to analyze YouTube video');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportPDF = () => {
        if (!activeNote) return;

        const element = document.getElementById('notes-content');
        if (!element) {
            console.error('Notes container not found');
            return;
        }

        // Build a clean, DOM-independent HTML string from the raw note content.
        // Capturing the live element is unreliable because ancestor elements use
        // backdrop-blur / semi-transparent backgrounds that html2canvas cannot
        // render, producing blank pages. Reading from state + inline styles is
        // always deterministic and fully white-on-black.
        const raw = activeNote.content || `${activeNote.title}\n\nNo content available.`;

        const htmlLines = raw.split('\n').map(line => {
            if (line.startsWith('# '))
                return `<h1 style="font-size:22px;font-weight:bold;margin:16px 0 8px;color:#1e293b;">${line.slice(2)}</h1>`;
            if (line.startsWith('## '))
                return `<h2 style="font-size:17px;font-weight:bold;margin:14px 0 6px;color:#334155;">${line.slice(3)}</h2>`;
            if (line.startsWith('• ') || line.startsWith('- '))
                return `<p style="margin:3px 0 3px 16px;color:#1e293b;">• ${line.slice(2)}</p>`;
            if (/^━+$/.test(line.trim()))
                return `<hr style="border:none;border-top:2px solid #e2e8f0;margin:10px 0;" />`;
            if (line.trim() === '')
                return `<br/>`;
            return `<p style="margin:5px 0;color:#1e293b;">${line}</p>`;
        }).join('');

        const htmlString = `
            <div style="font-family:Arial,sans-serif;background:#ffffff;color:#1e293b;padding:20px;max-width:750px;">
                <h1 style="font-size:24px;font-weight:bold;margin-bottom:20px;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:10px;">
                    ${activeNote.title || 'SmartNote'}
                </h1>
                ${htmlLines}
            </div>`;

        const options = {
            margin:      [12, 12, 12, 12],
            filename:    `${activeNote.title || 'SmartNote'}.pdf`,
            image:       { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, backgroundColor: '#ffffff', logging: false },
            jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
        };

        setTimeout(() => {
            html2pdf().set(options).from(htmlString).save();
        }, 500);
    };

    const parseContent = (content) => {
        if (!content) return null;
        return content.split('\n').map((line, idx) => {
            if (line.startsWith('# ')) {
                return (
                    <h1 key={idx} className="text-4xl font-display font-extrabold mt-8 mb-4 tracking-tight relative inline-block group">
                        {line.replace('# ', '')}
                        <div className="absolute bottom-1 left-0 w-full h-3 bg-gradient-to-r from-primary/40 to-secondary/40 -z-10 group-hover:from-primary/60 group-hover:to-secondary/60 transition-colors rounded-sm"></div>
                    </h1>
                );
            }
            if (line.startsWith('## ')) {
                return (
                    <h2 key={idx} className="text-2xl font-display font-bold mt-6 mb-3 relative inline-block">
                        {line.replace('## ', '')}
                        <div className="absolute -bottom-1 left-0 w-1/2 h-1 bg-gradient-to-r from-primary to-transparent rounded-full"></div>
                    </h2>
                );
            }

            // Handle mock glow tags
            const parts = line.split(/(<glow>.*?<\/glow>)/g);
            return (
                <p key={idx} className="text-slate-600 leading-relaxed mb-4 text-lg">
                    {parts.map((part, i) => {
                        if (part.startsWith('<glow>')) {
                            const word = part.replace('<glow>', '').replace('</glow>', '').replace(/\*\*/g, '');
                            return <span key={i} className="font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-md shadow-[0_0_10px_rgba(236,72,153,0.3)] border border-secondary/20 truncate">{word}</span>;
                        }
                        return part.replace(/\*\*/g, ''); // ignore bolding for now
                    })}
                </p>
            );
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex min-h-screen text-slate-800"
        >
            <Sidebar />

            <main className="flex-1 ml-64 p-8 overflow-x-hidden relative">
                {/* Background ambient light */}
                <div className="absolute top-40 right-10 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10 animate-pulse-slow"></div>
                <div className="absolute bottom-10 left-10 w-80 h-80 bg-secondary/10 rounded-full blur-[80px] -z-10 animate-blob"></div>

                <AnimatePresence mode="wait">
                    {!activeNote ? (
                        <motion.div
                            key="grid-view"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <header className="mb-10 animate-fade-in flex justify-between items-end">
                                <div>
                                    <h1 className="text-4xl font-display font-bold mb-2">Study Notes</h1>
                                    <p className="text-slate-500 font-medium">Upload materials to let AI generate summaries, quizzes, and flashcards.</p>
                                </div>
                            </header>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Input Section with Tabs */}
                                <div className="lg:col-span-1">
                                    <div className="glass-panel p-6 animate-slide-up sticky top-8">
                                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-xl z-0"></div>
                                        <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2 relative z-10">
                                            <div className="p-2 bg-primary/10 text-primary rounded-xl"><Sparkles size={20} /></div>
                                            Create Notes
                                        </h2>

                                        {/* Tab Buttons */}
                                        <div className="flex gap-2 mb-6 relative z-10">
                                            <button
                                                onClick={() => setActiveTab('upload')}
                                                className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'upload' ? 'bg-primary text-white shadow-lg' : 'bg-white/50 text-slate-600 hover:bg-white/80'}`}
                                            >
                                                <FileUp className="inline w-4 h-4 mr-1" /> Upload
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('text')}
                                                className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'text' ? 'bg-primary text-white shadow-lg' : 'bg-white/50 text-slate-600 hover:bg-white/80'}`}
                                            >
                                                <FileText className="inline w-4 h-4 mr-1" /> Text
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('youtube')}
                                                className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'youtube' ? 'bg-primary text-white shadow-lg' : 'bg-white/50 text-slate-600 hover:bg-white/80'}`}
                                            >
                                                <ImageIcon className="inline w-4 h-4 mr-1" /> YouTube
                                            </button>
                                        </div>

                                        {/* Common Title Input */}
                                        <div className="mb-5 relative z-10">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Note Title</label>
                                            <input
                                                type="text"
                                                className="input-field shadow-sm bg-white/70"
                                                placeholder="e.g. Chapter 4: Neural Networks"
                                                value={noteTitle}
                                                onChange={(e) => setNoteTitle(e.target.value)}
                                            />
                                        </div>

                                        {/* Upload Tab Content */}
                                        {activeTab === 'upload' && (
                                            <form onSubmit={handleUpload} className="space-y-5 relative z-10">
                                                <div
                                                    className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300 group cursor-pointer ${selectedFile ? 'border-primary bg-primary/5 shadow-inner' : 'border-slate-300 hover:border-primary/50 bg-white/40 hover:bg-white/60'}`}
                                                >
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        id="file-upload"
                                                        accept=".pdf,image/*,.txt"
                                                        onChange={(e) => setSelectedFile(e.target.files[0])}
                                                    />
                                                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center w-full h-full relative">
                                                        {selectedFile ? (
                                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-white mb-3 shadow-lg shadow-primary/20">
                                                                <Book className="w-8 h-8" />
                                                            </motion.div>
                                                        ) : (
                                                            <div className="w-16 h-16 bg-slate-100 group-hover:bg-primary/10 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors mb-3">
                                                                <FileUp className="w-8 h-8 group-hover:-translate-y-1 transition-transform" />
                                                            </div>
                                                        )}
                                                        <span className="text-sm font-bold text-slate-700">
                                                            {selectedFile ? selectedFile.name : 'Click to browse files'}
                                                        </span>
                                                        <span className="text-xs font-semibold text-slate-400 mt-2 bg-slate-100 px-3 py-1 rounded-md">PDF, Image, Text</span>
                                                    </label>
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={!selectedFile || isUploading}
                                                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                                                >
                                                    {isUploading && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                                                    {isUploading ? (
                                                        <span className="flex items-center gap-2"><RefreshCw className="animate-spin" size={18} /> Processing...</span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 relative z-10"><Sparkles size={18} /> Process with AI</span>
                                                    )}
                                                </button>
                                            </form>
                                        )}

                                        {/* Text Tab Content */}
                                        {activeTab === 'text' && (
                                            <div className="space-y-5 relative z-10">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Paste Your Study Material</label>
                                                    <textarea
                                                        className="input-field shadow-sm bg-white/70 min-h-[200px] resize-y"
                                                        placeholder="Paste your notes, textbook content, or any study material here..."
                                                        value={inputText}
                                                        onChange={(e) => setInputText(e.target.value)}
                                                    />
                                                </div>

                                                <button
                                                    onClick={handleGenerateFromText}
                                                    disabled={!inputText.trim() || isGenerating}
                                                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                                                >
                                                    {isGenerating && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                                                    {isGenerating ? (
                                                        <span className="flex items-center gap-2"><RefreshCw className="animate-spin" size={18} /> Generating...</span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 relative z-10"><Brain size={18} /> Generate Notes</span>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {/* YouTube Tab Content */}
                                        {activeTab === 'youtube' && (
                                            <div className="space-y-5 relative z-10">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">YouTube Video URL</label>
                                                    <input
                                                        type="url"
                                                        className="input-field shadow-sm bg-white/70"
                                                        placeholder="https://www.youtube.com/watch?v=..."
                                                        value={youtubeUrl}
                                                        onChange={(e) => setYoutubeUrl(e.target.value)}
                                                    />
                                                    <p className="text-xs text-slate-400 mt-2">
                                                        AI will fetch the video transcript and generate study notes
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={handleAnalyzeYouTube}
                                                    disabled={!youtubeUrl.trim() || isGenerating}
                                                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                                                >
                                                    {isGenerating && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                                                    {isGenerating ? (
                                                        <span className="flex items-center gap-2"><RefreshCw className="animate-spin" size={18} /> Analyzing...</span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 relative z-10"><Sparkles size={18} /> Analyze Video</span>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {/* Generated Notes Preview */}
                                        {generatedNotes && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mt-6 p-4 bg-green-50 border border-green-200 rounded-2xl relative z-10"
                                            >
                                                <p className="text-sm font-bold text-green-800 mb-2">✅ Notes Generated Successfully!</p>
                                                <p className="text-xs text-green-600">Check your notes list below.</p>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>

                                {/* Notes Grid */}
                                <div className="lg:col-span-2">
                                    {notes.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center p-12 text-center glass-panel border-white/50 relative overflow-hidden group">
                                            <div className="absolute bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full w-64 h-64 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                                            <div className="w-24 h-24 bg-white/80 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-slate-200/50 text-slate-300 relative z-10">
                                                <Brain size={48} />
                                            </div>
                                            <h3 className="text-3xl font-display font-bold mb-3 text-slate-800 relative z-10">Your Brain is Empty</h3>
                                            <p className="text-slate-500 max-w-sm font-medium relative z-10">
                                                Upload your handwritten notes, PDFs, or text. Our AI will automatically extract text, summarize, and generate study resources.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {notes.map((note, i) => (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    key={note._id || i}
                                                    onClick={() => handleOpenNote(note)}
                                                    className="glass-panel p-6 group cursor-pointer border-white/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/10 bg-white/60 hover:bg-white/80 hover:-translate-y-1 relative overflow-hidden flex flex-col"
                                                >
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>

                                                    <div className="flex items-start justify-between mb-4 relative z-10">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center border border-slate-200/60 shadow-inner group-hover:shadow-md transition-shadow">
                                                            {note.sourceType === 'image' ? <ImageIcon className="text-secondary" /> : <FileText className="text-primary" />}
                                                        </div>
                                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-100/80 px-2.5 py-1 rounded-lg backdrop-blur">{new Date(note.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <h3 className="font-display font-bold text-xl mb-2 line-clamp-1 text-slate-800 group-hover:text-primary transition-colors relative z-10">{note.title}</h3>
                                                    <p className="text-sm text-slate-500 line-clamp-2 mb-6 font-medium flex-1 relative z-10">
                                                        {note.summary || 'Summary pending...'}
                                                    </p>

                                                    {/* Decorative active indicator replacing buttons on card hover */}
                                                    <div className="flex items-center text-primary text-sm font-bold opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all z-10">
                                                        Open Editor <ChevronRight size={16} className="ml-1" />
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        // Gen-Z Note Editor / Viewer View
                        <motion.div
                            key="editor-view"
                            initial={{ opacity: 0, x: 20, scale: 0.98 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.98 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white min-h-[85vh] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col relative"
                        >
                            {/* Editor Header */}
                            <div className="h-20 border-b border-slate-100/50 px-8 flex items-center justify-between bg-white/50 sticky top-0 z-30 backdrop-blur-md">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => handleCloseNote()}
                                        className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                    <div className="w-px h-6 bg-slate-200"></div>
                                    <div>
                                        <h2 className="font-display font-bold text-lg text-slate-800">{activeNote.title}</h2>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{activeNote.sourceType}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="btn-secondary py-2 px-4 shadow-none">Share</button>
                                    <button onClick={handleExportPDF} className="btn-primary py-2 px-4 shadow-primary/20 bg-gradient-to-r from-primary to-secondary"><Sparkles size={16} /> Export as PDF</button>
                                </div>
                            </div>

                            {/* Editor Content Layout */}
                            <div className="flex flex-1 relative">
                                {/* Main Content Scroll Area */}
                                <div id="notes-content" ref={summaryRef} className="flex-1 p-12 overflow-y-auto max-h-[calc(85vh-5rem)] scroll-smooth relative z-10">
                                    <div className="max-w-3xl mx-auto pb-32">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest mb-4">
                                            <Sparkles size={12} /> AI Generated Summary
                                        </div>
                                        {parseContent(activeNote.content || `# ${activeNote.title}\n\nContent not generated yet.`)}
                                        {explanation && (
                                            <div className="mt-8 p-6 bg-gradient-to-r from-tertiary/10 to-transparent rounded-2xl border border-tertiary/20">
                                                <div className="flex items-center gap-2 text-tertiary font-bold mb-3">
                                                    <MessageSquare size={18} /> <span>Teacher's Note</span>
                                                </div>
                                                <p className="text-slate-700 leading-relaxed font-medium">
                                                    {explanation}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Floating AI Actions Panel */}
                                <div className="w-72 border-l border-slate-100/50 bg-white/40 p-6 flex flex-col relative z-20">
                                    <h3 className="font-display font-bold text-slate-800 mb-6 border-b border-slate-200/50 pb-4">AI Actions</h3>

                                    <div className="space-y-3">
                                        <motion.button onClick={() => navigate('/flashcards')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/30 flex items-center gap-3 transition-all text-left group">
                                            <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors"><Book size={18} /></div>
                                            <span className="font-semibold text-slate-700 text-sm">Create Flashcards</span>
                                        </motion.button>
                                        <motion.button onClick={() => navigate('/quizzes')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-secondary/30 flex items-center gap-3 transition-all text-left group">
                                            <div className="p-2 rounded-xl bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white transition-colors"><Brain size={18} /></div>
                                            <span className="font-semibold text-slate-700 text-sm">Generate Quiz</span>
                                        </motion.button>
                                        <motion.button disabled={explaining} onClick={handleExplain} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-tertiary/30 flex items-center gap-3 transition-all text-left group">
                                            <div className="p-2 rounded-xl bg-tertiary/10 text-tertiary group-hover:bg-tertiary group-hover:text-white transition-colors">{explaining ? <Loader2 className="animate-spin" size={18} /> : <MessageSquare size={18} />}</div>
                                            <span className="font-semibold text-slate-700 text-sm">{explaining ? "Explaining..." : "Explain like I'm 5"}</span>
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Animated AI Orb Assistant (Global inside StudyArea) */}
                <div className="fixed bottom-12 right-12 z-50 flex items-end justify-end">

                    {/* Orb chat bubble popup */}
                    <AnimatePresence>
                        {isAiOrbOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.8, fill: 'blur(10px)' }}
                                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: 10, scale: 0.8, filter: 'blur(10px)' }}
                                className="absolute bottom-24 right-0 glass-panel border-white/60 p-5 rounded-3xl w-72 shadow-2xl origin-bottom-right"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles size={16} className="text-secondary" />
                                    <h4 className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">SmartNotes AI</h4>
                                </div>
                                <p className="text-slate-600 text-sm mb-4 font-medium">I'm analyzing your current context. Do you need help understanding a specific topic?</p>
                                <input type="text" placeholder="Ask AI anything..." className="input-field py-2.5 px-3 text-sm rounded-xl shadow-none border-slate-200" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* The Orb */}
                    <motion.button
                        onClick={() => setIsAiOrbOpen(!isAiOrbOpen)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative w-16 h-16 rounded-full focus:outline-none flex items-center justify-center cursor-pointer shadow-2xl"
                    >
                        {/* Orb Core */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary via-secondary to-tertiary animate-gradient-xy opacity-90 shadow-[0_0_30px_rgba(139,92,246,0.6)]"></div>
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-secondary blur-xl opacity-60 animate-pulse-slow"></div>
                        {/* Rotating ring */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-full border border-white/40 border-t-white/80"
                        ></motion.div>

                        <Brain className="text-white relative z-10 animate-float" size={24} />
                    </motion.button>
                </div>

            </main>
        </motion.div>
    );
};

export default StudyArea;
