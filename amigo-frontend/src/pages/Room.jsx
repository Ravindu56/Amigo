import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash,
  FaDesktop, FaPhoneSlash, FaComments, FaUserFriends,
  FaChevronRight, FaPaperPlane, FaExpand, FaCompress,
  FaCircle, FaStop, FaLock,
} from 'react-icons/fa';
import { meetingAPI, recordingAPI } from '../services/api';

const SOCKET_SERVER = import.meta.env.VITE_SOCKET_SERVER || 'http://localhost:5000';
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// ── Session helpers ──────────────────────────────────────────────────────────
// location.state is wiped on a browser refresh. We persist the room context
// to sessionStorage so that a refresh → lobby → rejoin still uses the real
// user name / meeting metadata instead of the fallback 'You'.
const SESSION_KEY = (roomId) => `amigo_room_${roomId}`;

function saveSession(roomId, data) {
  try { sessionStorage.setItem(SESSION_KEY(roomId), JSON.stringify(data)); } catch (_) {}
}

function loadSession(roomId) {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY(roomId));
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

function clearSession(roomId) {
  try { sessionStorage.removeItem(SESSION_KEY(roomId)); } catch (_) {}
}

// ── RemoteVideo ──────────────────────────────────────────────────────────────
const RemoteVideo = React.memo(({ peerId, peerName, stream }) => {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative bg-charcoal-800 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-charcoal-700 flex items-center justify-center text-xl font-bold text-white">
            {(peerName || 'P').charAt(0).toUpperCase()}
          </div>
          <p className="text-beige-300 text-xs mt-2">Connecting…</p>
        </div>
      )}
      <span className="absolute bottom-2 left-3 text-xs text-white/80 font-medium bg-black/40 px-2 py-0.5 rounded-full">
        {peerName}
      </span>
    </div>
  );
});
RemoteVideo.displayName = 'RemoteVideo';

// ── PreJoinLobby ─────────────────────────────────────────────────────────────
const PreJoinLobby = ({ title, userName, onJoin, onCancel }) => {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setReady(true);
      })
      .catch(err => {
        if (!active) return;
        setError(err.name === 'NotAllowedError'
          ? 'Camera/mic denied. You can still join with both off.'
          : `Media error: ${err.message}`);
        setReady(true);
      });
    return () => { active = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const toggleCam = () => {
    const t = streamRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setCamOn(v => !v); } else setCamOn(false);
  };
  const toggleMic = () => {
    const t = streamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMicOn(v => !v); } else setMicOn(false);
  };
  const handleJoin = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    onJoin({ video: camOn, audio: micOn });
  };

  return (
    <div className="min-h-screen bg-charcoal-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-beige-300 text-sm mt-1">Check your camera and mic before joining</p>
        </div>
        <div className="relative bg-charcoal-800 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${camOn ? 'opacity-100' : 'opacity-0'}`} />
          {(!camOn || !ready) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-charcoal-700 flex items-center justify-center text-2xl font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
              <p className="text-beige-300 text-sm mt-3">{camOn ? 'Connecting camera…' : 'Camera off'}</p>
            </div>
          )}
          <span className="absolute bottom-3 left-4 text-xs text-white/70 bg-black/40 px-2 py-0.5 rounded-full">
            {userName} (You)
          </span>
        </div>
        {error && (
          <div className="bg-amber-900/40 border border-amber-700 text-amber-300 text-sm px-4 py-2.5 rounded-xl">
            {error}
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={toggleCam}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200
              ${camOn ? 'bg-charcoal-700 text-white hover:bg-charcoal-800' : 'bg-red-600 text-white hover:bg-red-700'}`}>
            {camOn ? <FaVideo /> : <FaVideoSlash />} {camOn ? 'Camera On' : 'Camera Off'}
          </button>
          <button onClick={toggleMic}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200
              ${micOn ? 'bg-charcoal-700 text-white hover:bg-charcoal-800' : 'bg-red-600 text-white hover:bg-red-700'}`}>
            {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />} {micOn ? 'Mic On' : 'Mic Off'}
          </button>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-charcoal-700 text-white font-semibold hover:bg-charcoal-800 transition-all duration-200">
            Cancel
          </button>
          <button onClick={handleJoin} disabled={!ready}
            className="flex-1 py-3 rounded-xl bg-sage-500 text-white font-bold hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
            {ready ? 'Join Meeting' : 'Connecting…'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── MAIN ROOM ────────────────────────────────────────────────────────────────
const Room = () => {
  const navigate   = useNavigate();
  const { roomId } = useParams();
  const location   = useLocation();

  // FIX REFRESH NAME: read from location.state first, then fall back to
  // sessionStorage so a page refresh doesn't lose the real user name.
  const session = loadSession(roomId);
  const stateOrSession = location.state || session || {};

  const {
    meetingId = null,
    isHost    = false,
    userName  = 'You',
    title     = `Room ${roomId}`,
  } = stateOrSession;

  // Persist to sessionStorage whenever we have fresh state from navigation
  useEffect(() => {
    if (location.state) {
      saveSession(roomId, location.state);
    }
  }, [location.state, roomId]);

  const [joined,    setJoined]    = useState(false);
  const [initAudio, setInitAudio] = useState(true);
  const [initVideo, setInitVideo] = useState(true);

  const handleLobbyJoin   = useCallback(({ video, audio }) => {
    setInitVideo(video); setInitAudio(audio); setJoined(true);
  }, []);
  const handleLobbyCancel = useCallback(() => {
    clearSession(roomId);
    navigate('/dashboard');
  }, [navigate, roomId]);

  const socketRef         = useRef(null);
  // Store socket.id in a ref so chat-message handler always has the latest value
  const mySocketIdRef     = useRef(null);
  const myVideoRef        = useRef(null);
  const myStreamRef       = useRef(null);
  const isCleanedUp       = useRef(false);
  const hasEndedMeeting   = useRef(false);
  const chatBottomRef     = useRef(null);
  const meetingStartRef   = useRef(null);
  const pcsRef            = useRef(new Map());
  const peerNamesRef      = useRef(new Map());
  const mediaRecorderRef  = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingStartRef = useRef(null);
  const initAudioRef      = useRef(true);
  const initVideoRef      = useRef(true);
  // Keep userName in a ref so chat callbacks always read the current value
  const userNameRef       = useRef(userName);
  useEffect(() => { userNameRef.current = userName; }, [userName]);

  const [peers,           setPeers]           = useState([]);
  const [micOn,           setMicOn]           = useState(true);
  const [videoOn,         setVideoOn]         = useState(true);
  const [screenShare,     setScreenShare]     = useState(false);
  const [sidePanelOpen,   setSidePanelOpen]   = useState(false);
  const [activeTab,       setActiveTab]       = useState('chat');
  const [isFullscreen,    setIsFullscreen]    = useState(false);
  const [messages,        setMessages]        = useState([]);
  const [newMessage,      setNewMessage]      = useState('');
  const [time,            setTime]            = useState(new Date());
  const [mediaError,      setMediaError]      = useState(null);
  const [isRecording,     setIsRecording]     = useState(false);
  const [recordingSaving, setRecordingSaving] = useState(false);
  const [endingCall,      setEndingCall]      = useState(false);
  const [recordingError,  setRecordingError]  = useState('');
  const [elapsed,         setElapsed]         = useState('00:00');

  useEffect(() => { initAudioRef.current = initAudio; }, [initAudio]);
  useEffect(() => { initVideoRef.current = initVideo; }, [initVideo]);

  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date());
      if (meetingStartRef.current) {
        const ms   = Date.now() - meetingStartRef.current;
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        setElapsed(`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`);
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const setPeerName = useCallback((peerId, name) => {
    if (!name || name === 'Participant') return;
    peerNamesRef.current.set(peerId, name);
    setPeers(prev => prev.map(p =>
      p.peerId === peerId ? { ...p, peerName: name } : p
    ));
  }, []);

  const createPeer = useCallback((peerId, peerName, localStream) => {
    if (peerName && peerName !== 'Participant') {
      peerNamesRef.current.set(peerId, peerName);
    }
    if (pcsRef.current.has(peerId)) {
      setPeerName(peerId, peerName);
      return pcsRef.current.get(peerId).pc;
    }
    const pc           = new RTCPeerConnection(RTC_CONFIG);
    const remoteStream = new MediaStream();
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    pc.ontrack = (ev) => {
      ev.streams[0]?.getTracks().forEach(t => {
        if (!remoteStream.getTrackById(t.id)) remoteStream.addTrack(t);
      });
      setPeers(prev => prev.map(p =>
        p.peerId === peerId ? { ...p, stream: remoteStream } : p
      ));
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate && !isCleanedUp.current)
        socketRef.current?.emit('ice-candidate', ev.candidate, peerId);
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState))
        removePeer(peerId);
    };
    const resolvedName = peerNamesRef.current.get(peerId) || peerName || 'Participant';
    pcsRef.current.set(peerId, { pc, stream: remoteStream });
    setPeers(prev => {
      if (prev.find(p => p.peerId === peerId)) return prev;
      return [...prev, { peerId, peerName: resolvedName, stream: null }];
    });
    return pc;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removePeer = useCallback((peerId) => {
    const e = pcsRef.current.get(peerId);
    if (e) { try { e.pc.close(); } catch (_) {} pcsRef.current.delete(peerId); }
    peerNamesRef.current.delete(peerId);
    setPeers(prev => prev.filter(p => p.peerId !== peerId));
  }, []);

  // ── Main effect: media + socket ──────────────────────────────────────────
  useEffect(() => {
    if (!joined) return;
    isCleanedUp.current     = false;
    meetingStartRef.current = Date.now();

    const socket = io(SOCKET_SERVER, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    // Capture socket.id as soon as it connects so the chat handler
    // can reliably identify the sender without a stale closure.
    socket.on('connect', () => {
      mySocketIdRef.current = socket.id;
    });

    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      })
      .then((stream) => {
        if (isCleanedUp.current) { stream.getTracks().forEach(t => t.stop()); return; }

        myStreamRef.current = stream;
        if (myVideoRef.current) myVideoRef.current.srcObject = stream;

        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        if (videoTrack) videoTrack.enabled = initVideoRef.current;
        if (audioTrack) audioTrack.enabled = true;
        setVideoOn(initVideoRef.current);
        setMicOn(initAudioRef.current);

        // ── Register ALL listeners before join-room ───────────────────
        socket.on('room-participants', async (participants) => {
          if (isCleanedUp.current) return;
          for (const { socketId, userName: pName } of participants) {
            const resolvedName = pName || 'Participant';
            const pc = createPeer(socketId, resolvedName, stream);
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              // FIX REFRESH NAME: use userNameRef so the name sent in the
              // offer is always the real name even after a page refresh.
              socket.emit('offer', pc.localDescription, socketId, userNameRef.current);
            } catch (err) { console.warn('offer failed:', err); }
          }
        });

        socket.on('offer', async (inOffer, callerId, callerName) => {
          if (isCleanedUp.current) return;
          const resolvedName = callerName || 'Participant';
          const pc = createPeer(callerId, resolvedName, stream);
          if (!pc) return;
          setPeerName(callerId, resolvedName);
          if (pc.remoteDescription?.type) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(inOffer));
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            socket.emit('answer', pc.localDescription, callerId);
          } catch (err) { console.warn('answer failed:', err); }
        });

        socket.on('answer', async (inAns, peerId) => {
          if (isCleanedUp.current) return;
          const e = pcsRef.current.get(peerId);
          if (!e || e.pc.remoteDescription?.type) return;
          await e.pc.setRemoteDescription(new RTCSessionDescription(inAns)).catch(console.warn);
        });

        socket.on('ice-candidate', async (cand, peerId) => {
          if (isCleanedUp.current) return;
          const e = pcsRef.current.get(peerId);
          if (e) await e.pc.addIceCandidate(new RTCIceCandidate(cand)).catch(console.warn);
        });

        socket.on('user-disconnected', (socketId) => removePeer(socketId));

        // FIX CHAT: use mySocketIdRef (updated on connect) instead of
        // socket.id in a closure — avoids stale-id mismatches.
        // The server echoes the message back to the sender too (io.in()),
        // so we rely solely on senderId === mySocketIdRef to mark 'mine'.
        socket.on('chat-message', (msg, senderName, senderId) => {
          if (isCleanedUp.current) return;
          const isMine = senderId === mySocketIdRef.current;
          setMessages(prev => [...prev, {
            user: isMine ? 'You' : senderName,
            text: msg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            mine: isMine,
          }]);
        });

        // ── NOW join ─────────────────────────────────────────────────
        // FIX REFRESH NAME: emit the real userName from ref, not the
        // potentially stale 'You' fallback from location.state.
        socket.emit('join-room', roomId, userNameRef.current);

        if (audioTrack && !initAudioRef.current) {
          audioTrack.enabled = false;
        }
      })
      .catch(err => setMediaError(
        err.name === 'NotAllowedError'
          ? 'Camera/microphone access denied. Please allow permissions and refresh.'
          : `Media device error: ${err.message}`
      ));

    return () => {
      isCleanedUp.current = true;
      myStreamRef.current?.getTracks().forEach(t => t.stop());
      pcsRef.current.forEach(({ pc }) => { try { pc.close(); } catch (_) {} });
      pcsRef.current.clear();
      peerNamesRef.current.clear();
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, roomId]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const t = myStreamRef.current?.getAudioTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setMicOn(t.enabled);
  }, []);

  const toggleVideo = useCallback(() => {
    const t = myStreamRef.current?.getVideoTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setVideoOn(t.enabled);
  }, []);

  const stopScreenShare = useCallback(() => {
    const cam = myStreamRef.current?.getVideoTracks()[0];
    pcsRef.current.forEach(({ pc }) => {
      const s = pc.getSenders().find(s => s.track?.kind === 'video');
      if (s && cam) s.replaceTrack(cam).catch(console.warn);
    });
    if (myVideoRef.current) myVideoRef.current.srcObject = myStreamRef.current;
    setScreenShare(false);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (screenShare) { stopScreenShare(); return; }
    try {
      const ss    = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = ss.getVideoTracks()[0];
      pcsRef.current.forEach(({ pc }) => {
        const s = pc.getSenders().find(s => s.track?.kind === 'video');
        if (s) s.replaceTrack(track).catch(console.warn);
      });
      if (myVideoRef.current) myVideoRef.current.srcObject = ss;
      setScreenShare(true);
      track.addEventListener('ended', stopScreenShare, { once: true });
    } catch (e) { console.error('Screen share failed:', e); }
  }, [screenShare, stopScreenShare]);

  const startRecording = useCallback(() => {
    const stream = myStreamRef.current;
    if (!stream) return;
    setRecordingError('');
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
      .find(t => MediaRecorder.isTypeSupported(t)) || '';
    try {
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recordedChunksRef.current = [];
      recordingStartRef.current = Date.now();
      rec.ondataavailable = (e) => { if (e.data?.size > 0) recordedChunksRef.current.push(e.data); };
      rec.onstop = async () => {
        setRecordingSaving(true);
        const dur  = Math.floor((Date.now() - recordingStartRef.current) / 1000);
        const blob = new Blob(recordedChunksRef.current, { type: mimeType || 'video/webm' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `Amigo-${roomId}-${Date.now()}.webm`; a.click();
        try {
          await recordingAPI.create({ meetingId, title: `Recording — ${title}`, duration: dur, fileSize: blob.size, fileUrl: url });
        } catch { setRecordingError('Downloaded but could not save to server.'); }
        finally { setRecordingSaving(false); recordedChunksRef.current = []; }
      };
      rec.start(1000);
      mediaRecorderRef.current = rec;
      setIsRecording(true);
    } catch (err) { setRecordingError(`Recording failed: ${err.message}`); }
  }, [roomId, meetingId, title]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setIsRecording(false);
  }, []);

  const handleEndCall = useCallback(async () => {
    if (endingCall) return;
    setEndingCall(true);
    if (isRecording) stopRecording();
    myStreamRef.current?.getTracks().forEach(t => t.stop());
    socketRef.current?.disconnect();
    clearSession(roomId);
    if (isHost && !hasEndedMeeting.current) {
      hasEndedMeeting.current = true;
      await meetingAPI.end(roomId).catch(console.error);
    }
    navigate('/dashboard');
  }, [endingCall, isHost, isRecording, navigate, roomId, stopRecording]);

  const handleSendMessage = useCallback((e) => {
    e.preventDefault();
    const t = newMessage.trim();
    if (!t) return;
    // FIX REFRESH NAME: emit the real name from ref
    socketRef.current?.emit('chat-message', t, userNameRef.current, roomId);
    setNewMessage('');
  }, [newMessage, roomId]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const toggleSidePanel = useCallback((tab) => {
    setSidePanelOpen(prev => {
      if (prev && activeTab === tab) return false;
      setActiveTab(tab);
      return true;
    });
  }, [activeTab]);

  const copyRoomId = useCallback(() => {
    navigator.clipboard.writeText(roomId)
      .then(() => alert(`Room ID copied: ${roomId}`))
      .catch(() => prompt('Copy this Room ID:', roomId));
  }, [roomId]);

  if (!joined) {
    return (
      <PreJoinLobby
        title={title} userName={userName} isHost={isHost} meetingId={meetingId}
        roomId={roomId} onJoin={handleLobbyJoin} onCancel={handleLobbyCancel}
      />
    );
  }

  if (mediaError) {
    return (
      <div className="fixed inset-0 bg-charcoal-950 flex items-center justify-center p-6">
        <div className="bg-charcoal-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <FaVideoSlash className="text-5xl text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Cannot Access Camera / Microphone</h2>
          <p className="text-beige-300 text-sm">{mediaError}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary w-full py-3">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-charcoal-950 flex flex-col overflow-hidden" style={{ height: '100dvh' }}>

      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-2.5
        bg-charcoal-900/90 backdrop-blur border-b border-charcoal-800 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-sage-400 bg-sage-900/40 px-2.5 py-1 rounded-full">
            <FaLock className="text-[10px]" /> Secure
          </span>
          <span className="text-white font-semibold text-sm truncate max-w-[200px]">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          {isRecording && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 animate-pulse">
              <FaCircle className="text-[8px]" /> REC {elapsed}
            </span>
          )}
          {recordingSaving && <span className="text-xs text-amber-400">Saving…</span>}
          {recordingError  && <span className="text-xs text-red-400">{recordingError}</span>}
          <span className="text-beige-400 text-xs">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={toggleFullscreen}
            className="w-8 h-8 rounded-lg bg-charcoal-800 text-beige-300 hover:bg-charcoal-700 flex items-center justify-center text-sm transition-colors">
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </header>

      {/* VIDEO GRID */}
      <main className={`flex-1 overflow-hidden p-3 transition-all duration-300 ${sidePanelOpen ? 'mr-72' : ''}`}>
        <div className={`h-full grid gap-3 auto-rows-fr
          ${ (peers.length + 1) === 1 ? 'grid-cols-1'
           : (peers.length + 1) === 2 ? 'grid-cols-2'
           : (peers.length + 1) <= 4  ? 'grid-cols-2'
           : 'grid-cols-3' }`}>

          {/* LOCAL TILE */}
          <div className="relative bg-charcoal-800 rounded-2xl overflow-hidden flex items-center justify-center">
            <video ref={myVideoRef} autoPlay playsInline muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${videoOn ? 'opacity-100' : 'opacity-0'}`} />
            {!videoOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-sage-700 flex items-center justify-center text-xl font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <span className="absolute bottom-2 left-3 flex items-center gap-1.5 text-xs text-white/80 bg-black/40 px-2 py-0.5 rounded-full">
              {userName} (You)
              {!micOn && <FaMicrophoneSlash className="text-red-400 text-[10px]" />}
            </span>
          </div>

          {/* REMOTE TILES */}
          {peers.map(({ peerId, peerName, stream }) => (
            <RemoteVideo key={peerId} peerId={peerId} peerName={peerName} stream={stream} />
          ))}
        </div>
      </main>

      {/* CONTROL DOCK */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3
        bg-charcoal-900/90 backdrop-blur border-t border-charcoal-800 z-10">
        <div className="hidden sm:flex items-center gap-1 text-beige-400 text-xs min-w-[60px]">
          <span className="font-mono text-beige-200">{elapsed}</span>
          <span>elapsed</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button onClick={toggleMic}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200
              ${!micOn ? 'bg-red-600/90 text-white' : 'bg-charcoal-800 text-beige-200 hover:bg-charcoal-700'}`}>
            {micOn ? <FaMicrophone className="text-base" /> : <FaMicrophoneSlash className="text-base" />}
            <span>{micOn ? 'Mute' : 'Unmute'}</span>
          </button>
          <button onClick={toggleVideo}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200
              ${!videoOn ? 'bg-red-600/90 text-white' : 'bg-charcoal-800 text-beige-200 hover:bg-charcoal-700'}`}>
            {videoOn ? <FaVideo className="text-base" /> : <FaVideoSlash className="text-base" />}
            <span>{videoOn ? 'Stop Video' : 'Start Video'}</span>
          </button>
          <button onClick={toggleScreenShare}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200
              ${screenShare ? 'bg-sage-600 text-white' : 'bg-charcoal-800 text-beige-200 hover:bg-charcoal-700'}`}>
            <FaDesktop className="text-base" />
            <span>{screenShare ? 'Stop Share' : 'Share'}</span>
          </button>
          <button onClick={isRecording ? stopRecording : startRecording} disabled={recordingSaving}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200
              ${isRecording ? 'bg-red-600/90 text-white animate-pulse' : 'bg-charcoal-800 text-beige-200 hover:bg-charcoal-700'}`}>
            {isRecording ? <FaStop className="text-base" /> : <FaCircle className="text-base text-red-400" />}
            <span>{isRecording ? 'Stop Rec' : 'Record'}</span>
          </button>
          <button onClick={() => toggleSidePanel('participants')}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 relative
              ${sidePanelOpen && activeTab === 'participants' ? 'bg-mint-600 text-white' : 'bg-charcoal-800 text-beige-200 hover:bg-charcoal-700'}`}>
            <FaUserFriends className="text-base" />
            <span>People</span>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sage-500 text-white text-[9px] font-bold flex items-center justify-center">
              {peers.length + 1}
            </span>
          </button>
          <button onClick={() => toggleSidePanel('chat')}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200
              ${sidePanelOpen && activeTab === 'chat' ? 'bg-mint-600 text-white' : 'bg-charcoal-800 text-beige-200 hover:bg-charcoal-700'}`}>
            <FaComments className="text-base" />
            <span>Chat</span>
          </button>
        </div>
        <div className="min-w-[60px] flex justify-end">
          <button onClick={handleEndCall} disabled={endingCall}
            className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-all duration-200">
            <FaPhoneSlash className="text-base" />
            <span>{endingCall ? 'Ending…' : isHost ? 'End' : 'Leave'}</span>
          </button>
        </div>
      </div>

      {/* SIDE PANEL */}
      <aside className={`fixed top-0 right-0 h-full w-72 bg-charcoal-900 border-l border-charcoal-800
        flex flex-col transition-transform duration-300 z-20
        ${sidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal-800 flex-shrink-0">
          <h3 className="text-sm font-semibold text-white">
            {activeTab === 'chat' ? 'Meeting Chat' : `Participants (${peers.length + 1})`}
          </h3>
          <button onClick={() => setSidePanelOpen(false)}
            className="w-7 h-7 rounded-lg bg-charcoal-800 text-beige-300 hover:bg-charcoal-700 flex items-center justify-center transition-colors">
            <FaChevronRight className="text-xs" />
          </button>
        </div>

        {activeTab === 'chat' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <p className="text-center text-beige-400 text-xs mt-8">No messages yet. Say hello! 👋</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-beige-400 mb-0.5">{m.user} · {m.time}</span>
                  <div className={`text-sm px-3 py-2 rounded-xl max-w-[85%] leading-snug
                    ${m.mine ? 'bg-sage-600 text-white' : 'bg-charcoal-800 text-beige-100'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2 p-3 border-t border-charcoal-800 flex-shrink-0">
              <input type="text" placeholder="Type a message…" value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="flex-1 bg-charcoal-800 border border-charcoal-700 rounded-xl px-3 py-2 text-sm text-white placeholder-beige-500 focus:outline-none focus:ring-2 focus:ring-sage-500" />
              <button type="submit"
                className="w-9 h-9 rounded-xl bg-sage-600 text-white hover:bg-sage-500 flex items-center justify-center flex-shrink-0 transition-colors">
                <FaPaperPlane className="text-xs" />
              </button>
            </form>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-charcoal-800/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-sage-600 flex items-center justify-center text-sm font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{userName} (You)</p>
                  {isHost && <span className="text-[10px] bg-sage-600 text-white px-1.5 py-0.5 rounded-full">HOST</span>}
                </div>
              </div>
              <div className="flex gap-1.5 text-xs">
                {videoOn ? <FaVideo className="text-sage-400" /> : <FaVideoSlash className="text-red-400" />}
                {micOn   ? <FaMicrophone className="text-sage-400" /> : <FaMicrophoneSlash className="text-red-400" />}
              </div>
            </div>
            {peers.map(({ peerId, peerName }) => (
              <div key={peerId} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-charcoal-800/40">
                <div className="w-8 h-8 rounded-full bg-mint-600 flex items-center justify-center text-sm font-bold text-white">
                  {(peerName || 'P').charAt(0).toUpperCase()}
                </div>
                <p className="text-sm text-beige-200">{peerName || 'Participant'}</p>
              </div>
            ))}
            <button onClick={copyRoomId}
              className="w-full mt-4 py-2.5 rounded-xl bg-charcoal-800 text-beige-300 text-sm font-semibold hover:bg-charcoal-700 transition-colors">
              Copy Room ID
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default Room;
