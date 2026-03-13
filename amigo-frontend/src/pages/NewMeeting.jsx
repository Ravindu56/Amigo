import React, { useState } from 'react';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, FaRocket, FaIdBadge, FaRandom } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { meetingAPI } from '../services/api';
import './styles/NewMeeting.css';

const NewMeeting = () => {
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [config, setConfig] = useState({
    topic:     `${user?.fullName?.split(' ')[0] || 'My'}'s Instant Meeting`,
    usePMI:    false,
    passcode:  Math.floor(100000 + Math.random() * 900000).toString(),
    hostVideo: true,
    hostAudio: true,
  });

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Format the user's raw 9-digit PMI as "XXX-XXX-XXX"
  const formattedPMI = user?.pmi
    ? `${user.pmi.slice(0, 3)}-${user.pmi.slice(3, 6)}-${user.pmi.slice(6, 9)}`
    : '---';

  const toggleConfig = (key) => setConfig(prev => ({ ...prev, [key]: !prev[key] }));

  const handleChange = (e) =>
    setConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleStart = async () => {
    setLoading(true);
    setError('');
    try {
      const meeting = await meetingAPI.create({
        title:              config.topic,
        usePMI:             config.usePMI,
        passcode:           config.passcode,
        hostVideoOn:        config.hostVideo,
        participantVideoOn: true,
      });
      navigate(`/room/${meeting.roomId}`, {
        state: {
          meetingId: meeting.id,
          title:     meeting.title,
          isHost:    true,
          audio:     config.hostAudio,
          video:     config.hostVideo,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="launch-wrapper">
      <Header />
      <div className="launch-container">

        {/* LEFT: Host Configuration */}
        <div className="launch-panel">
          <div className="panel-header">
            <div className="icon-badge orange"><FaRocket /></div>
            <h2>Start New Meeting</h2>
            <p>Configure your instant meeting settings.</p>
          </div>

          <div className="config-form">

            {/* Topic */}
            <div className="form-group">
              <label>Meeting Topic</label>
              <input
                type="text"
                name="topic"
                value={config.topic}
                onChange={handleChange}
                className="topic-input"
              />
            </div>

            {/* Meeting ID Selection */}
            <div className="id-selection">
              <label className="id-option">
                <input
                  type="radio" name="idType"
                  checked={!config.usePMI}
                  onChange={() => setConfig(p => ({ ...p, usePMI: false }))}
                />
                <div className="radio-content">
                  <div className="radio-icon"><FaRandom /></div>
                  <div className="radio-text">
                    <span className="radio-title">Generate Automatically</span>
                    <span className="radio-desc">Secure, one-time meeting ID</span>
                  </div>
                </div>
              </label>

              <label className="id-option">
                <input
                  type="radio" name="idType"
                  checked={config.usePMI}
                  onChange={() => setConfig(p => ({ ...p, usePMI: true }))}
                />
                <div className="radio-content">
                  <div className="radio-icon"><FaIdBadge /></div>
                  <div className="radio-text">
                    <span className="radio-title">Personal Meeting ID</span>
                    <span className="radio-desc">{formattedPMI}</span>
                  </div>
                </div>
              </label>
            </div>

            {/* Passcode */}
            <div className="passcode-row">
              <div className="passcode-label">Security Passcode</div>
              <div className="passcode-value">{config.passcode}</div>
            </div>

            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {error}
              </div>
            )}

            {/* Start Button */}
            <div className="launch-action">
              <button
                className="btn-launch"
                onClick={handleStart}
                disabled={loading}
              >
                {loading ? 'Starting...' : 'Start Meeting'}
              </button>
              <p className="launch-hint">By starting, you agree to host responsibilities.</p>
            </div>
          </div>
        </div>

        {/* RIGHT: Host Preview */}
        <div className="preview-panel-host">
          <div className="preview-label">HOST PREVIEW</div>
          <div className="host-camera-card">
            <div className={`video-feed ${!config.hostVideo ? 'video-off' : ''}`}>
              {config.hostVideo ? (
                <div className="live-sim">
                  <div className="face-sim host-face"></div>
                  <div className="mic-indicator">
                    <div className={`bar ${config.hostAudio ? 'active' : ''}`}></div>
                    <div className={`bar ${config.hostAudio ? 'active' : ''}`}></div>
                  </div>
                </div>
              ) : (
                <div className="host-avatar">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="feed-overlay">
                <button
                  className={`overlay-btn ${config.hostAudio ? '' : 'btn-off'}`}
                  onClick={() => toggleConfig('hostAudio')}
                >
                  {config.hostAudio ? <FaMicrophone /> : <FaMicrophoneSlash />}
                </button>
                <button
                  className={`overlay-btn ${config.hostVideo ? '' : 'btn-off'}`}
                  onClick={() => toggleConfig('hostVideo')}
                >
                  {config.hostVideo ? <FaVideo /> : <FaVideoSlash />}
                </button>
              </div>
            </div>
            <div className="card-footer">
              <div className="status-text">
                <span className={`dot ${config.hostVideo && config.hostAudio ? 'green' : 'red'}`}></span>
                {config.hostVideo ? 'System Ready' : 'Video Paused'}
              </div>
              <div className="volume-slider">
                <div className="volume-track">
                  <div className="volume-level" style={{ width: '70%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NewMeeting;
