import axios from 'axios';

const BASE_URL =
    import.meta.env.MODE === 'development'
        ? 'http://localhost:5000/api'
        : 'https://smartnotes-backend-5asd.onrender.com/api';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 600000, // 10 minutes — large PDFs take time to process through Groq LLM
});

// ─── Request Interceptor ───────────────────────────────────
// Automatically attach JWT token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && token !== 'null' && token !== 'undefined') {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ─── Response Interceptor ──────────────────────────────────
// On 401: clear stale token and redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const isAuthRoute = error.config?.url?.includes('/auth/login') ||
                error.config?.url?.includes('/auth/register') ||
                error.config?.url?.includes('/auth/google');

            if (!isAuthRoute) {
                console.warn('[API] 401 Unauthorized — clearing token and redirecting to login');
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
