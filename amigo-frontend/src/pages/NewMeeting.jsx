/**
 * NewMeeting.jsx
 * - CAMERA BUG FIX: preview uses real getUserMedia, stream stopped on unmount
 * - Full Tailwind rebuild, NewMeeting.css purged
 */
import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';
import {
  FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash,
  FaRocket, FaIdBadge, FaRandom, FaLock,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { meetingAPI } from '../services/api';

const NewMeeting = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  const [config, setConfig] = useState({
    topic:     `${user?.fullName?.split(' ')[0] || 'My'}'s Instant Meeting`,
    usePMI:    false,
    passcode:  Math.floor(100000 + Math.random() * 900000).toString(),
    hostVideo: true,
    hostAudio: true,
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [camReady, setCamReady] = useState(false);

  // ── Real camera preview — stopped on unmount so cam light goes off ──────
  useEffect(() => {
    let active = true;
    if (config.hostVideo) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setCamReady(true);
        })
        .catch(() => setCamReady(false));
    } else {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCamReady(false);
    }
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [config.hostVideo]);

  const formattedPMI = user?.pmi
    ? `${user.pmi.slice(0,3)}-${user.pmi.slice(3,6)}-${user.pmi.slice(6,9)}`
    : '---';

  const toggle = (key) => setConfig(p => ({ ...p, [key]: !p[key] }));

  const handleStart = async () => {
    setLoading(true); setError('');
    try {
      const meeting = await meetingAPI.create({
        title:              config.topic,
        usePMI:             config.usePMI,
        passcode:           config.passcode,
        hostVideoOn:        config.hostVideo,
        participantVideoOn: true,
      });
      // Stop preview stream before navigating — Room will restart camera
      streamRef.current?.getTracks().forEach(t => t.stop());
      navigate(`/room/${meeting.roomId}`, {
        state: { meetingId: meeting.id, title: meeting.title, isHost: true,
                 audio: config.hostAudio, video: config.hostVideo },
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Header />
      <main className="flex-1 page-container py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">

          {/* ── LEFT: Config ── */}
          <div className="card space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sage-100 text-sage-600
                              flex items-center justify-center text-lg">
                <FaRocket />
              </div>
              <div>
                <h2 className="page-title">Start New Meeting</h2>
                <p className="page-desc">Configure your instant meeting</p>
              </div>
            </div>

            {/* Topic */}
            <div>
              <label className="input-label">Meeting Topic</label>
              <input
                type="text"
                value={config.topic}
                onChange={e => setConfig(p => ({...p, topic: e.target.value}))}
                className="input"
              />
            </div>

            {/* Meeting ID */}
            <div className="space-y-2">
              <label className="input-label">Meeting ID</label>
              {[
                { key: false, icon: <FaRandom />, title: 'Generate Automatically', desc: 'Secure, one-time ID' },
                { key: true,  icon: <FaIdBadge />, title: 'Personal Meeting ID',    desc: formattedPMI },
              ].map(({ key, icon, title, desc }) => (
                <label key={String(key)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer
                              transition-all duration-200
                              ${ config.usePMI === key
                                ? 'border-sage-400 bg-sage-50'
                                : 'border-beige-300 bg-beige-50 hover:border-beige-400'}`}>
                  <input type="radio" name="idType" checked={config.usePMI === key}
                    onChange={() => setConfig(p => ({...p, usePMI: key}))}
                    className="accent-sage-500" />
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm
                                  ${ config.usePMI === key ? 'bg-sage-500 text-white' : 'bg-beige-200 text-charcoal-500'}`}>
                    {icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-charcoal-800">{title}</p>
                    <p className="text-xs text-charcoal-500">{desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Passcode */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-beige-100 border border-beige-300">
              <div className="flex items-center gap-2 text-sm text-charcoal-700">
                <FaLock className="text-sage-500" /> Security Passcode
              </div>
              <span className="font-mono text-sm font-semibold text-charcoal-800
                               bg-white border border-beige-300 px-3 py-1 rounded-lg">
                {config.passcode}
              </span>
            </div>

            {error && <div className="alert-error">{error}</div>}

            <button onClick={handleStart} disabled={loading}
              className="btn-primary w-full py-3 text-base">
              {loading ? <><span className="spinner" /> Starting…</> : <><FaRocket /> Start Meeting</>}
            </button>
          </div>

          {/* ── RIGHT: Real Camera Preview ── */}
          <div className="card flex flex-col gap-5">
            <div>
              <h3 className="section-title">Host Preview</h3>
              <p className="section-subtitle">How you'll appear to others</p>
            </div>

            {/* Video preview */}
            <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video
                            flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted
                className={`w-full h-full object-cover transition-opacity duration-300
                            ${config.hostVideo && camReady ? 'opacity-100' : 'opacity-0'}`} />
              {(!config.hostVideo || !camReady) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center
                                  text-2xl font-bold text-white">
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <p className="text-slate-400 text-sm">
                    {config.hostVideo ? 'Connecting camera…' : 'Camera off'}
                  </p>
                </div>
              )}
              {config.hostVideo && camReady && (
                <span className="absolute top-3 right-3 flex items-center gap-1.5
                                 text-[10px] font-semibold text-white bg-green-600/80
                                 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE PREVIEW
                </span>
              )}
            </div>

            {/* Cam / Mic toggles */}
            <div className="flex gap-3">
              <button onClick={() => toggle('hostVideo')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                            text-sm font-semibold transition-all duration-200
                            ${ config.hostVideo
                              ? 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                              : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}>
                {config.hostVideo ? <FaVideo /> : <FaVideoSlash />}
                {config.hostVideo ? 'Camera On' : 'Camera Off'}
              </button>
              <button onClick={() => toggle('hostAudio')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                            text-sm font-semibold transition-all duration-200
                            ${ config.hostAudio
                              ? 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                              : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}>
                {config.hostAudio ? <FaMicrophone /> : <FaMicrophoneSlash />}
                {config.hostAudio ? 'Mic On' : 'Mic Off'}
              </button>
            </div>

            <p className="text-xs text-charcoal-500 text-center">
              Camera preview will stop when you start the meeting.
              You can change settings inside the room.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NewMeeting;
