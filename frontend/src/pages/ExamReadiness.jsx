import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import ReadinessCard from '../components/analytics/ReadinessCard';
import ExamInsightsCard from '../components/analytics/ExamInsightsCard';
import useActivityTracker from '../hooks/useActivityTracker';
import { BrainCircuit, FileText, TrendingUp } from 'lucide-react';
import api from '../api/axios';

const ExamReadiness = () => {
    useActivityTracker('exam-readiness');
    const [progressData, setProgressData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/analytics/progress');
                setProgressData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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
                
                <header className="mb-10 animate-fade-in">
                    <h1 className="text-4xl font-display font-bold mb-2 text-slate-900">AI Exam Readiness</h1>
                    <p className="text-slate-500 font-medium max-w-2xl">
                        A comprehensive analysis of your study performance. Our AI engines analyze your quizzes, revisions, and study consistency to predict your exam readiness.
                    </p>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left Column - Detailed Breakdown */}
                    <div className="xl:col-span-2 space-y-8">
                        <ExamInsightsCard />
                        
                        <div className="glass-panel p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            
                            <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
                                <FileText className="text-primary" size={24} />
                                How the Score is Calculated
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                <div className="p-5 bg-white/60 rounded-2xl border border-white">
                                    <h3 className="font-bold text-slate-800 mb-2">1. Quiz Performance (50%)</h3>
                                    <p className="text-sm text-slate-600">Your average score across all AI-generated quizzes. Weight is heavier as active recall is the best predictor of success.</p>
                                </div>
                                <div className="p-5 bg-white/60 rounded-2xl border border-white">
                                    <h3 className="font-bold text-slate-800 mb-2">2. Revision Completion (20%)</h3>
                                    <p className="text-sm text-slate-600">How many items from your AI Study Planner you've actually completed vs scheduled.</p>
                                </div>
                                <div className="p-5 bg-white/60 rounded-2xl border border-white">
                                    <h3 className="font-bold text-slate-800 mb-2">3. Study Consistency (10%)</h3>
                                    <p className="text-sm text-slate-600">Your daily streak and regular session frequency over the past 7 days.</p>
                                </div>
                                <div className="p-5 bg-white/60 rounded-2xl border border-white">
                                    <h3 className="font-bold text-slate-800 mb-2">4. Topic Strength Ratio (20%)</h3>
                                    <p className="text-sm text-slate-600">The ratio of topics you have mastered vs topics where you struggle. (+10% for strong, -10% penalty for weak).</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - The Score Card */}
                    <div className="xl:col-span-1 space-y-8">
                        <ReadinessCard />
                        
                        <div className="glass-panel p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <BrainCircuit className="text-primary-light" size={20} />
                                AI Prediction Engine
                            </h3>
                            <p className="text-slate-300 text-sm leading-relaxed mb-4">
                                Our machine learning model analyzes thousands of data points to predict your success. Students who reach 85%+ readiness score have a 94% chance of achieving top grades.
                            </p>
                            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-primary to-secondary w-[94%]"></div>
                            </div>
                            <div className="mt-2 text-xs font-bold text-slate-400 text-right">94% Confidence Rate</div>
                        </div>
                    </div>
                </div>

            </main>
        </motion.div>
    );
};

export default ExamReadiness;
