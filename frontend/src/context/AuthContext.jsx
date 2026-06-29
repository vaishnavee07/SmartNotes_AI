import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await api.get('/auth/me');
                    setUser(res.data);
                } catch (error) {
                    console.error('Failed to fetch user', error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };

        fetchUser();
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        setUser(res.data);
    };

    const register = async (name, email, password) => {
        const res = await api.post('/auth/register', { name, email, password });
        localStorage.setItem('token', res.data.token);
        setUser(res.data);
    };

    const loginWithGoogle = async (credential) => {
        const res = await api.post('/auth/google', { token: credential });
        localStorage.setItem('token', res.data.token);
        setUser(res.data);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    // Helper to re-fetch XP, levels
    const updateGamificationStats = async () => {
        try {
            const res = await api.get('/gamification/stats');
            setUser(prev => ({ ...prev, ...res.data }));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, loginWithGoogle, logout, loading, updateGamificationStats }}>
            {children}
        </AuthContext.Provider>
    );
};
