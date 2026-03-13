import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import { FaVideo, FaKeyboard, FaCalendarPlus, FaDesktop, FaEllipsisH } from 'react-icons/fa';
import './styles/Dashboard.css';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { meetingAPI } from '../services/api';

const FaChevronDown = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Format a UTC ISO date to a readable "Today 2:30 PM" style string
const formatMeetingTime = (isoDate) => {
  if (!isoDate) return 'Instant';
  const d = new Date(isoDate);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() ===
    new Date(now.getTime() + 86400000).toDateString();
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (isToday)    return `Today ${timeStr}`;
  if (isTomorrow) return `Tomorrow ${timeStr}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${timeStr}`;
};

const Dashboard = () => {
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [stats,    setStats]    = useState({ totalHosted: 0, upcoming: 0, ended: 0, recentMeetings: [] });
  const [upcoming, setUpcoming] = useState([]);
  const [history,  setHistory]  = useState([]);
  const [loadingSt, setLoadingSt] = useState(true);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const firstName = user?.fullName?.split(' ')[0] || 'there';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, upcomingData, historyData] = await Promise.all([
          meetingAPI.getStats(),
          meetingAPI.getMy(),
          meetingAPI.getHistory(),
        ]);
        setStats(statsData);
        setUpcoming(upcomingData);
        setHistory(historyData.slice(0, 3)); // only 3 recent for sidebar
      } catch (err) {
        console.error('Dashboard load error:', err.message);
      } finally {
        setLoadingSt(false);
      }
    };
    load();
  }, []);

  const handleStartMeeting = async (roomId) => {
    try {
      await meetingAPI.start(roomId);
      navigate(`/room/${roomId}`, { state: { isHost: true } });
    } catch (err) {
      console.error(err.message);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <Header />
      <main className="dashboard-content">

        {/* 1. Welcome Banner */}
        <section className="welcome-banner">
          <div className="welcome-info">
            <h1>{greeting}, {firstName} 👋</h1>
            <p className="date-text">
              {currentDate}
              {stats.upcoming > 0
                ? ` • You have ${stats.upcoming} upcoming meeting${stats.upcoming > 1 ? 's' : ''}`
                : ' • No upcoming meetings today'}
            </p>
          </div>
          <div className="primary-action" onClick={() => navigate('/new-meeting')}>
            <button className="btn-new-meeting">
              <FaVideo className="btn-icon" /> New Meeting
            </button>
            <div className="split-line"></div>
            <button className="btn-dropdown"><FaChevronDown /></button>
          </div>
        </section>

        {/* 2. Quick Actions */}
        <section className="quick-actions">
          <div className="action-card" onClick={() => navigate('/join')}>
            <div className="icon-box blue"><FaKeyboard /></div>
            <div className="action-details"><h3>Join with Code</h3><p>Enter ID</p></div>
          </div>
          <div className="action-card" onClick={() => navigate('/schedule-meeting')}>
            <div className="icon-box purple"><FaCalendarPlus /></div>
            <div className="action-details"><h3>Schedule</h3><p>Calendar</p></div>
          </div>
          <div className="action-card">
            <div className="icon-box teal"><FaDesktop /></div>
            <div className="action-details"><h3>Share Screen</h3><p>Present</p></div>
          </div>
        </section>

        {/* 3. Main Data Area */}
        <div className="data-split-view">

          {/* Upcoming Meetings Table */}
          <section className="data-section main-table">
            <div className="section-header">
              <h2>Upcoming Meetings</h2>
              <span className="view-all" style={{ cursor: 'pointer' }}
                onClick={() => navigate('/meetings')}>View All</span>
            </div>

            {loadingSt ? (
              <p style={{ color: '#64748b', padding: '1rem' }}>Loading...</p>
            ) : upcoming.length === 0 ? (
              <div style={{ padding: '1.5rem', color: '#64748b', textAlign: 'center' }}>
                <p>No upcoming meetings.</p>
                <button
                  className="btn-start-small"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => navigate('/schedule-meeting')}
                >
                  Schedule One
                </button>
              </div>
            ) : (
              <div className="meeting-table">
                {upcoming.slice(0, 3).map((m) => {
                  const d = m.scheduledAt ? new Date(m.scheduledAt) : null;
                  const timeStr = d
                    ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : 'Now';
                  const [timePart, ampm] = timeStr.split(' ');
                  return (
                    <div className="table-row" key={m.id}>
                      <div className="time-col">
                        <span className="time-large">{timePart}</span>
                        <span className="time-am-pm">{ampm}</span>
                      </div>
                      <div className="info-col">
                        <h4>{m.title}</h4>
                        <p>ID: {m.roomId} &bull; {m.duration} min</p>
                      </div>
                      <div className="action-col">
                        <button
                          className="btn-start-small"
                          onClick={() => handleStartMeeting(m.roomId)}
                        >
                          Start
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent History Sidebar */}
          <aside className="data-section side-list">
            <div className="section-header">
              <h2>Recent History</h2>
              <FaEllipsisH className="more-options" style={{ cursor: 'pointer' }}
                onClick={() => navigate('/history')} />
            </div>

            {loadingSt ? (
              <p style={{ color: '#64748b', padding: '1rem' }}>Loading...</p>
            ) : history.length === 0 ? (
              <p style={{ color: '#64748b', padding: '1rem' }}>No past meetings yet.</p>
            ) : (
              <div className="history-list-compact">
                {history.map((m) => (
                  <div className="history-row" key={m.id}>
                    <div className="status-dot"></div>
                    <div className="history-meta">
                      <h4>{m.title}</h4>
                      <span>{formatMeetingTime(m.endedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
