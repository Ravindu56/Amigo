import React, { useState } from 'react';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt, FaClock, FaHeading, FaLock,
  FaVideo, FaCopy, FaCheckCircle,
} from 'react-icons/fa';
import { meetingAPI } from '../services/api';
import './styles/ScheduleMeeting.css';

const ScheduleMeeting = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    topic:            'Amigo Strategy Meeting',
    date:             new Date().toISOString().split('T')[0],
    time:             '10:00',
    duration:         '60',
    passcode:         Math.floor(100000 + Math.random() * 900000).toString(),
    hostVideo:        true,
    participantVideo: false,
  });

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [created,  setCreated]  = useState(null); // holds the meeting after success

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(p => ({ ...p, [e.target.name]: value }));
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Combine date + time into a full ISO timestamp
    const scheduledAt = new Date(`${formData.date}T${formData.time}:00`).toISOString();

    try {
      const meeting = await meetingAPI.create({
        title:              formData.topic,
        passcode:           formData.passcode,
        scheduledAt,
        duration:           parseInt(formData.duration, 10),
        hostVideoOn:        formData.hostVideo,
        participantVideoOn: formData.participantVideo,
      });
      setCreated(meeting);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyInvite = () => {
    if (!created) return;
    navigator.clipboard.writeText(
      `Join my Amigo meeting:\nTopic: ${created.title}\nRoom ID: ${created.roomId}\nPasscode: ${created.passcode}\nhttps://amigo.com/join/${created.roomId}`
    );
    alert('Invitation copied to clipboard!');
  };

  // ── SUCCESS STATE ────────────────────────────────────────────────────────
  if (created) {
    return (
      <div className="schedule-wrapper">
        <Header />
        <div className="schedule-container" style={{ justifyContent: 'center' }}>
          <div className="form-panel" style={{ maxWidth: '520px', textAlign: 'center' }}>
            <div style={{ color: '#10b981', fontSize: '3rem', marginBottom: '1rem' }}>
              <FaCheckCircle />
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>Meeting Scheduled!</h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
              Your meeting has been saved and is ready to share.
            </p>

            <div className="invite-card" style={{ textAlign: 'left' }}>
              <div className="invite-body">
                <h3>{created.title}</h3>
                <div className="invite-details">
                  <div className="detail-item">
                    <span className="label">Date:</span>
                    <span className="value">{formData.date}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Time:</span>
                    <span className="value">{formData.time} ({formData.duration} min)</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Room ID:</span>
                    <span className="value">{created.roomId}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Passcode:</span>
                    <span className="value">{created.passcode || '—'}</span>
                  </div>
                </div>
                <div className="invite-link-box">
                  <p>https://amigo.com/join/{created.roomId}</p>
                  <FaCopy className="copy-icon" style={{ cursor: 'pointer' }} onClick={copyInvite} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
              <button className="btn-save" onClick={() => navigate('/meetings')}>
                View My Meetings
              </button>
              <button className="btn-cancel" onClick={() => {
                setCreated(null);
                setFormData(p => ({ ...p,
                  topic: 'Amigo Strategy Meeting',
                  passcode: Math.floor(100000 + Math.random() * 900000).toString(),
                }));
              }}>
                Schedule Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM STATE ───────────────────────────────────────────────────────────
  return (
    <div className="schedule-wrapper">
      <Header />
      <div className="schedule-container">

        {/* LEFT: Form */}
        <div className="form-panel">
          <div className="panel-header">
            <div className="icon-badge"><FaCalendarAlt /></div>
            <h2>Schedule Meeting</h2>
            <p>Set up the details for your next video call.</p>
          </div>

          <form onSubmit={handleSchedule}>

            {/* Topic */}
            <div className="form-group">
              <label>Topic</label>
              <div className="input-icon-wrapper">
                <FaHeading className="field-icon" />
                <input type="text" name="topic" value={formData.topic}
                  onChange={handleChange} placeholder="Enter meeting topic" required />
              </div>
            </div>

            {/* Date & Time */}
            <div className="form-row">
              <div className="form-group">
                <label>Date</label>
                <div className="input-icon-wrapper">
                  <input type="date" name="date" value={formData.date}
                    onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Time</label>
                <div className="input-icon-wrapper">
                  <input type="time" name="time" value={formData.time}
                    onChange={handleChange} required />
                </div>
              </div>
            </div>

            {/* Duration & Passcode */}
            <div className="form-row">
              <div className="form-group">
                <label>Duration (min)</label>
                <div className="input-icon-wrapper">
                  <FaClock className="field-icon" />
                  <select name="duration" value={formData.duration} onChange={handleChange}>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="90">1.5 Hours</option>
                    <option value="120">2 Hours</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Passcode</label>
                <div className="input-icon-wrapper">
                  <FaLock className="field-icon" />
                  <input type="text" name="passcode" value={formData.passcode}
                    onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Video Toggles */}
            <div className="toggle-section">
              <div className="toggle-row">
                <div className="toggle-label">
                  <span>Host Video</span>
                  <small>Start video when meeting begins</small>
                </div>
                <label className="switch">
                  <input type="checkbox" name="hostVideo"
                    checked={formData.hostVideo} onChange={handleChange} />
                  <span className="slider round"></span>
                </label>
              </div>
              <div className="toggle-row">
                <div className="toggle-label">
                  <span>Participant Video</span>
                  <small>Allow participants to toggle video</small>
                </div>
                <label className="switch">
                  <input type="checkbox" name="participantVideo"
                    checked={formData.participantVideo} onChange={handleChange} />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fca5a5',
                borderRadius: '8px', padding: '0.75rem 1rem',
                color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn-cancel"
                onClick={() => navigate('/dashboard')}>Cancel</button>
              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="preview-panel">
          <div className="preview-label">LIVE INVITATION PREVIEW</div>
          <div className="invite-card">
            <div className="invite-header">
              <div className="logo-small">🤝</div>
              <span>Amigo Invitation</span>
            </div>
            <div className="invite-body">
              <h3>{formData.topic || 'Untitled Meeting'}</h3>
              <div className="invite-details">
                <div className="detail-item">
                  <span className="label">Date:</span>
                  <span className="value">{formData.date}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Time:</span>
                  <span className="value">{formData.time} ({formData.duration} min)</span>
                </div>
                <div className="detail-item">
                  <span className="label">Passcode:</span>
                  <span className="value">{formData.passcode}</span>
                </div>
              </div>
              <div className="invite-link-box">
                <p>Meeting ID will appear after scheduling</p>
              </div>
            </div>
            <div className="invite-footer">
              <FaVideo className={formData.hostVideo ? 'icon-on' : 'icon-off'} />
              <span>Host Video: {formData.hostVideo ? 'On' : 'Off'}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ScheduleMeeting;
