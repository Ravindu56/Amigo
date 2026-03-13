import React, { useState } from 'react';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import {
  FaKeyboard, FaUser, FaMicrophone, FaMicrophoneSlash,
  FaVideo, FaVideoSlash, FaArrowRight, FaLock,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { meetingAPI } from '../services/api';
import './styles/JoinMeeting.css';

const JoinMeeting = () => {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [formData, setFormData] = useState({
    meetingId: '',
    passcode:  '',
    username:  user?.fullName || '',
  });

  const [settings, setSettings] = useState({ audio: true, video: true });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleChange   = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  const toggleSetting  = (key) => setSettings(p => ({ ...p, [key]: !p[key] }));

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');

    // Normalise: strip spaces/dashes so "844-922-101" and "844922101" both work
    const roomId = formData.meetingId.replace(/[\s-]+/g, '');
    const formatted = `${roomId.slice(0,3)}-${roomId.slice(3,6)}-${roomId.slice(6,9)}`;

    if (roomId.length !== 9) {
      setError('Please enter a valid 9-digit meeting ID.');
      return;
    }

    setLoading(true);
    try {
      // Validate the room exists on the backend
      const meeting = await meetingAPI.getByRoomId(formatted);

      // If meeting has a passcode, verify it
      if (meeting.passcode && meeting.passcode !== formData.passcode) {
        setError('Incorrect passcode. Please try again.');
        setLoading(false);
        return;
      }

      // All good — enter the room
      navigate(`/room/${formatted}`, {
        state: {
          meetingId: meeting.id,
          title:     meeting.title,
          userName:  formData.username,
          isHost:    false,
          audio:     settings.audio,
          video:     settings.video,
        },
      });
    } catch (err) {
      setError(err.message === 'Meeting not found'
        ? 'No meeting found with that ID. Please check and try again.'
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-wrapper">
      <Header />
      <div className="join-container">

        {/* LEFT: Form */}
        <div className="join-form-panel">
          <div className="panel-header">
            <div className="icon-badge blue"><FaKeyboard /></div>
            <h2>Join Meeting</h2>
            <p>Enter the code provided by the meeting host.</p>
          </div>

          <form onSubmit={handleJoin}>

            {/* Meeting ID */}
            <div className="form-group large-input">
              <label>Meeting ID or Personal Link Name</label>
              <div className="input-icon-wrapper">
                <input
                  type="text"
                  name="meetingId"
                  value={formData.meetingId}
                  onChange={handleChange}
                  placeholder="e.g. 844-922-101"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Passcode */}
            <div className="form-group">
              <label>Passcode (if required)</label>
              <div className="input-icon-wrapper">
                <FaLock className="field-icon" />
                <input
                  type="password"
                  name="passcode"
                  value={formData.passcode}
                  onChange={handleChange}
                  placeholder="Enter passcode"
                />
              </div>
            </div>

            {/* Display Name */}
            <div className="form-group">
              <label>Your Display Name</label>
              <div className="input-icon-wrapper">
                <FaUser className="field-icon" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Your Name"
                  required
                />
              </div>
            </div>

            {/* Audio/Video Options */}
            <div className="device-toggles">
              <p className="toggles-title">Join Options</p>

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-name">Don't connect to audio</span>
                  <span className="toggle-desc">Join without microphone audio</span>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={!settings.audio}
                    onChange={() => toggleSetting('audio')} />
                  <span className="slider round"></span>
                </label>
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-name">Turn off my video</span>
                  <span className="toggle-desc">Join with camera off</span>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={!settings.video}
                    onChange={() => toggleSetting('video')} />
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
              <button
                type="submit"
                className={`btn-join ${formData.meetingId ? 'active' : ''}`}
                disabled={!formData.meetingId || loading}
              >
                {loading ? 'Checking...' : <> Join Meeting <FaArrowRight /> </>}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT: Tech Check */}
        <div className="tech-check-panel">
          <div className="preview-label">PRE-FLIGHT CHECK</div>
          <div className="camera-card">
            <div className={`video-screen ${!settings.video ? 'video-off' : ''}`}>
              {settings.video ? (
                <div className="fake-feed">
                  <div className="face-sim"></div>
                  <div className="mic-level-indicator">
                    <div className={`bar ${settings.audio ? 'anim' : ''}`}></div>
                    <div className={`bar ${settings.audio ? 'anim' : ''}`}></div>
                    <div className={`bar ${settings.audio ? 'anim' : ''}`}></div>
                  </div>
                </div>
              ) : (
                <div className="avatar-placeholder">
                  {formData.username.charAt(0) || 'U'}
                </div>
              )}
              <div className="status-badges">
                <span className={`badge ${settings.audio ? 'on' : 'off'}`}>
                  {settings.audio ? <FaMicrophone /> : <FaMicrophoneSlash />}
                </span>
                <span className={`badge ${settings.video ? 'on' : 'off'}`}>
                  {settings.video ? <FaVideo /> : <FaVideoSlash />}
                </span>
              </div>
            </div>
            <div className="camera-footer">
              <p>{settings.video ? 'Camera is Ready' : 'Camera is Off'}</p>
              <button className="btn-test-device">Test Speaker and Microphone</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default JoinMeeting;
