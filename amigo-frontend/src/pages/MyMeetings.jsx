import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import {
  FaCalendarCheck, FaHistory, FaVideo, FaCopy,
  FaTrash, FaClock, FaEllipsisV, FaSpinner,
} from 'react-icons/fa';
import './styles/MyMeetings.css';
import Footer from '../components/Footer';
import { meetingAPI } from '../services/api';

// Format a scheduled ISO date into a readable label
const formatDate = (isoDate) => {
  if (!isoDate) return 'Instant';
  const d   = new Date(isoDate);
  const now = new Date();
  const isToday    = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() ===
    new Date(now.getTime() + 86400000).toDateString();
  if (isToday)    return 'Today';
  if (isTomorrow) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (isoDate, duration) => {
  if (!isoDate) return 'Instant';
  const d     = new Date(isoDate);
  const start = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const end   = new Date(d.getTime() + duration * 60000)
    .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${start} - ${end}`;
};

const MyMeetings = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('upcoming');
  const [upcoming,  setUpcoming]  = useState([]);
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [up, hist] = await Promise.all([
        meetingAPI.getMy(),
        meetingAPI.getHistory(),
      ]);
      setUpcoming(up);
      setHistory(hist);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStart = async (roomId) => {
    try {
      await meetingAPI.start(roomId);
      navigate(`/room/${roomId}`, { state: { isHost: true } });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (roomId) => {
    if (!window.confirm('Delete this meeting?')) return;
    try {
      await meetingAPI.delete(roomId);
      setUpcoming(prev => prev.filter(m => m.roomId !== roomId));
    } catch (err) {
      alert(err.message);
    }
  };

  const copyInvite = (roomId) => {
    navigator.clipboard.writeText(
      `Join my Amigo meeting:\nhttps://amigo.com/join/${roomId}\nMeeting ID: ${roomId}`
    );
    alert('Invitation copied to clipboard!');
  };

  const displayList = activeTab === 'upcoming' ? upcoming : history;

  return (
    <div className="meetings-wrapper">
      <Header />
      <div className="meetings-container">

        {/* Header & Tabs */}
        <div className="meetings-header">
          <div className="header-text">
            <h2>My Meetings</h2>
            <p>View and manage your scheduled sessions.</p>
          </div>
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              <FaCalendarCheck /> Upcoming
              {upcoming.length > 0 && (
                <span style={{
                  background: '#6366f1', color: '#fff', borderRadius: '99px',
                  padding: '1px 7px', fontSize: '0.75rem', marginLeft: '6px',
                }}>{upcoming.length}</span>
              )}
            </button>
            <button
              className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
              onClick={() => setActiveTab('past')}
            >
              <FaHistory /> Past
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <FaSpinner style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '0.5rem' }}>Loading meetings...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
            <p>{error}</p>
            <button onClick={loadData} style={{ marginTop: '1rem' }}>Retry</button>
          </div>
        ) : (
          <div className="meetings-grid">
            {displayList.length > 0 ? (
              displayList.map((meeting) => (
                <div key={meeting.id} className="meeting-card">
                  <div className="card-top">
                    <div className="meeting-date-badge">
                      <span className="badge-label">{formatDate(meeting.scheduledAt)}</span>
                    </div>
                    <button className="btn-options"><FaEllipsisV /></button>
                  </div>

                  <div className="card-body">
                    <h3>{meeting.title}</h3>
                    <div className="meta-info">
                      <div className="meta-row">
                        <FaClock className="meta-icon" />
                        <span>{formatTime(meeting.scheduledAt, meeting.duration)}</span>
                      </div>
                      <div className="meta-row">
                        <span className="id-label">ID:</span>
                        <span className="id-value">{meeting.roomId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer">
                    {activeTab === 'upcoming' ? (
                      <>
                        <button className="btn-action start"
                          onClick={() => handleStart(meeting.roomId)}>Start</button>
                        <button className="btn-action copy"
                          onClick={() => copyInvite(meeting.roomId)} title="Copy Invitation">
                          <FaCopy />
                        </button>
                        <button className="btn-action delete"
                          onClick={() => handleDelete(meeting.roomId)} title="Delete">
                          <FaTrash />
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn-action secondary">View Details</button>
                        <span className="past-label">Finished</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><FaVideo /></div>
                <h3>No {activeTab === 'upcoming' ? 'upcoming' : 'past'} meetings found</h3>
                <p>Schedule a new meeting to get started.</p>
                <button className="btn-schedule-now"
                  onClick={() => navigate('/schedule-meeting')}>Schedule Meeting</button>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default MyMeetings;
