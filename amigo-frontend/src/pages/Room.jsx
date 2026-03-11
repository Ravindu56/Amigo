import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import {
  FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash,
  FaDesktop, FaPhoneSlash, FaComments, FaUserFriends,
  FaChevronRight, FaPaperPlane, FaExpand, FaCompress
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './styles/Room.css';

const SOCKET_SERVER = 'http://localhost:5000';

// ─── Remote Video Tile ──────────────────────────────────────────────────────────
const RemoteVideo = ({ peer, userName }) => {
  const ref = useRef();

  useEffect(() => {
    peer.on('stream', (stream) => {
      if (ref.current) ref.current.srcObject = stream;
    });
  }, [peer]);

  return (
    <div className="video-tile">
      <video ref={ref} autoPlay playsInline />
      <span className="participant-label">{userName || 'Peer'}</span>
    </div>
  );
};

// ─── Room Component ──────────────────────────────────────────────────────────────
const Room = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Room ID from URL param: /room?id=XXXX
  const roomId = searchParams.get('id') || 'amigo-room';

  // ✔ Use authenticated user's fullName — fall back to URL param, then 'You'
  const userName = user?.fullName || searchParams.get('name') || 'You';

  // └─ First initial for avatar placeholder
  const userInitial = userName.charAt(0).toUpperCase();

  // ── Refs ───────────────────────────────────────────────────────────────
  const socketRef      = useRef(null);
  const localVideoRef  = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef       = useRef({});
  const screenStreamRef = useRef(null);
  const chatEndRef     = useRef(null);

  // ── State ──────────────────────────────────────────────────────────────
  const [peers,         setPeers]         = useState([]);
  const [micOn,         setMicOn]         = useState(true);
  const [videoOn,       setVideoOn]       = useState(true);
  const [screenShare,   setScreenShare]   = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [activeTab,     setActiveTab]     = useState('chat');
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [time,          setTime]          = useState(new Date());
  const [messages,      setMessages]      = useState([]);
  const [newMessage,    setNewMessage]    = useState('');
  const [mediaError,    setMediaError]    = useState(null);

  // ── Clock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── WebRTC Initialization ───────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // STEP 1: Camera + mic
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        setMediaError('Camera/Microphone access denied. Please allow permissions in your browser.');
        console.error('getUserMedia failed:', err);
        return;
      }
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // STEP 2: Connect to Socket.IO signaling server
      const socket = io(SOCKET_SERVER);
      socketRef.current = socket;

      // STEP 3: Announce arrival — send real authenticated userName
      socket.emit('join-room', { roomId, userName });

      // STEP 4: Get existing users in room
      socket.on('all-users', (existingSocketIds) => {
        existingSocketIds.forEach((socketId) => {
          const peer = createInitiatorPeer(socketId, socket.id, stream, socket);
          peersRef.current[socketId] = { peer, userName: '' };
          setPeers(prev => [...prev, { socketId, peer, userName: '' }]);
        });
      });

      // STEP 5: New user joined — receive their offer
      socket.on('user-joined', ({ signal, callerID, userName: callerName }) => {
        const peer = createReceiverPeer(signal, callerID, stream, socket);
        peersRef.current[callerID] = { peer, userName: callerName };
        setPeers(prev => [...prev, { socketId: callerID, peer, userName: callerName }]);
      });

      // STEP 6: Receive SDP answer
      socket.on('receiving-returned-signal', ({ signal, id }) => {
        const peerData = peersRef.current[id];
        if (peerData) peerData.peer.signal(signal);
      });

      // STEP 7: User left
      socket.on('user-disconnected', (socketId) => {
        const peerData = peersRef.current[socketId];
        if (peerData) {
          peerData.peer.destroy();
          delete peersRef.current[socketId];
        }
        setPeers(prev => prev.filter(p => p.socketId !== socketId));
      });

      // STEP 8: Incoming chat message
      socket.on('receive-message', ({ message, userName: senderName, time }) => {
        setMessages(prev => [...prev, { user: senderName, text: message, time }]);
      });
    };

    init();

    return () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      screenStreamRef.current?.getTracks().forEach(track => track.stop());
      Object.values(peersRef.current).forEach(({ peer }) => peer.destroy());
      socketRef.current?.disconnect();
    };
  }, [roomId, userName]);

  // ── Peer Helpers ───────────────────────────────────────────────────────────
  const createInitiatorPeer = (userToSignal, callerID, stream, socket) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on('signal', (signal) => {
      socket.emit('sending-signal', { userToSignal, signal, callerID, userName });
    });
    peer.on('error', (err) => console.error('Initiator peer error:', err));
    return peer;
  };

  const createReceiverPeer = (incomingSignal, callerID, stream, socket) => {
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on('signal', (signal) => {
      socket.emit('returning-signal', { signal, callerID });
    });
    peer.on('error', (err) => console.error('Receiver peer error:', err));
    peer.signal(incomingSignal);
    return peer;
  };

  // ── Controls ─────────────────────────────────────────────────────────────
  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setVideoOn(track.enabled); }
  };

  const toggleScreenShare = async () => {
    if (!screenShare) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        Object.values(peersRef.current).forEach(({ peer }) => {
          const sender = peer._pc?.getSenders?.().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        screenTrack.onended = () => stopScreenShare();
        setScreenShare(true);
      } catch (err) {
        console.error('Screen share error:', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    Object.values(peersRef.current).forEach(({ peer }) => {
      const sender = peer._pc?.getSenders?.().find(s => s.track?.kind === 'video');
      if (sender && camTrack) sender.replaceTrack(camTrack);
    });
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setScreenShare(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Use real userName in outgoing chat messages
    setMessages(prev => [...prev, { user: userName, text: newMessage, time: msgTime }]);
    socketRef.current?.emit('send-message', { roomId, message: newMessage, userName, time: msgTime });
    setNewMessage('');
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join?id=${roomId}`);
  };

  const handleEndCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    Object.values(peersRef.current).forEach(({ peer }) => peer.destroy());
    socketRef.current?.disconnect();
    navigate('/dashboard');
  };

  const toggleSidePanel = (tab) => {
    if (sidePanelOpen && activeTab === tab) setSidePanelOpen(false);
    else { setActiveTab(tab); setSidePanelOpen(true); }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="room-container">

      {mediaError && <div className="error-banner">⚠️ {mediaError}</div>}

      {/* 1. Header */}
      <header className="room-header">
        <div className="meeting-info">
          <span className="secure-badge"><FaVideo /> Secure</span>
          <span className="meeting-title">Room: {roomId}</span>
          <span className="timer">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="header-controls">
          <button className="btn-fullscreen" onClick={toggleFullscreen}>
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </header>

      {/* 2. Video Grid */}
      <main className={`main-stage ${sidePanelOpen ? 'shrink' : ''}`}>
        <div className="video-grid">

          {/* Local tile */}
          <div className="video-tile">
            {videoOn
              ? <video ref={localVideoRef} autoPlay playsInline muted />
              : <div className="video-placeholder"><div className="avatar-circle">{userInitial}</div></div>
            }
            <span className="participant-label">
              {userName} (You) {!micOn && <FaMicrophoneSlash className="mic-off-icon" />}
            </span>
          </div>

          {/* Remote tiles */}
          {peers.map(({ socketId, peer, userName: peerName }) => (
            <RemoteVideo key={socketId} peer={peer} userName={peerName} />
          ))}
        </div>
      </main>

      {/* 3. Control Dock */}
      <div className="control-dock">
        <div className="dock-group center">
          <button className={`dock-btn ${!micOn ? 'danger' : ''}`} onClick={toggleMic}>
            {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
            <span>{micOn ? 'Mute' : 'Unmute'}</span>
          </button>
          <button className={`dock-btn ${!videoOn ? 'danger' : ''}`} onClick={toggleVideo}>
            {videoOn ? <FaVideo /> : <FaVideoSlash />}
            <span>{videoOn ? 'Stop Video' : 'Start Video'}</span>
          </button>
          <button className={`dock-btn ${screenShare ? 'active' : ''}`} onClick={toggleScreenShare}>
            <FaDesktop />
            <span>{screenShare ? 'Stop Share' : 'Share'}</span>
          </button>
          <button
            className={`dock-btn ${sidePanelOpen && activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => toggleSidePanel('participants')}
          >
            <FaUserFriends />
            <span>People</span>
            <span className="badge-count">{peers.length + 1}</span>
          </button>
          <button
            className={`dock-btn ${sidePanelOpen && activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => toggleSidePanel('chat')}
          >
            <FaComments />
            <span>Chat</span>
          </button>
        </div>
        <div className="dock-group right">
          <button className="dock-btn end-call" onClick={handleEndCall}>
            <FaPhoneSlash />
            <span>End</span>
          </button>
        </div>
      </div>

      {/* 4. Side Panel */}
      <aside className={`side-panel ${sidePanelOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <h3>{activeTab === 'chat' ? 'Meeting Chat' : `Participants (${peers.length + 1})`}</h3>
          <button className="btn-close-panel" onClick={() => setSidePanelOpen(false)}>
            <FaChevronRight />
          </button>
        </div>

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="panel-content chat-mode">
            <div className="chat-messages">
              {messages.length === 0 && <p className="chat-empty">No messages yet. Say hello! 👋</p>}
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-bubble ${msg.user === userName ? 'mine' : 'theirs'}`}>
                  <div className="bubble-meta">
                    <span className="sender">{msg.user === userName ? 'You' : msg.user}</span>
                    <span className="time">{msg.time}</span>
                  </div>
                  <div className="bubble-text">{msg.text}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form className="chat-input-area" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className="btn-send"><FaPaperPlane /></button>
            </form>
          </div>
        )}

        {/* Participants Tab */}
        {activeTab === 'participants' && (
          <div className="panel-content people-mode">
            <div className="person-row">
              <div className="person-info">
                <div className="person-avatar">{userInitial}</div>
                <span className="person-name">{userName} (You, Host)</span>
              </div>
              <div className="person-status">
                {videoOn ? <FaVideo className="icon-on" /> : <FaVideoSlash className="icon-off" />}
                {micOn   ? <FaMicrophone className="icon-on" /> : <FaMicrophoneSlash className="icon-off" />}
              </div>
            </div>
            {peers.map(({ socketId, userName: peerName }) => (
              <div key={socketId} className="person-row">
                <div className="person-info">
                  <div className="person-avatar">{(peerName || '?').charAt(0).toUpperCase()}</div>
                  <span className="person-name">{peerName || 'Peer'}</span>
                </div>
                <div className="person-status">
                  <FaVideo className="icon-on" />
                  <FaMicrophone className="icon-on" />
                </div>
              </div>
            ))}
            <div className="invite-section">
              <button className="btn-invite-link" onClick={copyInviteLink}>Copy Invite Link</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default Room;
