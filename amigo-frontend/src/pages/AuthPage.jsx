/**
 * AuthPage.jsx
 *
 * FIX: Added redirect guard — if the user is already logged in and visits
 * /auth, they are immediately sent to /dashboard instead of seeing the
 * login form again.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import AuthForm     from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';

const AuthPage = () => {
  const { user, loading } = useAuth();

  // Already authenticated — send to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthForm />;
};

export default AuthPage;
