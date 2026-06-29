import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import { Flame, Trophy, Award, Clock, ArrowUpRight, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import TopicPerformanceWidget from '../components/analytics/TopicPerformanceWidget';
import NextBestActionWidget from '../components/analytics/NextBestActionWidget';
import ReadinessCard from '../components/analytics/ReadinessCard';
import { Link } from 'react-router-dom';

const FALLBACK_CHART = [
    { day: 'Mon', minutes: 0 },
    { day: 'Tue', minutes: 0 },
    { day: 'Wed', minutes: 0 },
    { day: 'Thu', minutes: 0 },
    { day: 'Fri', minutes: 0 },
    { day: 'Sat', minutes: 0 },
    { day: 'Sun', minutes: 0 },
];

const Dashboard = () => {
    const { user, updateGamificationStats } = useContext(AuthContext);
    const [latestRoadmap, setLatestRoadmap] = useState(null);
    const navigate = useNavigate();
    const [activityData, setActivityData] = useState(FALLBACK_CHART);
    const [studyHoursThisWeek, setStudyHoursThisWeek] = useState(0);
    const [todayMinutes, setTodayMinutes] = useState(0);
    const [todayLabel, setTodayLabel] = useState('0 min');
    const [progressData, setProgressData] = useState({
        topicsCompleted: 0,
        quizAverage: 0,
        revisionCompletion: 0,
        readinessScore: 0,
        readinessLabel: 'Loading...'
    });

    // Safe date formatter
    const safeFormatDate = (dateVal) => {
        if (!dateVal) return 'No date set';
        try {
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return 'No date set';
            return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch { return 'No date set'; }
    };

    useEffect(() => {
        updateGamificationStats();
        const fetchRoadmap = async () => {
            try {
                const res = await api.get('/planner');
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setLatestRoadmap(res.data[0]); // backend sorts -createdAt
                }
            } catch (err) {
                console.error(err);
            }
        };
        const fetchSessionStats = async () => {
            try {
                const [weeklyRes, todayRes, progressRes] = await Promise.all([
                    api.get('/activity/weekly'),
                    api.get('/activity/today'),
                    api.get('/analytics/progress')
                ]);
                if (weeklyRes.data && weeklyRes.data.length > 0) {
                    setActivityData(weeklyRes.data);
                }
                const mins = todayRes.data.totalMinutesToday || 0;
                setTodayMinutes(mins);
                setTodayLabel(todayRes.data.label || (mins >= 60
                    ? `${Math.floor(mins / 60)} hr ${mins % 60 > 0 ? `${mins % 60} min` : ''}`
                    : `${mins} min`));
                setProgressData(progressRes.data);
            } catch (err) {
                console.error('Session stats error:', err);
            }
        };
        fetchRoadmap();
        fetchSessionStats();
    }, []);

    // Calculate XP percentage
    const xpPercentage = ((user?.xp || 0) % 100) / 100;
    const circumference = 2 * Math.PI * 36;
    const strokeDashoffset = circumference - xpPercentage * circumference;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex min-h-screen text-slate-800"
        >
            <Sidebar />

            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <header className="mb-10 animate-fade-in relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
                    <div className="absolute top-20 right-40 w-48 h-48 bg-secondary/10 rounded-full blur-3xl -z-10 animate-blob"></div>
                    <h1 className="text-5xl font-display font-bold mb-3 tracking-tight">Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">{user?.name?.split(' ')[0]}</span>! 👋</h1>
                    <p className="text-slate-500 font-medium text-lg">Here's your study progress and AI generated plan.</p>
                </header>

                {/* Stats Grid - Top Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <StatCard
                        icon={<Target size={28} className="text-white" />}
                        title="Readiness Score"
                        value={`${progressData.readinessScore}/100`}
                        subtitle={progressData.readinessLabel}
                        gradient="from-emerald-400 to-teal-500"
                        delay={0.1}
                    />
                    <StatCard
                        icon={<Trophy size={28} className="text-white" />}
                        title="Quiz Average"
                        value={`${progressData.quizAverage}%`}
                        subtitle="Across all topics"
                        gradient="from-blue-400 to-indigo-500"
                        delay={0.2}
                    />
                    <StatCard
                        icon={<Flame size={28} className="text-white" />}
                        title="Study Streak"
                        value={`${user?.streak || 0} Days`}
                        subtitle="Keep the fire burning!"
                        gradient="from-orange-400 to-red-500"
                        delay={0.3}
                    />
                    <StatCard
                        icon={<Clock size={28} className="text-white" />}
                        title="Study Time"
                        value={todayLabel}
                        subtitle="Today"
                        gradient="from-fuchsia-400 to-purple-500"
                        delay={0.4}
                    />
                </div>

                {/* Stats Grid - Bottom Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <StatCard
                        icon={<Award size={28} className="text-white" />}
                        title="Topics Completed"
                        value={progressData.topicsCompleted}
                        subtitle="Mastered & learned"
                        gradient="from-indigo-400 to-cyan-500"
                        delay={0.5}
                    />
                    <StatCard
                        icon={<ArrowUpRight size={28} className="text-white" />}
                        title="Revision Completion"
                        value={`${progressData.revisionCompletion}%`}
                        subtitle="Based on roadmap goals"
                        gradient="from-rose-400 to-pink-500"
                        delay={0.6}
                    />
                    {/* Unique XP Circular Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="glass-panel p-6 flex items-center justify-between group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div>
                            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Total XP</p>
                            <h3 className="text-3xl font-display font-bold text-slate-900">{user?.xp || 0}</h3>
                            <span className="text-xs font-bold text-secondary mt-1 block">Level {user?.level || 1}</span>
                        </div>
                        <div className="relative w-20 h-20">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="40" cy="40" r="36" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                                <motion.circle
                                    cx="40" cy="40" r="36" fill="transparent"
                                    stroke="url(#gradient-xp)" strokeWidth="8"
                                    strokeDasharray={circumference}
                                    initial={{ strokeDashoffset: circumference }}
                                    animate={{ strokeDashoffset }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    strokeLinecap="round"
                                />
                                <defs>
                                    <linearGradient id="gradient-xp" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#8B5CF6" />
                                        <stop offset="100%" stopColor="#EC4899" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Trophy size={20} className="text-primary animate-pulse-glow" />
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Content Modules */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    <div className="col-span-2 space-y-8">
                        {/* Productivity Graph */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="glass-panel p-6"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-display font-bold">Productivity Trend</h2>
                                <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">
                                    This Week (Mon–Sun)
                                </span>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} unit=" m" />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                                            cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '5 5' }}
                                            formatter={(value) => [`${value} min`, 'Study Time']}
                                        />
                                        <Area type="monotone" dataKey="minutes" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.section>

                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="glass-panel p-6"
                        >
                            <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
                                Today's Roadmap
                            </h2>
                            {!latestRoadmap ? (
                                <div className="text-center py-12 bg-white/40 rounded-3xl border border-dashed border-primary/30 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                                        <Target size={32} />
                                    </div>
                                    <p className="text-slate-600 font-medium mb-4 relative z-10">No roadmap yet. Generate one in AI Planner.</p>
                                    <button onClick={() => navigate('/planner')} className="btn-primary inline-flex text-sm relative z-10 shadow-primary/30 shadow-lg">Create AI Plan</button>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{latestRoadmap.subject || 'Study Roadmap'}</h4>
                                            <p className="text-xs text-slate-500">Exam: {safeFormatDate(latestRoadmap.examDate)}</p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/planner')}
                                            className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                                        >
                                            Open Full Roadmap <ArrowUpRight size={12} />
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-56 overflow-y-auto">
                                        {latestRoadmap.plan?.slice(0, 5).map((item, i) => (
                                            <div
                                                key={item._id || i}
                                                onClick={() => navigate('/planner')}
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${item.status === 'completed' ? 'bg-success/5 border-success/20' :
                                                    item.status === 'in_progress' ? 'bg-primary/5 border-primary/20' :
                                                        'bg-white/60 border-white/60 hover:border-primary/30'
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-[10px] font-black ${item.status === 'completed' ? 'bg-success text-white' :
                                                    item.status === 'in_progress' ? 'bg-primary text-white' :
                                                        'bg-slate-100 text-slate-500'
                                                    }`}>{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                                        {item.topics?.join(', ') || `Day ${i + 1}`}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{item.hours}h · {item.day}</p>
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0 ${item.status === 'completed' ? 'bg-success/10 text-success' :
                                                    item.status === 'in_progress' ? 'bg-primary/10 text-primary' :
                                                        'bg-slate-100 text-slate-400'
                                                    }`}>
                                                    {item.status === 'completed' ? '✓ Done' : item.status === 'in_progress' ? '⚡ Active' : 'Pending'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.section>
                    </div>

                    <div className="space-y-8">
                        {/* Exam Readiness Compact Link */}
                        <motion.section 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 }}
                            className="glass-panel p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative overflow-hidden group cursor-pointer shadow-xl shadow-indigo-500/20"
                            onClick={() => navigate('/exam-readiness')}
                        >
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors duration-500"></div>
                            
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4 border border-white/30 group-hover:scale-110 transition-transform duration-500">
                                    <Target size={32} className="text-white" />
                                </div>
                                <h3 className="font-display font-bold text-2xl mb-1">Exam Readiness</h3>
                                <div className="flex items-end gap-2 mb-4 justify-center">
                                    <span className="text-4xl font-black">{progressData?.readinessScore || 0}</span>
                                    <span className="text-white/70 text-sm font-bold pb-1">/ 100</span>
                                </div>
                                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition-colors">
                                    View Detailed Analysis <ArrowUpRight size={14} />
                                </div>
                            </div>
                        </motion.section>

                        {/* Next Best Action Widget */}
                        <NextBestActionWidget />

                        {/* Topic Performance Widget */}
                        <TopicPerformanceWidget />

                        {/* Badges Earned */}
                        <motion.section
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 }}
                            className="glass-panel p-6"
                        >
                            <h2 className="text-xl font-display font-bold mb-5 flex items-center gap-2">
                                <span className="w-2 h-6 rounded-full bg-[#D4AF37] block"></span>
                                Recent Badges
                            </h2>
                            {user?.badges?.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {user.badges.slice(0, 4).map((badge, i) => (
                                        <motion.div
                                            whileHover={{ scale: 1.05, y: -5 }}
                                            key={badge}
                                            className="flex flex-col items-center p-4 bg-gradient-to-b from-white/80 to-white/40 rounded-2xl border border-[#D4AF37]/30 shadow-sm hover:shadow-lg hover:shadow-[#D4AF37]/20 transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <Award className="text-[#D4AF37]" size={24} />
                                            </div>
                                            <span className="text-sm font-bold text-center text-slate-800">{badge}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-300">
                                        <Award size={32} />
                                    </div>
                                    <p className="text-slate-500 font-medium text-sm">Complete quizzes and study notes to earn badges!</p>
                                </div>
                            )}
                        </motion.section>
                    </div>

                </div>

            </main>
        </motion.div>
    );
};

const StatCard = ({ icon, title, value, subtitle, gradient, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="glass-panel p-6 overflow-hidden relative group"
    >
        <div className={`absolute -right-6 -top-6 w-28 h-28 opacity-20 rounded-full bg-gradient-to-br ${gradient} blur-2xl group-hover:blur-3xl group-hover:opacity-40 transition-all duration-500 group-hover:scale-150`} />

        <div className="flex justify-between items-start mb-6 relative z-10">
            <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg shadow-current/30 text-white group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
        </div>
        <div className="relative z-10">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-4xl font-display font-extrabold text-slate-900 mb-1">{value}</h3>
            <span className="text-xs font-bold text-slate-400 block">{subtitle}</span>
        </div>
    </motion.div>
);

export default Dashboard;
