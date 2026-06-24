import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle, TrendingUp } from 'lucide-react';
import api from '../../../api/axios';

const TopicPerformanceWidget = () => {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTopics = async () => {
            try {
                const res = await api.get('/analytics/topics');
                setTopics(res.data);
            } catch (err) {
                console.error('Failed to fetch topics', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTopics();
    }, []);

    if (loading) {
        return (
            <div className="glass-panel p-6 animate-pulse">
                <div className="h-6 w-1/3 bg-slate-200 rounded mb-4"></div>
                <div className="space-y-3">
                    <div className="h-16 w-full bg-slate-100 rounded"></div>
                    <div className="h-16 w-full bg-slate-100 rounded"></div>
                </div>
            </div>
        );
    }

    if (topics.length === 0) {
        return null; // Hide if no data
    }

    const weakTopics = topics.filter(t => t.strength === 'Weak');
    const mediumTopics = topics.filter(t => t.strength === 'Medium');
    const strongTopics = topics.filter(t => t.strength === 'Strong');

    return (
        <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-6 flex flex-col h-full"
        >
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp size={20} className="text-primary" />
                    Topic Performance
                </h2>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                
                {weakTopics.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <AlertTriangle size={14} className="text-error" /> Needs Attention
                        </h3>
                        <div className="space-y-3">
                            {weakTopics.map(topic => (
                                <TopicCard key={topic._id} topic={topic} colorClass="error" />
                            ))}
                        </div>
                    </div>
                )}

                {mediumTopics.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <Info size={14} className="text-[#D4AF37]" /> On Track
                        </h3>
                        <div className="space-y-3">
                            {mediumTopics.map(topic => (
                                <TopicCard key={topic._id} topic={topic} colorClass="[#D4AF37]" isHex />
                            ))}
                        </div>
                    </div>
                )}

                {strongTopics.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <CheckCircle size={14} className="text-success" /> Mastered
                        </h3>
                        <div className="space-y-3">
                            {strongTopics.map(topic => (
                                <TopicCard key={topic._id} topic={topic} colorClass="success" />
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </motion.section>
    );
};

const TopicCard = ({ topic, colorClass, isHex }) => {
    // Dynamic Tailwind classes
    const bgClass = isHex ? `bg-[#D4AF37]/10` : `bg-${colorClass}/10`;
    const borderClass = isHex ? `border-[#D4AF37]/20` : `border-${colorClass}/20`;
    const textClass = isHex ? `text-[#D4AF37]` : `text-${colorClass}`;
    
    // Progress bar color
    const progressColor = isHex ? '#D4AF37' : (colorClass === 'error' ? '#ef4444' : '#22c55e');

    return (
        <div className={`p-4 rounded-xl border ${bgClass} ${borderClass} transition-transform hover:-translate-y-0.5`}>
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-800">{topic.topic}</h4>
                <span className={`text-xs font-bold ${textClass}`}>
                    {Math.round(topic.averageScore)}%
                </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-white/50 rounded-full h-1.5 mb-3">
                <div 
                    className="h-1.5 rounded-full" 
                    style={{ width: `${Math.min(topic.averageScore, 100)}%`, backgroundColor: progressColor }}
                ></div>
            </div>

            {topic.recommendation && (
                <p className="text-[11px] font-medium text-slate-600 bg-white/40 p-2 rounded-lg border border-white/60">
                    💡 {topic.recommendation}
                </p>
            )}
        </div>
    );
};

export default TopicPerformanceWidget;
