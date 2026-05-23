import React, { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { Calendar, Brain, Clock, Plus, Zap, ArrowRight, Target, Trash2, CheckCircle, Circle, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import useActivityTracker from '../hooks/useActivityTracker';

const PlannerView = () => {
    useActivityTracker('planner');
    const [topic, setTopic] = useState('');
    const [date, setDate] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [activePlan, setActivePlan] = useState(null);
    const [error, setError] = useState(null);

    // Goals state
    const [goals, setGoals] = useState([]);
    const [newGoalText, setNewGoalText] = useState('');
    const [addingGoal, setAddingGoal] = useState(false);
    const [showGoalForm, setShowGoalForm] = useState(false);

    useEffect(() => {
        fetchGoals();
        fetchLatestRoadmap();
    }, []);

    const fetchGoals = async () => {
        try {
            const res = await api.get('/goals');
            setGoals(res.data);
        } catch (err) {
            console.error('Failed to fetch goals:', err);
        }
    };

    const fetchLatestRoadmap = async () => {
        try {
            const res = await api.get('/planner');
            if (Array.isArray(res.data) && res.data.length > 0) {
                setActivePlan(res.data[0]); // backend sorts -createdAt, so [0] is newest
            }
        } catch (err) {
            console.error('Failed to fetch roadmaps:', err);
        }
    };

    // Safe date formatter — never shows Invalid Date
    const safeFormatDate = (dateVal) => {
        if (!dateVal) return 'No date set';
        try {
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return 'No date set';
            return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch {
            return 'No date set';
        }
    };

    const handleStartTask = async (dayId) => {
        if (!activePlan) return;
        try {
            const res = await api.post('/sessions/task/start', {
                planId: activePlan._id,
                taskId: dayId
            });
            setActivePlan(res.data.planner);
        } catch (err) {
            console.error('Start task error:', err);
            setError(err.response?.data?.error || 'Failed to start task session');
        }
    };

    const handleCompleteTask = async (dayId) => {
        if (!activePlan) return;
        try {
            const res = await api.post('/sessions/task/complete', {
                planId: activePlan._id,
                taskId: dayId
            });
            setActivePlan(res.data.planner);
        } catch (err) {
            console.error('Complete task error:', err);
            setError(err.response?.data?.error || 'Failed to complete task session');
        }
    };

    const handleGenerate = async () => {
        if (!topic || !date) {
            setError("Please fill in both Topic and Exam Date before generating.");
            return;
        }
        setError(null);
        setIsGenerating(true);
        try {
            const res = await api.post('/planner', {
                topic,
                examDate: date,
                availableHours: 2
            });
            setActivePlan(res.data);
            setTopic('');
            setDate('');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "Failed to generate roadmap. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddGoal = async (e) => {
        e.preventDefault();
        if (!newGoalText.trim()) return;
        setAddingGoal(true);
        try {
            const res = await api.post('/goals', { text: newGoalText.trim() });
            setGoals([res.data, ...goals]);
            setNewGoalText('');
            setShowGoalForm(false);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Failed to add goal.');
        } finally {
            setAddingGoal(false);
        }
    };

    const handleToggleGoal = async (goalId) => {
        try {
            const res = await api.patch(`/goals/${goalId}`);
            setGoals(goals.map(g => g._id === goalId ? res.data.goal : g));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteGoal = async (goalId) => {
        try {
            await api.delete(`/goals/${goalId}`);
            setGoals(goals.filter(g => g._id !== goalId));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex min-h-screen text-slate-800 relative overflow-hidden"
        >
            <Sidebar />

            <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10 animate-pulse-slow"></div>
            <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-secondary/10 rounded-full blur-[80px] -z-10 animate-blob"></div>

            <main className="flex-1 ml-64 p-8">
                <header className="mb-12 animate-fade-in flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-display font-bold mb-3 flex items-center gap-3">
                            <Calendar className="text-primary" size={36} />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">AI Planner</span>
                        </h1>
                        <p className="text-slate-500 font-medium">Generate structured revision roadmaps and daily goals.</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    <div className="lg:col-span-1 space-y-8">
                        {/* Auto-Plan Form */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="glass-panel p-8 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-secondary/10 to-transparent rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>

                            <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-3">
                                <div className="p-2 bg-secondary/10 text-secondary rounded-xl"><Brain size={20} /></div>
                                Auto-Plan
                            </h2>
                            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">Let AI create a day-by-day revision roadmap based on your topic and exam date.</p>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Target Subject / Topic</label>
                                    <input type="text" className="input-field bg-white/60 shadow-inner" placeholder="e.g. Data Structures & Algorithms" value={topic} onChange={e => setTopic(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Exam Date</label>
                                    <input type="date" className="input-field bg-white/60 shadow-inner" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                                </div>

                                {error && (
                                    <div className="flex items-start gap-2 text-error bg-error/5 border border-error/20 rounded-xl p-3 text-sm">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button type="button" onClick={handleGenerate} disabled={isGenerating} className="w-full btn-primary bg-gradient-to-r from-secondary to-primary shadow-lg shadow-secondary/30 relative overflow-hidden group/btn mt-2 disabled:opacity-60">
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Generating...</> : <><Zap size={18} /> Generate Roadmap</>}
                                    </span>
                                </button>
                            </div>
                        </motion.div>

                        {/* Manual Goals */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-panel p-8"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-xl font-display font-bold">Daily Goals</h2>
                                <button
                                    onClick={() => setShowGoalForm(v => !v)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                                >
                                    <Plus size={16} className={`transition-transform ${showGoalForm ? 'rotate-45' : ''}`} />
                                </button>
                            </div>

                            <AnimatePresence>
                                {showGoalForm && (
                                    <motion.form
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        onSubmit={handleAddGoal}
                                        className="mb-4 overflow-hidden"
                                    >
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                autoFocus
                                                className="input-field flex-1 py-2 text-sm"
                                                placeholder="e.g. Review Chapter 5..."
                                                value={newGoalText}
                                                onChange={e => setNewGoalText(e.target.value)}
                                            />
                                            <button type="submit" disabled={addingGoal || !newGoalText.trim()} className="btn-primary py-2 px-4 text-sm disabled:opacity-50">
                                                {addingGoal ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
                                            </button>
                                        </div>
                                    </motion.form>
                                )}
                            </AnimatePresence>

                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {goals.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-6">No goals yet. Add one above!</p>
                                ) : goals.map(goal => (
                                    <motion.div
                                        key={goal._id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-slate-100 hover:border-primary/30 group/goal transition-all"
                                    >
                                        <button onClick={() => handleToggleGoal(goal._id)} className="text-slate-300 hover:text-primary transition-colors shrink-0">
                                            {goal.completed
                                                ? <CheckCircle size={20} className="text-success" />
                                                : <Circle size={20} />}
                                        </button>
                                        <span className={`flex-1 text-sm font-medium ${goal.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                            {goal.text}
                                        </span>
                                        {goal.completed && (
                                            <span className="text-[10px] font-bold bg-success/10 text-success px-2 py-0.5 rounded-lg">+15 XP</span>
                                        )}
                                        <button
                                            onClick={() => handleDeleteGoal(goal._id)}
                                            className="text-slate-300 hover:text-error transition-colors opacity-0 group-hover/goal:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Roadmap Display */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="glass-panel min-h-[600px] p-10 flex flex-col border-white/60 shadow-xl shadow-slate-200/50 relative overflow-hidden"
                        >
                            {!activePlan ? (
                                <>
                                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50 pointer-events-none"></div>
                                    <div className="flex-1 flex flex-col items-center justify-center">
                                        <div className="w-24 h-24 bg-white/80 backdrop-blur rounded-3xl flex items-center justify-center border border-white mb-6 shadow-sm text-slate-300">
                                            <Clock size={48} />
                                        </div>
                                        <h3 className="text-2xl font-display font-bold text-slate-800 mb-2">Your AI Roadmap</h3>
                                        <p className="text-slate-500 text-sm max-w-sm text-center font-medium">
                                            Fill out the form on the left to generate a structured timeline that targets your weaknesses.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col pt-4">
                                    <div className="flex items-center justify-between mb-10">
                                        <h3 className="text-2xl font-display font-bold text-slate-800 flex items-center gap-3">
                                            <Target className="text-primary" />
                                            {activePlan.subject || activePlan.plan?.[0]?.topics?.[0] || 'Study'} Roadmap
                                        </h3>
                                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
                                            Exam: {safeFormatDate(activePlan.examDate)}
                                        </span>
                                    </div>

                                    <div className="w-full max-w-xl mx-auto space-y-0 relative">
                                        {/* Timeline line */}
                                        <div className="absolute top-0 bottom-0 left-[31px] w-0.5 bg-gradient-to-b from-primary via-secondary to-tertiary opacity-30"></div>

                                        {activePlan.plan?.map((item, i) => (
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 + i * 0.1 }}
                                                key={item._id || i}
                                                className="flex gap-8 relative pb-8"
                                            >
                                                <div className="relative z-10">
                                                    <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 transition-colors ${item.status === 'completed' ? 'bg-success text-white border-success' : 'bg-white border-primary/30 text-primary'}`}>
                                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Day</span>
                                                        <span className="text-xl font-display font-bold">{i + 1}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 flex-1 border border-white/60 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group">
                                                    <h4 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-primary transition-colors">
                                                        {item.topics?.length > 0 ? item.topics.join(', ') : `Day ${i + 1} Plan`}
                                                    </h4>
                                                    <p className="text-sm font-medium text-slate-500">{item.hours} hours</p>
                                                    <div className="mt-4 flex gap-2 flex-wrap">
                                                        <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md ${item.status === 'completed' ? 'bg-success/10 text-success' :
                                                            item.status === 'in_progress' ? 'bg-primary/10 text-primary' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                            {item.status === 'completed' ? '✓ Done' : item.status === 'in_progress' ? '⚡ In Progress' : 'Pending'}
                                                        </span>
                                                        {item.status === 'pending' && (
                                                            <button
                                                                onClick={() => handleStartTask(item._id)}
                                                                className="text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary px-2 py-1 rounded-md flex items-center gap-1 hover:bg-primary hover:text-white transition-colors cursor-pointer"
                                                            >
                                                                Start <ArrowRight size={10} />
                                                            </button>
                                                        )}
                                                        {item.status === 'in_progress' && (
                                                            <button
                                                                onClick={() => handleCompleteTask(item._id)}
                                                                className="text-[10px] font-bold tracking-wider uppercase bg-success/10 text-success px-2 py-1 rounded-md flex items-center gap-1 hover:bg-success hover:text-white transition-colors cursor-pointer"
                                                            >
                                                                Mark Done ✓
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>

                </div>
            </main>
        </motion.div>
    );
};

export default PlannerView;
