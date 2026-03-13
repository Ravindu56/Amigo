import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import {
  FaPlay, FaDownload, FaTrash, FaSearch,
  FaCalendarAlt, FaClock, FaSpinner, FaFilm,
} from 'react-icons/fa';
import './styles/Recordings.css';
import { recordingAPI } from '../services/api';

// Convert seconds to MM:SS or HH:MM:SS
const formatDuration = (secs) => {
  if (!secs || secs === 0) return '00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

// Convert bytes to human-readable size
const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// Generate a gradient for the thumbnail based on the recording id
const GRADIENTS = [
  'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
];
const getGradient = (id) => GRADIENTS[id % GRADIENTS.length];

const Recordings = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await recordingAPI.getMy();
        setRecordings(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recording permanently?')) return;
    try {
      await recordingAPI.delete(id);
      setRecordings(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDownload = (rec) => {
    if (!rec.fileUrl) { alert('No file available to download.'); return; }
    window.open(rec.fileUrl, '_blank');
  };

  const filtered = recordings.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="recordings-wrapper">
      <Header />
      <div className="recordings-container">

        {/* Header */}
        <div className="page-header">
          <div className="header-title">
            <h2>Meeting Recordings</h2>
            <p>Access and manage your recorded video sessions.</p>
          </div>
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search recordings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <FaSpinner style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '0.5rem' }}>Loading recordings...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <p style={{ color: '#ef4444', padding: '2rem' }}>{error}</p>
        )}

        {/* Empty */}
        {!loading && !error && recordings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            <FaFilm style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.3 }} />
            <h3>No recordings yet</h3>
            <p>Recordings from your meetings will appear here.</p>
          </div>
        )}

        {/* Video Grid */}
        {!loading && !error && recordings.length > 0 && (
          <div className="video-grid">
            {filtered.length > 0 ? (
              filtered.map((rec) => (
                <div key={rec.id} className="video-card">
                  <div className="thumbnail" style={{ background: getGradient(rec.id) }}>
                    <div className="play-overlay">
                      <button className="btn-play"
                        onClick={() => rec.fileUrl && window.open(rec.fileUrl, '_blank')}>
                        <FaPlay />
                      </button>
                    </div>
                    <span className="duration-badge">{formatDuration(rec.duration)}</span>
                  </div>
                  <div className="card-content">
                    <div className="card-info">
                      <h3>{rec.title}</h3>
                      <div className="meta-tags">
                        <span>
                          <FaCalendarAlt />{' '}
                          {new Date(rec.createdAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </span>
                        <span><FaClock /> {formatSize(rec.fileSize)}</span>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button className="action-btn download" title="Download"
                        onClick={() => handleDownload(rec)}>
                        <FaDownload /> Download
                      </button>
                      <div className="right-actions">
                        <button className="icon-action delete" title="Delete"
                          onClick={() => handleDelete(rec.id)}>
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">
                <p>No recordings found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Recordings;
