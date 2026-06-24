import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, AlertTriangle, Zap, TrendingUp, Award, Brain } from 'lucide-react';
import api from '../../api/axios';

/* ─── Colour for score ────────────────────────────────── */
const scoreGradient = (score) => {
    if (score >= 80) return 'from-emerald-400 to-teal-500';
    if (score >= 55) return 'from-amber-400 to-orange-500';
    return 'from-red-400 to-rose-500';
};

const scoreText = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 55) return '#f59e0b';
    return '#ef4444';
};

/* ─── Animated score counter ─────────────────────────── */
const CountUp = ({ target, duration = 1500 }) => {
    const [value, setValue] = useState(0);

    useEffect(() => {
        const start = Date.now();
        const timer = setInterval(() => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress >= 1) clearInterval(timer);
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);

    return <>{value}</>;
};

/* ─── Main component ─────────────────────────────────── */
const HackathonDemoCard = () => {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/analytics/readiness')
            .then(res => setData(res.data))
            .catch(err => console.error('[HackathonDemoCard]', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="glass-panel p-8 animate-pulse">
                <div className="h-8 w-1/3 bg-slate-200 rounded mb-6" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-slate-100 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    // Fallback demo data when no real data exists yet
    const demo = data?.hackathonSummary || {
        currentReadiness:    0,
        weakestTopic:        'No topics yet',
        recommendedAction:   'Take your first quiz',
        predictedImprovement: '+5%'
    };

    const insights = data?.insights || ['Start quizzing to generate AI insights.'];
    const readiness = data?.overallReadiness ?? 0;

    const tiles = [
        {
            id: 'demo-readiness',
            icon: <Brain size={28} className="text-white" />,
            label: 'Current Readiness',
            value: <><CountUp target={readiness} />%</>,
            gradient: `bg-gradient-to-br ${scoreGradient(readiness)}`,
            sub: data?.confidenceLevel ? `${data.confidenceLevel} Confidence` : '—'
        },
        {
            id: 'demo-weak-topic',
            icon: <AlertTriangle size={28} className="text-white" />,
            label: 'Weakest Topic',
            value: demo.weakestTopic,
            gradient: 'bg-gradient-to-br from-rose-400 to-pink-600',
            sub: 'Needs attention now',
            small: true
        },
        {
            id: 'demo-action',
            icon: <Zap size={28} className="text-white" />,
            label: 'Recommended Action',
            value: demo.recommendedAction,
            gradient: 'bg-gradient-to-br from-violet-500 to-purple-700',
            sub: 'AI-powered suggestion',
            small: true
        },
        {
            id: 'demo-improvement',
            icon: <TrendingUp size={28} className="text-white" />,
            label: 'Predicted Improvement',
            value: demo.predictedImprovement,
            gradient: 'bg-gradient-to-br from-emerald-400 to-cyan-500',
            sub: 'After completing action'
        }
    ];

    return (
        <motion.section
            id="hackathon-demo-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-panel p-6 md:p-8 relative overflow-hidden"
        >
            {/* Decorative background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent pointer-events-none" />
            <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 mb-8 relative z-10">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-secondary">
                    <Rocket size={20} className="text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-display font-bold text-slate-800">
                        🏆 Hackathon Demo — Exam Readiness Engine
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">AI-powered readiness prediction at a glance</p>
                </div>
                <span className="ml-auto text-xs font-bold bg-gradient-to-r from-primary to-secondary text-white px-4 py-1.5 rounded-full shadow-lg shadow-primary/30">
                    LIVE DATA
                </span>
            </div>

            {/* 4-tile grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 relative z-10">
                {tiles.map((tile, i) => (
                    <motion.div
                        key={tile.id}
                        id={tile.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ scale: 1.03, y: -4 }}
                        className={`${tile.gradient} rounded-2xl p-5 text-white shadow-xl relative overflow-hidden`}
                    >
                        {/* Shine overlay */}
                        <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-20 transition-opacity" />
                        <div className="mb-3">{tile.icon}</div>
                        <p className="text-white/70 text-xs font-bold uppercase tracking-wide mb-1">{tile.label}</p>
                        <p className={`font-black leading-tight ${tile.small ? 'text-lg' : 'text-3xl'}`}>{tile.value}</p>
                        <p className="text-white/60 text-xs mt-1">{tile.sub}</p>
                    </motion.div>
                ))}
            </div>

            {/* AI Insights row */}
            <div className="relative z-10">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Award size={14} className="text-amber-500" /> AI-Generated Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.slice(0, 4).map((insight, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.08 }}
                            className="flex items-start gap-2 p-3 rounded-xl bg-white/60 border border-white/80 text-sm text-slate-700 backdrop-blur-sm shadow-sm"
                        >
                            <span className="text-lg shrink-0">
                                {i === 0 ? '⚠️' : i === 1 ? '🎯' : i === 2 ? '📈' : '💡'}
                            </span>
                            <span className="font-medium leading-snug">{insight}</span>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Topic readiness list (top + bottom) */}
            {data?.topicReadiness?.length > 0 && (
                <div className="mt-6 relative z-10">
                    <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Topic Readiness Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {data.topicReadiness.slice(0, 6).map((t, i) => {
                            const pct = t.readiness;
                            const col = pct >= 80 ? '#22c55e' : pct >= 55 ? '#f59e0b' : '#ef4444';
                            return (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/50 border border-white/60">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between text-xs font-bold mb-1">
                                            <span className="text-slate-700 truncate">{t.topic}</span>
                                            <span style={{ color: col }}>{pct}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <motion.div
                                                className="h-2 rounded-full"
                                                style={{ backgroundColor: col }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold shrink-0 px-2 py-0.5 rounded-md"
                                        style={{ background: `${col}20`, color: col }}>
                                        {t.strength}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </motion.section>
    );
};

export default HackathonDemoCard;
