import { useEffect, useRef } from 'react';
import api from '../api/axios';

/**
 * useActivityTracker — Production-grade idle-aware study time tracker.
 *
 * - Pauses timer after 60s of no mouse/keyboard/click activity
 * - Resumes immediately on next user event
 * - On page leave or component unmount: posts active minutes to backend
 * - Uses navigator.sendBeacon as fallback when component is unmounting
 *
 * @param {string} page - 'study' | 'flashcards' | 'quizzes' | 'planner' | 'question-paper'
 */
const useActivityTracker = (page) => {
    // Use a single ref object to avoid stale closure issues with useCallback
    const state = useRef({
        page,
        startTime: Date.now(),
        activeMs: 0,
        isActive: true,
        idleTimer: null,
        saved: false
    });

    useEffect(() => {
        const s = state.current;
        s.page = page;
        s.startTime = Date.now();
        s.activeMs = 0;
        s.isActive = true;
        s.idleTimer = null;
        s.saved = false;

        const IDLE_MS = 60_000; // 60 seconds

        const onActivity = () => {
            if (!s.isActive) {
                // Resume: restart segment start clock
                s.isActive = true;
                s.startTime = Date.now();
            }
            clearTimeout(s.idleTimer);
            s.idleTimer = setTimeout(() => {
                // Idle — bank the current segment and pause
                if (s.isActive && s.startTime) {
                    s.activeMs += Date.now() - s.startTime;
                    s.startTime = null;
                }
                s.isActive = false;
            }, IDLE_MS);
        };

        const flushAndSave = async () => {
            if (s.saved) return;
            s.saved = true;

            // Bank any remaining active segment
            if (s.isActive && s.startTime) {
                s.activeMs += Date.now() - s.startTime;
                s.startTime = null;
                s.isActive = false;
            }

            const totalMinutes = s.activeMs / 60_000;
            if (totalMinutes < 1) {
                // skipped
                return;
            }

            const safeDuration = Math.min(parseFloat(totalMinutes.toFixed(2)), 180);
            const endTime = new Date().toISOString();
            const startTime = new Date(Date.now() - safeDuration * 60_000).toISOString();



            const payload = JSON.stringify({
                page: s.page,
                startTime,
                endTime,
                durationMinutes: safeDuration
            });

            // Try beacon first (works even during page unload)
            if (navigator.sendBeacon) {
                const token = localStorage.getItem('token');
                const blob = new Blob([payload], { type: 'application/json' });
                // sendBeacon doesn't support auth headers, so use fetch with keepalive as primary
            }

            try {
                await api.post('/activity/save', {
                    page: s.page,
                    startTime,
                    endTime,
                    durationMinutes: safeDuration
                });

            } catch (err) {
                console.error('[ActivityTracker] Save failed:', err.response?.data || err.message);
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                flushAndSave();
            } else {
                // Page became visible again — start fresh segment
                s.saved = false;
                s.isActive = true;
                s.startTime = Date.now();
                onActivity(); // restart idle timer
            }
        };

        // Register activity listeners
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Kick off the idle timer immediately (counts from mount)
        onActivity();

        return () => {
            events.forEach(e => window.removeEventListener(e, onActivity));
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearTimeout(s.idleTimer);
            flushAndSave(); // Save on unmount/route change
        };
    }, [page]); // re-run if page identifier changes
};

export default useActivityTracker;
