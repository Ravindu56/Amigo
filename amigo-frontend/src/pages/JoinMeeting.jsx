/**
 * JoinMeeting.jsx — Tailwind rebuild, real camera preview, CSS purged
 */
import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash,
  FaSignInAlt, FaKeyboard,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { meetingAPI } from '../services/api';

const JoinMeeting = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  const [roomId,    setRoomId]    = useState(location.state?.roomId || '');
  const [passcode,  setPasscode]  = useState('');
  const [camOn,     setCamOn]     = useState(true);
  const [micOn,     setMicOn]     = useState(true);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [camReady,  setCamReady]  = useState(false);

  // Real camera preview — stopped on unmount
  useEffect(() => {
    let active = true;
    if (camOn) {
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
    return () => { active = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [camOn]);

  const handleJoin = async () => {
    if (!roomId.trim()) { setError('Please enter a Room ID.'); return; }
    setLoading(true); setError('');
    try {
      const meeting = await meetingAPI.join(roomId.trim(), passcode.trim());
      streamRef.current?.getTracks().forEach(t => t.stop()); // stop preview
      navigate(`/room/${meeting.roomId}`, {
        state: { meetingId: meeting.id, title: meeting.title, isHost: false,
                 userName: user?.fullName || 'Guest',
                 audio: micOn, video: camOn },
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

          {/* ── LEFT: Join form ── */}
          <div className="card space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-mint-100 text-mint-600
                              flex items-center justify-center text-lg">
                <FaKeyboard />
              </div>
              <div>
                <h2 className="page-title">Join a Meeting</h2>
                <p className="page-desc">Enter the room ID to join</p>
              </div>
            </div>

            <div>
              <label className="input-label">Room ID</label>
              <input type="text" placeholder="e.g. ABC-123-XYZ"
                value={roomId} onChange={e => setRoomId(e.target.value)}
                className="input font-mono tracking-widest" />
            </div>

            <div>
              <label className="input-label">Passcode <span className="text-charcoal-400">(optional)</span></label>
              <input type="password" placeholder="Enter passcode if required"
                value={passcode} onChange={e => setPasscode(e.target.value)}
                className="input" />
            </div>

            {error && <div className="alert-error">{error}</div>}

            <button onClick={handleJoin} disabled={loading}
              className="btn-accent w-full py-3 text-base">
              {loading ? <><span className="spinner" /> Joining…</> : <><FaSignInAlt /> Join Meeting</>}
            </button>
          </div>

          {/* ── RIGHT: Preview ── */}
          <div className="card flex flex-col gap-5">
            <div>
              <h3 className="section-title">Your Preview</h3>
              <p className="section-subtitle">How you'll appear when you join</p>
            </div>

            <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video
                            flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted
                className={`w-full h-full object-cover transition-opacity duration-300
                            ${camOn && camReady ? 'opacity-100' : 'opacity-0'}`} />
              {(!camOn || !camReady) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center
                                  text-2xl font-bold text-white">
                    {user?.fullName?.charAt(0) || 'G'}
                  </div>
                  <p className="text-slate-400 text-sm">
                    {camOn ? 'Connecting camera…' : 'Camera off'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setCamOn(v => !v)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                            text-sm font-semibold transition-all duration-200
                            ${ camOn ? 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                                     : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}>
                {camOn ? <FaVideo /> : <FaVideoSlash />}
                {camOn ? 'Camera On' : 'Camera Off'}
              </button>
              <button onClick={() => setMicOn(v => !v)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                            text-sm font-semibold transition-all duration-200
                            ${ micOn ? 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                                     : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}>
                {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                {micOn ? 'Mic On' : 'Mic Off'}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default JoinMeeting;
