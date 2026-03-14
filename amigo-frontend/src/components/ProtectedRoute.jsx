/**
 * ProtectedRoute
 *
 * FIX:
 *  - Spinner no longer uses #0f172a dark background — uses beige-50 + sage spinner
 *  - While loading=true AND we have a cached user, we render children immediately
 *    (prevents flash-of-redirect on refresh)
 *  - Only shows spinner if there is no cached user at all
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // If still verifying but we have a cached user — render immediately,
  // background check is running concurrently in AuthContext
  if (loading && user) return children;

  // No cached user at all — show a themed spinner while the /me check runs
  if (loading) {
    return (
      <div className="min-h-screen bg-beige-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-beige-300 border-t-sage-500 animate-spin" />
          <p className="text-sm text-charcoal-500 font-medium">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return children;
};

export default ProtectedRoute;
