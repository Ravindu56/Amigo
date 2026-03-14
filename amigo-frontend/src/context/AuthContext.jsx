/**
 * AuthContext — global authentication state
 *
 * FIX: User object is now persisted to localStorage as a warm-start cache.
 * On page refresh, we immediately restore from localStorage (so ProtectedRoute
 * doesn't flash-redirect to /auth) while the /api/auth/me verification runs
 * in the background. If /me returns 401, we clear the cache and redirect.
 *
 * This fixes:
 *  - Redirect to /auth on every page refresh
 *  - "No token" errors on meeting API calls
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API        = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CACHE_KEY  = 'amigo_user';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  // Warm-start from cache so ProtectedRoute never flashes a redirect
  const cached = (() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); }
    catch { return null; }
  })();

  const [user,    setUser]    = useState(cached);   // start with cached user
  const [loading, setLoading] = useState(true);     // still verify with server

  // -------------------------------------------------------------------------
  // On mount: verify the session cookie with the server.
  // We already have a cached user, so ProtectedRoute shows the page while
  // this check runs. If the token is expired, we clear everything.
  // -------------------------------------------------------------------------
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
          // Token expired or invalid — clear everything
          setUser(null);
          localStorage.removeItem(CACHE_KEY);
          // Only redirect if we're on a protected page (not / or /auth)
          const pub = ['/', '/auth'];
          if (!pub.includes(window.location.pathname)) {
            navigate('/auth', { replace: true });
          }
        }
      } catch {
        // Network error — keep cached user so offline use still works
        // Don't redirect on network failures
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const logout = useCallback(async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch { /* ignore */ }
    setUser(null);
    localStorage.removeItem(CACHE_KEY);
    navigate('/auth', { replace: true });
  }, [navigate]);

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
