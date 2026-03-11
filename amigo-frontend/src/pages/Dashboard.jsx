import React from 'react';
import Header from '../components/Header';
import { FaVideo, FaKeyboard, FaCalendarPlus, FaDesktop, FaEllipsisH } from 'react-icons/fa';
import './styles/Dashboard.css';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Use first name only from fullName (e.g. "John Doe" -> "John")
  const firstName = user?.fullName?.split(' ')[0] || 'there';

  return (
    <div className="dashboard-wrapper">
      <Header />

      <main className="dashboard-content">

        {/* 1. Welcome & Time Section */}
        <section className="welcome-banner">
          <div className="welcome-info">
            <h1>{getGreeting()}, {firstName} 👋</h1>
            <p className="date-text">{currentDate} • You have 2 meetings today</p>
          </div>
          <div className="primary-action" onClick={() => navigate('/new-meeting')}>
            <button className="btn-new-meeting">
              <FaVideo className="btn-icon" /> New Meeting
            </button>
            <div className="split-line"></div>
            <button className="btn-dropdown"><FaChevronDown /></button>
          </div>
        </section>

        {/* 2. Quick Actions Bar */}
        <section className="quick-actions">
          <div className="action-card" onClick={() => navigate('/join')}>
            <div className="icon-box blue"><FaKeyboard /></div>
            <div className="action-details">
              <h3>Join with Code</h3>
              <p>Enter ID</p>
            </div>
          </div>

          <div className="action-card" onClick={() => navigate('/schedule-meeting')}>
            <div className="icon-box purple"><FaCalendarPlus /></div>
            <div className="action-details">
              <h3>Schedule</h3>
              <p>Calendar</p>
            </div>
          </div>

          <div className="action-card">
            <div className="icon-box teal"><FaDesktop /></div>
            <div className="action-details">
              <h3>Share Screen</h3>
              <p>Present</p>
            </div>
          </div>
        </section>

        {/* 3. Main Data Area (Split View) */}
        <div className="data-split-view">

          {/* Left: Upcoming Meetings */}
          <section className="data-section main-table">
            <div className="section-header">
              <h2>Upcoming Meetings</h2>
              <a href="#" className="view-all">View All</a>
            </div>

            <div className="meeting-table">
              <div className="table-row">
                <div className="time-col">
                  <span className="time-large">02:30</span>
                  <span className="time-am-pm">PM</span>
                </div>
                <div className="info-col">
                  <h4>Product Design Review</h4>
                  <p>Design Team • 45 min</p>
                </div>
                <div className="action-col">
                  <button className="btn-start-small">Start</button>
                </div>
              </div>

              <div className="table-row">
                <div className="time-col">
                  <span className="time-large">04:00</span>
                  <span className="time-am-pm">PM</span>
                </div>
                <div className="info-col">
                  <h4>Client Sync: Aurelia Project</h4>
                  <p>External • 30 min</p>
                </div>
                <div className="action-col">
                  <button className="btn-join-small">Join</button>
                </div>
              </div>
            </div>
          </section>

          {/* Right: Recent History */}
          <aside className="data-section side-list">
            <div className="section-header">
              <h2>Recent History</h2>
              <FaEllipsisH className="more-options" />
            </div>

            <div className="history-list-compact">
              <div className="history-row">
                <div className="status-dot"></div>
                <div className="history-meta">
                  <h4>Weekly Standup</h4>
                  <span>Yesterday, 10:00 AM</span>
                </div>
              </div>
              <div className="history-row">
                <div className="status-dot"></div>
                <div className="history-meta">
                  <h4>Q4 Planning</h4>
                  <span>Oct 24, 2:00 PM</span>
                </div>
              </div>
              <div className="history-row">
                <div className="status-dot"></div>
                <div className="history-meta">
                  <h4>Amigo Tech Sync</h4>
                  <span>Oct 23, 11:30 AM</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

// Helper chevron icon
const FaChevronDown = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default Dashboard;
