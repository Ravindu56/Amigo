/**
 * Recordings.jsx
 *
 * FIX: Was calling recordingAPI.getAll() which does not exist in api.js.
 * The correct method is recordingAPI.getMy().
 * Full Tailwind rebuild for visual consistency.
 */
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  FaPlay, FaDownload, FaFilm, FaClock,
  FaCalendarAlt, FaSearch, FaTrash,
} from 'react-icons/fa';
import { recordingAPI } from '../services/api';

const fmtSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDur = (secs) => {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const Recordings = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');

  useEffect(() => {
    // FIX: was recordingAPI.getAll() — correct method is recordingAPI.getMy()
    recordingAPI.getMy()
      .then(setRecordings)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = recordings.filter(r =>
    r.title?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recording?')) return;
    try {
      await recordingAPI.delete(id);
      setRecordings(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="page-wrapper">
      <Header />
      <main className="flex-1 page-container py-8">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="page-title">Recordings</h1>
            <p className="page-desc">
              {loading ? 'Loading…' : `${recordings.length} saved recording${recordings.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="input-group max-w-xs w-full">
            <FaSearch className="input-icon" />
            <input
              type="text"
              placeholder="Search recordings…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-with-icon"
            />
          </div>
        </div>

        {/* ── Error ── */}
        {error && <div className="alert-error mb-6">{error}</div>}

        {/* ── Skeleton ── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card animate-pulse space-y-3">
                <div className="aspect-video bg-beige-200 rounded-xl" />
                <div className="h-3.5 bg-beige-200 rounded w-2/3" />
                <div className="h-3 bg-beige-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon"><FaFilm /></div>
            <p className="text-sm font-semibold text-charcoal-700">
              {search ? 'No recordings match your search' : 'No recordings yet'}
            </p>
            <p className="text-xs text-charcoal-500 mt-1">
              {search
                ? 'Try a different search term'
                : 'Recordings from your meetings will appear here.'}
            </p>
          </div>
        )}

        {/* ── Grid ── */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => (
              <div key={r.id} className="card group space-y-3">

                {/* Thumbnail */}
                <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden
                                flex items-center justify-center">
                  <FaFilm className="text-3xl text-slate-600" />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                                  transition-opacity duration-200
                                  flex items-center justify-center gap-3">
                    {r.fileUrl && (
                      <a href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-white/20 text-white
                                   flex items-center justify-center hover:bg-white/30 transition-colors"
                        title="Play">
                        <FaPlay className="text-sm" />
                      </a>
                    )}
                    {r.fileUrl && (
                      <a href={r.fileUrl} download
                        className="w-10 h-10 rounded-full bg-white/20 text-white
                                   flex items-center justify-center hover:bg-white/30 transition-colors"
                        title="Download">
                        <FaDownload className="text-sm" />
                      </a>
                    )}
                  </div>

                  {/* Duration badge */}
                  {r.duration && (
                    <span className="absolute bottom-2 right-2 bg-black/70 text-white
                                     text-[10px] font-semibold px-1.5 py-0.5 rounded">
                      {fmtDur(r.duration)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div>
                  <p className="text-sm font-semibold text-charcoal-800 truncate">{r.title}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-charcoal-500">
                      <FaClock /> {fmtDur(r.duration)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-charcoal-500">
                      <FaCalendarAlt />
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                    </span>
                    <span className="text-xs text-charcoal-400">{fmtSize(r.fileSize)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {r.fileUrl ? (
                    <a href={r.fileUrl} download
                      className="btn-secondary flex-1 text-xs justify-center py-2">
                      <FaDownload /> Download
                    </a>
                  ) : (
                    <span className="flex-1 text-xs text-center text-charcoal-400
                                     py-2 border border-beige-300 rounded-xl">
                      No file
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="btn-ghost text-red-500 hover:bg-red-50 text-xs px-3 py-2"
                    title="Delete recording"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Recordings;
