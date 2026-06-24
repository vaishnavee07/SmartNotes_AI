import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Clock, ArrowRight, TrendingUp } from 'lucide-react';
import api from '../../api/axios';

const NextBestActionWidget = () => {
    const [action, setAction]         = useState(null);
    const [readiness, setReadiness]   = useState(null);
    const [loading, setLoading]       = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [actionRes, readinessRes] = await Promise.allSettled([
                    api.get('/analytics/next-best-action'),
                    api.get('/analytics/readiness')
                ]);
                if (actionRes.status === 'fulfilled')   setAction(actionRes.value.data);
                if (readinessRes.status === 'fulfilled') setReadiness(readinessRes.value.data);
            } catch (err) {
                console.error('Failed to fetch next best action', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) {
        return (
            <div className="glass-panel p-6 animate-pulse">
                <div className="h-6 w-1/3 bg-slate-200 rounded mb-4"></div>
                <div className="h-10 w-full bg-slate-100 rounded mb-2"></div>
                <div className="h-4 w-2/3 bg-slate-100 rounded"></div>
            </div>
        );
    }

    if (!action || !action.topic) {
        return null; // Hide if no data yet
    }

    // Readiness influence on estimated improvement
    const estimatedImprovement = readiness?.nextBestActionEnhanced?.estimatedImprovement;

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 bg-gradient-to-br from-primary/10 to-transparent relative overflow-hidden group border border-primary/20"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -z-10 group-hover:bg-primary/30 transition-colors duration-500"></div>
            
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles size={20} className="text-primary" />
                    Next Best Action
                </h2>
                <span className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    <Clock size={12} /> {action.estimatedTime}
                </span>
            </div>

            {/* Readiness context bar */}
            {readiness && (
                <div className="flex items-center justify-between mb-3 p-2.5 rounded-xl bg-white/50 border border-white/60">
                    <span className="text-xs text-slate-500 font-semibold">Current Readiness</span>
                    <span className="text-sm font-black text-primary">{readiness.overallReadiness}%</span>
                </div>
            )}

            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/60 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{action.action}</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed mb-4">
                    {action.reason}
                </p>

                {/* Score improvement badge */}
                {estimatedImprovement && (
                    <div className="flex items-center gap-2 mb-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                        <TrendingUp size={14} className="text-emerald-500 shrink-0" />
                        <span className="text-xs font-bold text-emerald-700">
                            Estimated Score Improvement: <span className="text-emerald-600">+{estimatedImprovement}%</span>
                        </span>
                    </div>
                )}
                
                <button
                    id="next-best-action-start-btn"
                    className="btn-primary w-full flex items-center justify-center gap-2 text-sm shadow-primary/30 shadow-lg group"
                >
                    Start Now 
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </motion.section>
    );
};

export default NextBestActionWidget;
