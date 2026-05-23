import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Brain, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "667734014582-eipct5crqi498svbkb462a5m303m09pr.apps.googleusercontent.com";

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login, loginWithGoogle } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError('Invalid credentials. Please try again.');
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            await loginWithGoogle(credentialResponse.credential);
            navigate('/dashboard');
        } catch (err) {
            setError('Google login failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-sans text-slate-800">
            {/* Left Panel */}
            <div className="w-full lg:w-[55%] flex flex-col p-8 sm:p-12 md:p-16 lg:px-24 xl:px-32 relative min-h-screen justify-center overflow-y-auto">
                <div className="w-full max-w-md mx-auto">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 mb-16">
                        <div className="bg-[#6c5dd3] text-white p-2.5 rounded-xl flex items-center justify-center shadow-lg">
                            <Brain size={22} className="text-white" />
                        </div>
                        <span className="font-display font-bold text-xl text-slate-800 tracking-tight">Smartnotes AI</span>
                    </Link>

                    <h1 className="text-3xl sm:text-[34px] font-display font-medium mb-4 tracking-tight text-slate-900 leading-tight">Welcome Back!</h1>
                    <p className="text-slate-500 font-medium mb-10 text-[15px] leading-relaxed pr-8">
                        Sign in to access your dashboard and continue optimizing your study process.
                    </p>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 flex items-center gap-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5dd3]/20 focus:border-[#6c5dd3] transition-all placeholder:text-slate-400 font-medium"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2 relative">
                            <label className="block text-sm font-semibold text-slate-700">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5dd3]/20 focus:border-[#6c5dd3] transition-all placeholder:text-slate-400 font-medium"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                    outline="none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="flex justify-end pt-1">
                                <a href="#" className="text-[13px] font-bold text-[#6c5dd3] hover:text-[#5a4bbf] transition-colors">Forgot Password?</a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-[#6c5dd3] hover:bg-[#5a4bbf] text-white rounded-xl font-semibold text-[15px] transition-colors shadow-lg shadow-[#6c5dd3]/20 mt-2"
                        >
                            Sign In
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
                                    onError={() => setError('Google Login Failed')}
                                    useOneTap
                                    context="signin"
                                    shape="pill"
                                    theme="outline"
                                    text="continue_with"
                                    size="large"
                                    width="350px"
                                />
                            </GoogleOAuthProvider>
                        </div>

                        <button type="button" onClick={() => alert("Apple login requires domain verification and is currently unavailable locally.")} className="w-[350px] mx-auto py-[10px] bg-white border border-slate-300 rounded-full font-medium text-[14px] text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-3 transition-all shadow-sm focus:outline-none">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.09 2.31-.86 3.59-.8 1.54.08 2.8.69 3.69 1.9-3.32 1.96-2.8 5.92.51 7.15-.75 1.76-1.55 3.36-2.87 3.92zm-5.61-13.6c-.22-2.48 2.02-4.66 4.49-4.59.3 2.59-2.39 4.88-4.49 4.59z" />
                            </svg>
                            Continue with Apple
                        </button>
                    </div>

                    <p className="mt-10 text-center text-[14px] font-medium text-slate-600">
                        Don't have an Account? <Link to="/register" className="text-[#0f4c5c] hover:underline font-bold transition-colors">Sign Up</Link>
                    </p>
                </div>
            </div>

            {/* Right Panel */}
            <div className="hidden lg:flex w-[45%] bg-violet-600 text-white p-16 flex-col justify-center relative overflow-hidden bg-gradient-to-br from-indigo-400 via-violet-600 to-purple-800">
                {/* Decoration blobs */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-400 rounded-full blur-[120px] opacity-30 -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-900 rounded-full blur-[100px] opacity-70 translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>

                <div className="relative z-10 max-w-lg mx-auto w-full">
                    <h2 className="text-[40px] leading-[1.2] font-display font-medium mb-12 text-white/95 tracking-tight">
                        Revolutionize your learning with Smarter Automation
                    </h2>

                    <div className="relative mb-14">
                        <div className="absolute -top-6 -left-4 text-7xl font-serif text-white/20 select-none">"</div>
                        <p className="text-[18px] leading-[1.8] font-normal text-white/80 relative z-10 pl-2">
                            Smartnotes AI has completely transformed our study process. It's reliable, efficient, and ensures our grades are always top-notch.
                        </p>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default Login;
