/**
 * AuthContext — global authentication state
 *
 * FIX: Removed navigate() calls from checkSession entirely.
 * Having navigate() inside AuthContext caused a race condition:
 * when /api/auth/me resolved (even slightly after mount), it would
 * call navigate('/auth') which overwrote any in-progress navigation
 * (e.g. navigate('/user-profile')), landing the user on /auth or
 * bouncing through to WelcomePage via the * catch-all.
 *
 * All redirect responsibility now belongs to ProtectedRoute, which
 * already handles the !user case correctly.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API       = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CACHE_KEY = 'amigo_user';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Warm-start from localStorage so ProtectedRoute never flashes a redirect
  const cached = (() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); }
    catch { return null; }
  })();

  const [user,    setUser]    = useState(cached);
  const [loading, setLoading] = useState(true);

  // On mount: silently verify the session cookie with the server.
  // We do NOT call navigate() here under any circumstances — ProtectedRoute
  // is the single source of truth for redirect-on-unauthenticated.
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${API}/api/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } else {
          // Token expired / invalid — clear state & cache.
          // ProtectedRoute will redirect to /auth automatically.
          setUser(null);
          localStorage.removeItem(CACHE_KEY);
        }
      } catch {
        // Network error — keep cached user so the app still works offline.
        // Do NOT clear the user or redirect on a network failure.
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem(CACHE_KEY, JSON.stringify(userData));
  }, []);

  const updateUser = useCallback((updatedData) => {
    setUser(prev => {
      const next = { ...prev, ...updatedData };
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // logout: clear state then let the caller navigate (e.g. Header calls navigate('/auth'))
  const logout = useCallback(async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch { /* ignore network errors on logout */ }
    setUser(null);
    localStorage.removeItem(CACHE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
