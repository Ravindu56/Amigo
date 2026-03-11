import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Importing Pages
import Dashboard from './pages/Dashboard.jsx';
import WelcomePage from './pages/WelcomePage';
import AuthPage from './pages/AuthPage';
import UserProfile from './pages/UserProfile.jsx';
import ScheduleMeeting from './pages/ScheduleMeeting.jsx';
import JoinMeeting from './pages/JoinMeeting.jsx';
import NewMeeting from './pages/NewMeeting.jsx';
import Room from './pages/Room.jsx';
import MyMeetings from './pages/MyMeetings.jsx';
import Recordings from './pages/Recordings.jsx';
import History from './pages/History.jsx';
import Team from './pages/Team.jsx';
import './index.css';

// ─── Protected Route Guard ───────────────────────────────────────────────────
// If user is not logged in, redirect to /auth.
// Otherwise render the requested page as normal.
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/auth" replace />;
};

// ─── Public Route Guard ─────────────────────────────────────────────────────
// Prevents already logged-in users from going back to /auth or /.
// Redirects them straight to /dashboard instead.
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <Router>
      <div className="app-main">
        <Routes>
          {/* ── Public Routes (accessible without login) ── */}
          <Route path="/" element={<PublicRoute><WelcomePage /></PublicRoute>} />
          <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />

          {/* ── Protected Routes (require login) ── */}
          <Route path="/dashboard"       element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/user-profile"    element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/schedule-meeting" element={<ProtectedRoute><ScheduleMeeting /></ProtectedRoute>} />
          <Route path="/join"            element={<ProtectedRoute><JoinMeeting /></ProtectedRoute>} />
          <Route path="/new-meeting"     element={<ProtectedRoute><NewMeeting /></ProtectedRoute>} />
          <Route path="/room"            element={<ProtectedRoute><Room /></ProtectedRoute>} />
          <Route path="/meetings"        element={<ProtectedRoute><MyMeetings /></ProtectedRoute>} />
          <Route path="/recordings"      element={<ProtectedRoute><Recordings /></ProtectedRoute>} />
          <Route path="/history"         element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/team"            element={<ProtectedRoute><Team /></ProtectedRoute>} />

          {/* ── Catch-All: redirect unknown URLs to home ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
