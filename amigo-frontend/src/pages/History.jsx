import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import {
  FaCalendarAlt, FaClock, FaUserFriends,
  FaCheckCircle, FaSpinner,
} from 'react-icons/fa';
import './styles/History.css';
import { meetingAPI } from '../services/api';

// Convert seconds to a human-readable duration string
const formatDuration = (startedAt, endedAt) => {
  if (!startedAt || !endedAt) return '—';
  const secs = Math.floor((new Date(endedAt) - new Date(startedAt)) / 1000);
  if (secs < 60) return `${secs} sec`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min`;
  const hrs  = Math.floor(mins / 60);
  const rem  = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
};

const formatDate = (isoDate) => {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const History = () => {
  const [historyData, setHistoryData] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await meetingAPI.getHistory();
        setHistoryData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="history-wrapper">
      <Header />
      <div className="history-container">

        {/* Page Header */}
        <div className="history-header">
          <div className="header-content">
            <h2>Meeting History</h2>
            <p>A log of all your past calls and sessions.</p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <FaSpinner style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '0.5rem' }}>Loading history...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <p style={{ color: '#ef4444', padding: '2rem' }}>{error}</p>
        )}

        {/* Empty State */}
        {!loading && !error && historyData.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            <FaCalendarAlt style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.3 }} />
            <h3>No meeting history yet</h3>
            <p>Your completed meetings will appear here.</p>
          </div>
        )}

        {/* History List */}
        {!loading && !error && historyData.length > 0 && (
          <div className="history-list">
            {historyData.map((item) => (
              <div key={item.id} className="history-item">

                {/* Left: Icon & Topic */}
                <div className="history-main">
                  <div className="icon-box completed">
                    <FaCheckCircle className="status-icon success" />
                  </div>
                  <div className="info-text">
                    <h3>{item.title}</h3>
                    <span className="host-label">
                      ID: {item.roomId}
                    </span>
                  </div>
                </div>

                {/* Middle: Meta */}
                <div className="history-meta">
                  <div className="meta-group">
                    <FaCalendarAlt /> {formatDate(item.endedAt)}
                  </div>
                  <div className="meta-group">
                    <FaClock /> {formatDuration(item.startedAt, item.endedAt)}
                  </div>
                  <div className="meta-group">
                    <FaUserFriends /> {item.duration} min scheduled
                  </div>
                </div>

                {/* Right: Status */}
                <div className="history-status">
                  <span className="status-badge completed">Completed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
