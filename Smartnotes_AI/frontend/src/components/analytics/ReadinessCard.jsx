import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target, TrendingUp, TrendingDown, Minus,
    AlertTriangle, CheckCircle, Lightbulb,
    ChevronDown, ChevronUp, Zap, BarChart2
} from 'lucide-react';
import api from '../../api/axios';

/* ─── Colour helpers ──────────────────────────────────── */
const scoreColor = (score) => {
    if (score >= 80) return { text: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' };
    if (score >= 55) return { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' };
    return { text: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' };
};

const confidenceBadge = {
    High:   { bg: 'bg-emerald-100',  text: 'text-emerald-700',  label: '✦ High Confidence'   },
    Medium: { bg: 'bg-amber-100',    text: 'text-amber-700',    label: '◆ Medium Confidence' },
    Low:    { bg: 'bg-red-100',      text: 'text-red-700',      label: '⚠ Low Confidence'    },
};

/* ─── Animated circular ring ─────────────────────────── */
const ReadinessRing = ({ score }) => {
    const R = 52;
    const circ = 2 * Math.PI * R;
    const offset = circ - (score / 100) * circ;
    const col = scoreColor(score);

    return (
        <div className="relative w-36 h-36 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                {/* Track */}
                <circle cx="60" cy="60" r={R} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                {/* Progress */}
                <motion.circle
                    cx="60" cy="60" r={R}
                    fill="none"
                    stroke={col.text}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.6, ease: 'easeOut' }}
                />
                <defs>
                    <filter id="glow-readiness">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    className="text-3xl font-black"
                    style={{ color: col.text }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                >
                    {score}
                </motion.span>
                <span className="text-xs font-bold text-slate-400 tracking-wide">/ 100</span>
            </div>
        </div>
    );
};

/* ─── Mini progress bar ──────────────────────────────── */
const MiniBar = ({ label, value, color }) => (
    <div className="mb-2">
        <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>{label}</span><span>{value}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
            <motion.div
                className="h-1.5 rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 1.0, ease: 'easeOut', delay: 0.2 }}
            />
        </div>
    </div>
);

/* ─── Main Component ─────────────────────────────────── */
const ReadinessCard = ({ onReadinessLoaded }) => {
    const [data, setData]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [error, setError]       = useState(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get('/analytics/readiness');
                setData(res.data);
                if (onReadinessLoaded) onReadinessLoaded(res.data);
            } catch (err) {
                console.error('[ReadinessCard] fetch error', err);
                setError('Unable to load readiness score.');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    /* ── Loading skeleton ─────────────────────────────── */
    if (loading) {
        return (
            <div className="glass-panel p-6 animate-pulse space-y-4">
                <div className="h-5 w-1/2 bg-slate-200 rounded" />
                <div className="w-36 h-36 bg-slate-100 rounded-full mx-auto" />
                <div className="space-y-2">
                    <div className="h-3 w-full bg-slate-100 rounded" />
                    <div className="h-3 w-2/3 bg-slate-100 rounded" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="glass-panel p-6 border border-red-200">
                <p className="text-red-500 text-sm font-medium">{error || 'No readiness data.'}</p>
            </div>
        );
    }

    const col     = scoreColor(data.overallReadiness);
    const badge   = confidenceBadge[data.confidenceLevel] || confidenceBadge.Medium;
    const TrendIcon = data.weeklyDelta > 0 ? TrendingUp : data.weeklyDelta < 0 ? TrendingDown : Minus;
    const trendColor = data.weeklyDelta > 0 ? '#22c55e' : data.weeklyDelta < 0 ? '#ef4444' : '#94a3b8';

    return (
        <motion.section
            id="readiness-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 relative overflow-hidden"
            style={{ border: `1px solid ${col.border}`, background: `linear-gradient(135deg, ${col.bg} 0%, rgba(255,255,255,0) 60%)` }}
        >
            {/* BG blob */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-3xl opacity-30 pointer-events-none"
                style={{ backgroundColor: col.text }} />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
                    <Target size={20} style={{ color: col.text }} />
                    Exam Readiness Score
                </h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${badge.bg} ${badge.text}`}>
                    {badge.label}
                </span>
            </div>

            {/* Ring */}
            <ReadinessRing score={data.overallReadiness} />

            {/* Trend */}
            <div className="flex items-center justify-center gap-2 mt-3 mb-5">
                <TrendIcon size={14} style={{ color: trendColor }} />
                <span className="text-xs font-bold" style={{ color: trendColor }}>
                    {data.improvementTrend}
                </span>
            </div>

            {/* Score components mini-bars */}
            <div className="bg-white/50 rounded-2xl p-4 border border-white/60 mb-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                    <BarChart2 size={12} /> Score Breakdown
                </p>
                <MiniBar label="Quiz Performance"    value={data.components?.quizPerformance    ?? 0} color="#8b5cf6" />
                <MiniBar label="Revision Completion" value={data.components?.revisionCompletion ?? 0} color="#06b6d4" />
                <MiniBar label="Study Consistency"   value={data.components?.studyConsistency   ?? 0} color="#f59e0b" />
                <MiniBar label="Strong Topic Ratio"  value={data.components?.strongTopicRatio   ?? 0} color="#22c55e" />
                <MiniBar label="Weak Topic Penalty"  value={data.components?.weakTopicPenalty   ?? 0} color="#ef4444" />
            </div>

            {/* Critical weak topic */}
            {data.criticalWeakTopic && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 mb-4">
                    <AlertTriangle size={14} className="text-red-500 shrink-0" />
                    <p className="text-xs font-semibold text-red-700">
                        Critical: <span className="font-black">{data.criticalWeakTopic}</span> needs immediate attention
                    </p>
                </div>
            )}

            {/* AI Insights toggle */}
            {data.insights?.length > 0 && (
                <div>
                    <button
                        id="readiness-insights-toggle"
                        onClick={() => setExpanded(v => !v)}
                        className="flex items-center justify-between w-full text-left text-sm font-bold text-slate-700 mb-2 hover:text-primary transition-colors"
                    >
                        <span className="flex items-center gap-1">
                            <Lightbulb size={14} className="text-amber-500" />
                            AI Insights ({data.insights.length})
                        </span>
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <AnimatePresence>
                        {expanded && (
                            <motion.ul
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden space-y-2"
                            >
                                {data.insights.map((ins, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.08 }}
                                        className="flex items-start gap-2 text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-xl p-3"
                                    >
                                        <Zap size={12} className="text-amber-500 shrink-0 mt-0.5" />
                                        {ins}
                                    </motion.li>
                                ))}
                            </motion.ul>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Next Best Action influenced by readiness */}
            {data.nextBestActionEnhanced && (
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/20">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Zap size={12} /> Next Best Action
                    </p>
                    <p className="font-bold text-slate-800 text-sm mb-1">{data.nextBestActionEnhanced.action}</p>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Current: {data.nextBestActionEnhanced.readiness}%</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            +{data.nextBestActionEnhanced.estimatedImprovement}% improvement
                        </span>
                    </div>
                </div>
            )}
        </motion.section>
    );
};

export default ReadinessCard;
