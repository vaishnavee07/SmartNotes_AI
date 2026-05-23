import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Home, BookOpen, Layers, Target, LogOut, Brain, FileText, Flame } from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', icon: Home, path: '/dashboard' },
        { name: 'Study Notes', icon: BookOpen, path: '/study' },
        { name: 'Flashcards', icon: Layers, path: '/flashcards' },
        { name: 'Quizzes', icon: Target, path: '/quizzes' },
        { name: 'Question Papers', icon: FileText, path: '/question-paper' },
    ];

    return (
        <div className="w-64 h-screen glass-panel rounded-none border-r border-white/40 flex flex-col fixed left-0 top-0 bg-white/40 z-50">
            <div className="p-6 flex items-center gap-3 border-b border-white/20">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-secondary to-tertiary p-0.5 shadow-lg shadow-primary/20 animate-pulse-glow">
                    <div className="w-full h-full bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center text-primary">
                        <Brain size={28} className="animate-float" />
                    </div>
                </div>
                <div>
                    <h2 className="font-display font-bold text-xl text-slate-900 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">SmartNotes</h2>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">AI Platform</span>
                </div>
            </div>

            <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) =>
                            `group flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 font-medium ${isActive
                                ? 'bg-white/60 text-slate-900 shadow-sm border border-white/60 backdrop-blur-md'
                                : 'text-slate-600 hover:bg-white/40 hover:text-slate-900 hover:shadow-sm border border-transparent backdrop-blur-sm'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30 scale-105' : 'bg-white text-slate-400 group-hover:text-primary group-hover:scale-110 group-hover:shadow-md'}`}>
                                    <item.icon size={20} />
                                </div>
                                <span className={isActive ? 'font-bold' : ''}>{item.name}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>

            <div className="p-4 border-t border-white/20">
                <div className="glass-panel rounded-2xl p-4 mb-4 border border-white/50 hover:shadow-lg transition-all duration-300 group cursor-default relative overflow-hidden">
                    {/* Background blob for card */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>

                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                L{user?.level ?? 1}
                            </div>
                            <span className="text-xs text-slate-700 font-bold">Level {user?.level ?? 1}</span>
                        </div>
                        <div className="flex items-center gap-1 text-tertiary">
                            <Flame size={14} className="animate-fire-pulse" fill="#f97316" />
                            <span className="text-xs font-bold text-slate-700">{user?.streak || 0}</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-end mb-1 relative z-10">
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Experience</span>
                        <span className="text-xs font-bold text-primary">
                            {user?.currentXP ?? (user?.xp || 0) % 100}
                            <span className="text-slate-400 font-normal">/100 XP</span>
                        </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-white/50 relative z-10 shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-primary via-secondary to-tertiary rounded-full transition-all duration-1000 relative"
                            style={{ width: `${user?.currentXP ?? (user?.xp || 0) % 100}%`, backgroundSize: '200% 200%' }}
                        >
                            <div className="absolute top-0 right-0 bottom-0 left-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+Cjwvc3ZnPg==')] opacity-30 animate-pulse-slow"></div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="group flex items-center gap-3 px-4 py-3 w-full text-left text-slate-600 hover:text-error hover:bg-white/50 rounded-2xl transition-all duration-300 font-medium border border-transparent hover:border-error/20 hover:shadow-sm"
                >
                    <div className="p-2 rounded-xl bg-white text-slate-400 group-hover:text-error group-hover:bg-error/10 transition-colors">
                        <LogOut size={20} />
                    </div>
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
