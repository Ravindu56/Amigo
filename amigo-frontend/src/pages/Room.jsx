/**
 * Room.jsx — WebRTC Video Room
 *
 * FIX 1 — RemoteVideo never showed remote stream:
 *   streamRef.current was mutated inside ontrack but RemoteVideo's useEffect
 *   only depended on the ref object (which never changes). The video element
 *   srcObject was therefore never updated after the initial render.
 *   FIX: store the MediaStream directly in peer state (not inside a ref).
 *   RemoteVideo receives the stream as a plain prop and sets srcObject via
 *   a useEffect that re-runs whenever the stream prop changes.
 *
 * FIX 2 — Peer A never saw Peer B's video (one-way stream):
 *   The signaling flow was:
 *     A joins → B joins → server emits 'user-connected' to A
 *     A creates offer and sends to B
 *     B receives 'offer', creates answer → streams flow A→B only
 *   The problem: when A received 'user-connected' it called addPeer(uid)
 *   where uid = B's socket.id. But when ICE candidates and answers came back
 *   from B, they referenced B's socket.id correctly — that part was fine.
 *   The REAL issue was that ontrack fired but setPeers updated the streamRef
 *   ref object's .current without triggering a React re-render (see FIX 1).
 *   With streams stored in state, both directions now render correctly.
 */
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
  ],
};

// ── RemoteVideo tile ────────────────────────────────────────────────────────────────
// FIX 1: stream is now a plain MediaStream prop (not a ref).
// useEffect re-runs whenever the stream prop changes, so srcObject is always
// set correctly as soon as tracks arrive.
const RemoteVideo = React.memo(({ peerId, peerName, stream }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-slate-800 rounded-2xl overflow-hidden aspect-video
                    flex items-center justify-center">
      <video ref={videoRef} autoPlay playsInline
        className="w-full h-full object-cover" />
      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-slate-600 flex items-center
                          justify-center text-xl font-bold text-white">
            {(peerName || 'P').charAt(0).toUpperCase()}
          </div>
          <p className="text-slate-400 text-xs mt-2">Connecting…</p>
        </div>
      )}
      <span className="absolute bottom-2 left-3 text-xs text-white/80 font-medium
                       bg-black/40 px-2 py-0.5 rounded-full">
        {peerName}
      </span>
    </div>
  );
});
RemoteVideo.displayName = 'RemoteVideo';

// ── PreJoinLobby ────────────────────────────────────────────────────────────────
const PreJoinLobby = ({ title, userName, onJoin, onCancel }) => {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [camOn,  setCamOn]  = useState(true);
  const [micOn,  setMicOn]  = useState(true);
  const [error,  setError]  = useState('');
  const [ready,  setReady]  = useState(false);

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
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOn(v => !v); }
    else setCamOn(false);
  };
  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(v => !v); }
    else setMicOn(false);
  };

  const handleJoin = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    onJoin({ video: camOn, audio: micOn });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-slate-400 text-sm mt-1">Check your camera and mic before joining</p>
        </div>
        <div className="relative bg-slate-800 rounded-2xl overflow-hidden aspect-video
                        flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted
            className={`w-full h-full object-cover transition-opacity duration-300
                        ${camOn ? 'opacity-100' : 'opacity-0'}`} />
          {(!camOn || !ready) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-600 flex items-center justify-center
                              text-2xl font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
              <p className="text-slate-400 text-sm mt-3">
                {camOn ? 'Connecting camera…' : 'Camera off'}
              </p>
            </div>
          )}
          <span className="absolute bottom-3 left-4 text-xs text-white/70 bg-black/40
                           px-2 py-0.5 rounded-full">{userName} (You)</span>
        </div>
        {error && (
          <div className="bg-yellow-900/40 border border-yellow-700 text-yellow-300
                          text-sm px-4 py-2.5 rounded-xl">{error}</div>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={toggleCam}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
                        transition-all duration-200
                        ${camOn
                          ? 'bg-slate-700 text-white hover:bg-slate-600'
                          : 'bg-red-600 text-white hover:bg-red-700'}`}>
            {camOn ? <FaVideo /> : <FaVideoSlash />}
            {camOn ? 'Camera On' : 'Camera Off'}
          </button>
          <button onClick={toggleMic}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
                        transition-all duration-200
                        ${micOn
                          ? 'bg-slate-700 text-white hover:bg-slate-600'
                          : 'bg-red-600 text-white hover:bg-red-700'}`}>
            {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
            {micOn ? 'Mic On' : 'Mic Off'}
          </button>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-semibold
                       hover:bg-slate-600 transition-all duration-200">
            Cancel
          </button>
          <button onClick={handleJoin} disabled={!ready}
            className="flex-1 py-3 rounded-xl bg-sage-500 text-white font-bold
                       hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200">
            {ready ? 'Join Meeting' : 'Connecting…'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────────
const formatMeetingTime = (isoDate) => {
  if (!isoDate) return 'Instant';
  const d = new Date(isoDate);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Today ${timeStr}` : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${timeStr}`;
};

// ── MAIN ROOM ───────────────────────────────────────────────────────────────────────
const Room = () => {
  const navigate   = useNavigate();
  const { roomId } = useParams();
  const location   = useLocation();

  const {
    meetingId = null,
    isHost    = false,
    userName  = 'You',
    title     = `Room ${roomId}`,
  } = location.state || {};

  const [joined,    setJoined]    = useState(false);
  const [initAudio, setInitAudio] = useState(false);
  const [initVideo, setInitVideo] = useState(false);

  const handleLobbyJoin   = useCallback(({ video, audio }) => {
    setInitVideo(video); setInitAudio(audio); setJoined(true);
  }, []);
  const handleLobbyCancel = useCallback(() => navigate('/dashboard'), [navigate]);

  // ── Refs ───────────────────────────────────────────────────────────────────────
  const socketRef         = useRef(null);
  const myVideoRef        = useRef(null);
  const myStreamRef       = useRef(null);
  const isCleanedUp       = useRef(false);
  const hasEndedMeeting   = useRef(false);
  const chatBottomRef     = useRef(null);
  const meetingStartRef   = useRef(null);
  const pcsRef            = useRef(new Map()); // peerId -> { pc, stream }
  const mediaRecorderRef  = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingStartRef = useRef(null);

  // ── State ─────────────────────────────────────────────────────────────────────
  // FIX 1: peers stores { peerId, peerName, stream } where stream is a
  // plain MediaStream that triggers re-renders when updated via setPeers.
  const [peers,           setPeers]           = useState([]);
  const [micOn,           setMicOn]           = useState(false);
  const [videoOn,         setVideoOn]         = useState(false);
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

  // ── WebRTC helpers ────────────────────────────────────────────────────────────
  const createPC = useCallback((peerId, peerName, localStream) => {
    const pc         = new RTCPeerConnection(RTC_CONFIG);
    const remoteStream = new MediaStream();

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // FIX 1: update the stream in React state so RemoteVideo re-renders
    pc.ontrack = (ev) => {
      ev.streams[0]?.getTracks().forEach(t => remoteStream.addTrack(t));
      setPeers(prev => prev.map(p =>
        p.peerId === peerId ? { ...p, stream: remoteStream } : p
      ));
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate && !isCleanedUp.current)
        socketRef.current?.emit('ice-candidate', ev.candidate, peerId);
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        removePeer(peerId);
      }
    };

    return { pc, stream: remoteStream };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addPeer = useCallback((peerId, peerName, localStream) => {
    if (pcsRef.current.has(peerId)) return null;
    const { pc, stream } = createPC(peerId, peerName, localStream);
    pcsRef.current.set(peerId, { pc, stream });
    // FIX 1: store stream (MediaStream) in state, not a ref wrapper
    setPeers(prev => [...prev, { peerId, peerName, stream }]);
    return pc;
  }, [createPC]);

  const removePeer = useCallback((peerId) => {
    const e = pcsRef.current.get(peerId);
    if (e) { try { e.pc.close(); } catch(_){} pcsRef.current.delete(peerId); }
    setPeers(prev => prev.filter(p => p.peerId !== peerId));
  }, []);

  // ── Main Socket + Media ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!joined) return;
    isCleanedUp.current     = false;
    meetingStartRef.current = Date.now();

    const socket = io(SOCKET_SERVER, { withCredentials: true, transports: ['websocket','polling'] });
    socketRef.current = socket;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(async (stream) => {
        if (isCleanedUp.current) { stream.getTracks().forEach(t => t.stop()); return; }

        // Apply lobby preferences
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        if (videoTrack) videoTrack.enabled = initVideo;
        if (audioTrack) audioTrack.enabled = initAudio;

        myStreamRef.current = stream;
        if (myVideoRef.current) myVideoRef.current.srcObject = stream;
        setMicOn(initAudio);
        setVideoOn(initVideo);

        socket.emit('join-room', roomId, socket.id, userName);

        // Existing peer: new user joined — WE initiate the offer
        socket.on('user-connected', async (uid, uname) => {
          if (isCleanedUp.current) return;
          const pc = addPeer(uid, uname || 'Participant', stream);
          if (!pc) return;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', pc.localDescription, uid, userName);
        });

        // New peer: existing user sent us an offer — WE answer
        socket.on('offer', async (inOffer, callerId, callerName) => {
          if (isCleanedUp.current) return;
          const pc = addPeer(callerId, callerName || 'Participant', stream);
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(inOffer));
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          socket.emit('answer', pc.localDescription, callerId);
        });

        socket.on('answer', async (inAns, peerId) => {
          if (isCleanedUp.current) return;
          const e = pcsRef.current.get(peerId);
          if (!e || e.pc.remoteDescription) return;
          await e.pc.setRemoteDescription(new RTCSessionDescription(inAns));
        });

        socket.on('ice-candidate', async (cand, peerId) => {
          if (isCleanedUp.current) return;
          const e = pcsRef.current.get(peerId);
          if (e) await e.pc.addIceCandidate(new RTCIceCandidate(cand)).catch(console.warn);
        });

        socket.on('user-disconnected', (userId, socketId) => {
          // server sends userId first, but we key peers by socket.id
          removePeer(socketId || userId);
        });

        socket.on('chat-message', (msg, senderName, senderId) => {
          if (isCleanedUp.current) return;
          setMessages(prev => [...prev, {
            user: senderId === socket.id ? 'You' : senderName,
            text: msg,
            time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
            mine: senderId === socket.id,
          }]);
        });
      })
      .catch(err => {
        setMediaError(
          err.name === 'NotAllowedError'
            ? 'Camera/microphone access denied. Please allow permissions and refresh.'
            : `Media device error: ${err.message}`
        );
      });

    return () => {
      isCleanedUp.current = true;
      myStreamRef.current?.getTracks().forEach(t => t.stop());
      pcsRef.current.forEach(({ pc }) => { try { pc.close(); } catch(_){} });
      pcsRef.current.clear();
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, roomId]);

  // ── Controls ────────────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const t = myStreamRef.current?.getAudioTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setMicOn(t.enabled);
    socketRef.current?.emit('toggle-audio', !t.enabled);
  }, []);

  const toggleVideo = useCallback(() => {
    const t = myStreamRef.current?.getVideoTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setVideoOn(t.enabled);
    socketRef.current?.emit('toggle-video', !t.enabled);
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
    const mimeType = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4']
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
        } catch (err) {
          setRecordingError('Downloaded but could not save to server.');
        } finally { setRecordingSaving(false); recordedChunksRef.current = []; }
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
    socketRef.current?.emit('chat-message', t, userName);
    setNewMessage('');
  }, [newMessage, userName]);

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

  // ── PRE-JOIN LOBBY ────────────────────────────────────────────────────────────────
  if (!joined) {
    return (
      <PreJoinLobby
        title={title} userName={userName} isHost={isHost} meetingId={meetingId}
        roomId={roomId} onJoin={handleLobbyJoin} onCancel={handleLobbyCancel}
      />
    );
  }

  // ── MEDIA ERROR ─────────────────────────────────────────────────────────────────
  if (mediaError) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <FaVideoSlash className="text-5xl text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Cannot Access Camera / Microphone</h2>
          <p className="text-slate-400 text-sm">{mediaError}</p>
          <button onClick={() => navigate('/dashboard')}
            className="btn-primary w-full py-3">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  // ── MAIN ROOM UI ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col overflow-hidden"
         style={{ height: '100dvh' }}>

      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-2.5
                         bg-slate-800/80 backdrop-blur border-b border-slate-700/50
                         flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-sage-400
                           bg-sage-900/40 px-2.5 py-1 rounded-full">
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
          {recordingSaving && <span className="text-xs text-yellow-400">Saving…</span>}
          {recordingError  && <span className="text-xs text-red-400">{recordingError}</span>}
          <span className="text-slate-400 text-xs">
            {time.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
          </span>
          <button onClick={toggleFullscreen}
            className="w-8 h-8 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600
                       flex items-center justify-center text-sm transition-colors">
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </header>

      {/* VIDEO GRID */}
      <main className={`flex-1 overflow-hidden p-3 transition-all duration-300
                        ${sidePanelOpen ? 'mr-72' : ''}`}>
        <div className={`h-full grid gap-3 auto-rows-fr
          ${ (peers.length + 1) === 1 ? 'grid-cols-1'
           : (peers.length + 1) === 2 ? 'grid-cols-2'
           : (peers.length + 1) <= 4  ? 'grid-cols-2'
           : 'grid-cols-3' }`}>

          {/* LOCAL TILE */}
          <div className="relative bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
            <video ref={myVideoRef} autoPlay playsInline muted
              className={`w-full h-full object-cover transition-opacity duration-300
                          ${videoOn ? 'opacity-100' : 'opacity-0'}`} />
            {!videoOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-slate-600 flex items-center
                                justify-center text-xl font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <span className="absolute bottom-2 left-3 flex items-center gap-1.5
                             text-xs text-white/80 bg-black/40 px-2 py-0.5 rounded-full">
              {userName} (You)
              {!micOn && <FaMicrophoneSlash className="text-red-400 text-[10px]" />}
            </span>
          </div>

          {/* REMOTE TILES — FIX 1: pass stream prop directly */}
          {peers.map(({ peerId, peerName, stream }) => (
            <RemoteVideo key={peerId} peerId={peerId} peerName={peerName} stream={stream} />
          ))}
        </div>
      </main>

      {/* CONTROL DOCK */}
      <div className="flex-shrink-0 flex items-center justify-between
                      px-4 py-3 bg-slate-800/90 backdrop-blur
                      border-t border-slate-700/50 z-10">
        <div className="hidden sm:flex items-center gap-1 text-slate-400 text-xs min-w-[60px]">
          <span className="font-mono text-slate-300">{elapsed}</span>
          <span>elapsed</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button onClick={toggleMic}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium
                        transition-all duration-200
                        ${!micOn ? 'bg-red-600/90 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}>
            {micOn ? <FaMicrophone className="text-base" /> : <FaMicrophoneSlash className="text-base" />}
            <span>{micOn ? 'Mute' : 'Unmute'}</span>
          </button>
          <button onClick={toggleVideo}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium
                        transition-all duration-200
                        ${!videoOn ? 'bg-red-600/90 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}>
            {videoOn ? <FaVideo className="text-base" /> : <FaVideoSlash className="text-base" />}
            <span>{videoOn ? 'Stop Video' : 'Start Video'}</span>
          </button>
          <button onClick={toggleScreenShare}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium
                        transition-all duration-200
                        ${screenShare ? 'bg-sage-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}>
            <FaDesktop className="text-base" />
            <span>{screenShare ? 'Stop Share' : 'Share'}</span>
          </button>
          <button onClick={isRecording ? stopRecording : startRecording} disabled={recordingSaving}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium
                        transition-all duration-200
                        ${isRecording ? 'bg-red-600/90 text-white animate-pulse' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}>
            {isRecording ? <FaStop className="text-base" /> : <FaCircle className="text-base text-red-400" />}
            <span>{isRecording ? 'Stop Rec' : 'Record'}</span>
          </button>
          <button onClick={() => toggleSidePanel('participants')}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium
                        transition-all duration-200 relative
                        ${sidePanelOpen && activeTab === 'participants'
                          ? 'bg-mint-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}>
            <FaUserFriends className="text-base" />
            <span>People</span>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-mint-500
                             text-white text-[9px] font-bold flex items-center justify-center">
              {peers.length + 1}
            </span>
          </button>
          <button onClick={() => toggleSidePanel('chat')}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium
                        transition-all duration-200
                        ${sidePanelOpen && activeTab === 'chat'
                          ? 'bg-mint-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}>
            <FaComments className="text-base" />
            <span>Chat</span>
          </button>
        </div>
        <div className="min-w-[60px] flex justify-end">
          <button onClick={handleEndCall} disabled={endingCall}
            className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl text-xs font-bold
                       bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-all duration-200">
            <FaPhoneSlash className="text-base" />
            <span>{endingCall ? 'Ending…' : isHost ? 'End' : 'Leave'}</span>
          </button>
        </div>
      </div>

      {/* SIDE PANEL */}
      <aside className={`fixed top-0 right-0 h-full w-72 bg-slate-800 border-l border-slate-700
                         flex flex-col transition-transform duration-300 z-20
                         ${sidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-3
                        border-b border-slate-700 flex-shrink-0">
          <h3 className="text-sm font-semibold text-white">
            {activeTab === 'chat' ? 'Meeting Chat' : `Participants (${peers.length + 1})`}
          </h3>
          <button onClick={() => setSidePanelOpen(false)}
            className="w-7 h-7 rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600
                       flex items-center justify-center transition-colors">
            <FaChevronRight className="text-xs" />
          </button>
        </div>

        {/* Chat */}
        {activeTab === 'chat' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <p className="text-center text-slate-500 text-xs mt-8">No messages yet. Say hello! 👋</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-slate-500 mb-0.5">{m.user} · {m.time}</span>
                  <div className={`text-sm px-3 py-2 rounded-xl max-w-[85%] leading-snug
                    ${m.mine ? 'bg-sage-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>
            <form onSubmit={handleSendMessage}
              className="flex gap-2 p-3 border-t border-slate-700 flex-shrink-0">
              <input type="text" placeholder="Type a message…" value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-xl
                           px-3 py-2 text-sm text-white placeholder-slate-500
                           focus:outline-none focus:ring-2 focus:ring-sage-500" />
              <button type="submit"
                className="w-9 h-9 rounded-xl bg-sage-600 text-white hover:bg-sage-700
                           flex items-center justify-center flex-shrink-0 transition-colors">
                <FaPaperPlane className="text-xs" />
              </button>
            </form>
          </div>
        )}

        {/* Participants */}
        {activeTab === 'participants' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-700/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-sage-600 flex items-center justify-center
                                text-sm font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{userName} (You)</p>
                  {isHost && (
                    <span className="text-[10px] bg-sage-600 text-white px-1.5 py-0.5 rounded-full">HOST</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 text-xs">
                {videoOn ? <FaVideo className="text-sage-400" /> : <FaVideoSlash className="text-red-400" />}
                {micOn   ? <FaMicrophone className="text-sage-400" /> : <FaMicrophoneSlash className="text-red-400" />}
              </div>
            </div>
            {peers.map(({ peerId, peerName }) => (
              <div key={peerId} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-700/30">
                <div className="w-8 h-8 rounded-full bg-mint-600 flex items-center justify-center
                                text-sm font-bold text-white">
                  {(peerName || 'P').charAt(0).toUpperCase()}
                </div>
                <p className="text-sm text-slate-200">{peerName || 'Participant'}</p>
              </div>
            ))}
            <button onClick={copyRoomId}
              className="w-full mt-4 py-2.5 rounded-xl bg-slate-700 text-slate-300 text-sm
                         font-semibold hover:bg-slate-600 transition-colors">
              Copy Room ID
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default Room;
