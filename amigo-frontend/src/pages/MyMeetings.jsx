/**
 * MyMeetings.jsx — Full Tailwind rebuild
 *
 * FIX: Was using a mix of CSS-module classes (meetings-wrapper, meeting-card, tab-btn
 * etc. from MyMeetings.css) alongside Tailwind. This caused visual breakage because
 * MyMeetings.css still had dark overrides and conflicting flex layouts.
 * Fully rebuilt in Tailwind for consistency with the rest of the app.
 */
import React, { useState, useEffect, useCallback } from 'react';
import Header   from '../components/Header';
import Footer   from '../components/Footer';
import { useNavigate } from 'react-router-dom';
import {
  FaCalendarCheck, FaHistory, FaVideo, FaCopy,
  FaTrash, FaClock, FaCalendarAlt, FaLink,
} from 'react-icons/fa';
import { meetingAPI } from '../services/api';

const formatDate = (isoDate) => {
  if (!isoDate) return 'Instant';
  const d   = new Date(isoDate);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === new Date(now.getTime() + 86400000).toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (isoDate, duration) => {
  if (!isoDate) return 'Instant';
  const d   = new Date(isoDate);
  const end = new Date(d.getTime() + (duration || 60) * 60000);
  const opt = { hour: '2-digit', minute: '2-digit' };
  return `${d.toLocaleTimeString('en-US', opt)} – ${end.toLocaleTimeString('en-US', opt)}`;
};

const TABS = [
  { key: 'upcoming', label: 'Upcoming', icon: <FaCalendarCheck /> },
  { key: 'past',     label: 'Past',     icon: <FaHistory /> },
];

const MyMeetings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [upcoming,  setUpcoming]  = useState([]);
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
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

  const handleStart = async (roomId, meetingId, title) => {
    try {
      await meetingAPI.start(roomId);
      navigate(`/room/${roomId}`, {
        state: { isHost: true, meetingId, title, userName: '' },
      });
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (roomId) => {
    if (!window.confirm('Delete this meeting?')) return;
    try {
      await meetingAPI.delete(roomId);
      setUpcoming(prev => prev.filter(m => m.roomId !== roomId));
    } catch (err) { alert(err.message); }
  };

  const copyInvite = (roomId) => {
    navigator.clipboard.writeText(
      `Join my Amigo meeting:\nRoom ID: ${roomId}`
    );
  };

  const list = activeTab === 'upcoming' ? upcoming : history;

  return (
    <div className="page-wrapper">
      <Header />
      <main className="flex-1 page-container py-8">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="page-title">My Meetings</h1>
            <p className="page-desc">View and manage your scheduled sessions</p>
          </div>
          <button className="btn-primary"
            onClick={() => navigate('/schedule-meeting')}>
            <FaCalendarAlt /> Schedule Meeting
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 bg-beige-100 border border-beige-300 rounded-2xl
                        w-fit mb-6">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold
                          transition-all duration-200
                          ${ activeTab === t.key
                            ? 'bg-white shadow-card text-charcoal-900'
                            : 'text-charcoal-500 hover:text-charcoal-700'}`}
            >
              {t.icon} {t.label}
              {t.key === 'upcoming' && upcoming.length > 0 && (
                <span className="bg-sage-500 text-white text-[10px] font-bold
                                 px-1.5 py-0.5 rounded-full">
                  {upcoming.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="alert-error mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={loadData} className="text-xs underline">Retry</button>
          </div>
        )}

        {/* ── Skeleton ── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card animate-pulse space-y-4">
                <div className="h-4 bg-beige-200 rounded w-1/3" />
                <div className="h-5 bg-beige-200 rounded w-2/3" />
                <div className="h-3 bg-beige-200 rounded w-1/2" />
                <div className="h-9 bg-beige-200 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && list.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon"><FaVideo /></div>
            <p className="text-sm font-semibold text-charcoal-700">
              No {activeTab === 'upcoming' ? 'upcoming' : 'past'} meetings
            </p>
            <p className="text-xs text-charcoal-500 mt-1 mb-4">
              {activeTab === 'upcoming'
                ? 'Schedule a meeting to see it here'
                : 'Your ended meetings will appear here'}
            </p>
            {activeTab === 'upcoming' && (
              <button className="btn-primary"
                onClick={() => navigate('/schedule-meeting')}>
                <FaCalendarAlt /> Schedule Meeting
              </button>
            )}
          </div>
        )}

        {/* ── Cards grid ── */}
        {!loading && list.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(m => (
              <div key={m.id} className="card space-y-4">

                {/* Date badge */}
                <div className="flex items-center justify-between">
                  <span className="badge-sage text-xs">
                    {formatDate(m.scheduledAt)}
                  </span>
                  {m.status === 'ongoing' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-600
                                     bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>

                {/* Title */}
                <div>
                  <p className="text-sm font-bold text-charcoal-900 truncate">{m.title}</p>
                  <div className="flex flex-col gap-1 mt-1.5">
                    <span className="flex items-center gap-1.5 text-xs text-charcoal-500">
                      <FaClock className="text-sage-400" />
                      {formatTime(m.scheduledAt, m.duration)}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-charcoal-500">
                      <FaLink className="text-sage-400" />
                      ID: <span className="font-mono font-semibold">{m.roomId}</span>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {activeTab === 'upcoming' ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      className="btn-primary flex-1 text-xs py-2"
                      onClick={() => handleStart(m.roomId, m.id, m.title)}
                    >
                      <FaVideo /> Start
                    </button>
                    <button
                      className="btn-icon w-9 h-9"
                      title="Copy invite"
                      onClick={() => copyInvite(m.roomId)}
                    >
                      <FaCopy className="text-xs" />
                    </button>
                    <button
                      className="btn-icon w-9 h-9 text-red-500 hover:bg-red-50"
                      title="Delete meeting"
                      onClick={() => handleDelete(m.roomId)}
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <span className="badge-beige text-xs">
                      {m.endedAt
                        ? `Ended ${new Date(m.endedAt).toLocaleDateString()}`
                        : 'Finished'}
                    </span>
                    <span className="text-xs text-charcoal-400">{m.duration} min</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MyMeetings;
