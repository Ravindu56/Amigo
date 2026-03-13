/**
 * History.jsx — Tailwind rebuild, History.css purged
 */
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';
import { FaHistory, FaVideo, FaClock, FaUsers, FaSearch, FaCalendarAlt } from 'react-icons/fa';
import { meetingAPI } from '../services/api';

const History = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    meetingAPI.getHistory()
      .then(setMeetings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = meetings.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.roomId?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="page-wrapper">
      <Header />
      <main className="flex-1 page-container py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="page-title">Meeting History</h1>
            <p className="page-desc">{meetings.length} past meeting{meetings.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="input-group max-w-xs w-full">
            <FaSearch className="input-icon" />
            <input type="text" placeholder="Search meetings…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="input-with-icon" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="card animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-beige-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-beige-200 rounded w-1/3" />
                  <div className="h-3 bg-beige-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FaHistory /></div>
            <p className="text-sm font-semibold text-charcoal-700">
              {search ? 'No meetings match your search' : 'No past meetings yet'}
            </p>
            <p className="text-xs text-charcoal-500 mt-1 mb-4">
              {search ? 'Try a different search term' : 'Start or join a meeting to see history here'}
            </p>
            {!search && (
              <button className="btn-primary" onClick={() => navigate('/new-meeting')}>
                <FaVideo /> Start a Meeting
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(m => (
              <div key={m.id} className="card-hover flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-sage-100 text-sage-600
                                flex items-center justify-center flex-shrink-0">
                  <FaVideo />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-charcoal-800 truncate">{m.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-charcoal-500">
                      <FaCalendarAlt /> {fmt(m.startedAt || m.createdAt)}
                    </span>
                    {m.duration && (
                      <span className="flex items-center gap-1 text-xs text-charcoal-500">
                        <FaClock /> {m.duration} min
                      </span>
                    )}
                    {m.participants && (
                      <span className="flex items-center gap-1 text-xs text-charcoal-500">
                        <FaUsers /> {m.participants}
                      </span>
                    )}
                  </div>
                </div>
                <span className="badge-beige flex-shrink-0">{m.roomId}</span>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default History;
