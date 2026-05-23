import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Brain, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "667734014582-eipct5crqi498svbkb462a5m303m09pr.apps.googleusercontent.com";

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { register, loginWithGoogle } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(name, email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            await loginWithGoogle(credentialResponse.credential);
            navigate('/dashboard');
        } catch (err) {
            setError('Google registration failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center text-slate-800 px-4 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-secondary/20 blur-[120px] animate-blob" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px] animate-pulse-slow" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="w-full max-w-md glass-panel p-10 relative z-10 shadow-2xl shadow-secondary/10 border-white/60"
            >
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-secondary/10 to-transparent rounded-br-full -z-10"></div>

                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                        transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                        className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-secondary to-tertiary text-white mb-6 shadow-lg shadow-secondary/30"
                    >
                        <Brain size={40} className="animate-float" />
                    </motion.div>
                    <h1 className="text-4xl font-display font-bold text-slate-900 mb-3 tracking-tight">Join SmartNotes</h1>
                    <p className="text-slate-500 font-medium">Supercharge your learning with AI</p>
                </div>

                {error && (
                    <motion.div initial={{ opacity: 0, h: 0 }} animate={{ opacity: 1, h: 'auto' }} className="mb-6 p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-sm text-center font-bold flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Full Name</label>
                        <input
                            type="text"
                            className="input-field bg-white/60 shadow-inner"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Email Address</label>
                        <input
                            type="email"
                            className="input-field bg-white/60 shadow-inner"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Password</label>
                        <input
                            type="password"
                            className="input-field bg-white/60 shadow-inner"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="w-full btn-primary bg-gradient-to-r from-secondary to-tertiary shadow-lg shadow-secondary/30 py-4 font-bold text-lg mt-6 group relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            Create Account
                            <UserPlus size={20} className="group-hover:scale-110 transition-transform" />
                        </span>
                    </button>
                </form>

                <div className="mt-8 flex items-center justify-between">
                    <hr className="w-full border-slate-200" />
                    <span className="p-2 text-[11px] font-bold text-slate-400 bg-white uppercase tracking-widest mx-2">OR</span>
                    <hr className="w-full border-slate-200" />
                </div>

                <div className="mt-8 space-y-4">
                    <div className="w-full flex justify-center hover:opacity-90 transition-opacity">
                        <GoogleOAuthProvider clientId={googleClientId}>
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => setError('Google Registration Failed')}
                                useOneTap
                                context="signup"
                                shape="pill"
                                theme="outline"
                                text="continue_with"
                                size="large"
                                width="350px"
                            />
                        </GoogleOAuthProvider>
                    </div>

                    <button type="button" onClick={() => alert("Apple registration requires domain verification and is currently unavailable locally.")} className="w-[350px] mx-auto py-[10px] bg-white border border-slate-300 rounded-full font-medium text-[14px] text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-3 transition-all shadow-sm focus:outline-none">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.09 2.31-.86 3.59-.8 1.54.08 2.8.69 3.69 1.9-3.32 1.96-2.8 5.92.51 7.15-.75 1.76-1.55 3.36-2.87 3.92zm-5.61-13.6c-.22-2.48 2.02-4.66 4.49-4.59.3 2.59-2.39 4.88-4.49 4.59z" />
                        </svg>
                        Continue with Apple
                    </button>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-200/50 text-center text-sm font-medium text-slate-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-secondary hover:text-primary font-bold transition-colors">
                        Sign In
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
