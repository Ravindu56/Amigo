import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Peer from 'simple-peer';
import { io } from 'socket.io-client';
import {
  FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash,
  FaDesktop, FaPhoneSlash, FaComments, FaUserFriends,
  FaChevronRight, FaPaperPlane, FaExpand, FaCompress
} from 'react-icons/fa';
import './styles/Room.css';

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const SOCKET_SERVER = import.meta.env.VITE_SOCKET_SERVER || 'http://localhost:5000';

// ---------------------------------------------------------------------------
// RemoteVideo — isolated component so each peer stream gets its own ref
// Defined OUTSIDE Room to avoid recreation on every parent re-render
// ---------------------------------------------------------------------------
const RemoteVideo = React.memo(({ peer, peerName }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    // Listen for the remote stream once the WebRTC connection is established
    const handleStream = (remoteStream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = remoteStream;
      }
    };

    peer.on('stream', handleStream);

    // Cleanup: remove listener when this component unmounts
    return () => {
      peer.off('stream', handleStream);
    };
  }, [peer]);

  return (
    <div className="video-tile">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
      />
      <span className="participant-label">{peerName}</span>
    </div>
  );
});

RemoteVideo.displayName = 'RemoteVideo';

// ---------------------------------------------------------------------------
// MAIN ROOM COMPONENT
// ---------------------------------------------------------------------------
const Room = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();

  // Read preferences passed from JoinMeeting / NewMeeting via navigate state
  const {
    userName = 'You',
    audio: initAudio = true,
    video: initVideo = true,
  } = location.state || {};

  // --- REFS — values that must NOT trigger re-renders ---
  const socketRef        = useRef(null);   // Socket.IO connection
  const myVideoRef       = useRef(null);   // <video> element for local stream
  const myStreamRef      = useRef(null);   // Local MediaStream
  const peersRef         = useRef([]);     // [{ peerId, peer, peerName }]
  const chatBottomRef    = useRef(null);   // Auto-scroll anchor
  const isCleanedUp      = useRef(false);  // Guard against double-cleanup (React StrictMode)

  // --- STATE — values that DO trigger re-renders ---
  const [peers, setPeers]               = useState([]);   // drives RemoteVideo list
  const [micOn, setMicOn]               = useState(initAudio);
  const [videoOn, setVideoOn]           = useState(initVideo);
  const [screenShare, setScreenShare]   = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [activeTab, setActiveTab]       = useState('chat');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages]         = useState([]);
  const [newMessage, setNewMessage]     = useState('');
  const [time, setTime]                 = useState(new Date());
  const [mediaError, setMediaError]     = useState(null); // show user-facing error

  // ---------------------------------------------------------------------------
  // CLOCK
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // AUTO-SCROLL chat to bottom on new messages
  // ---------------------------------------------------------------------------
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---------------------------------------------------------------------------
  // HELPER: safely add a peer to both ref and state
  // ---------------------------------------------------------------------------
  const addPeerToState = useCallback((peerId, peer, peerName) => {
    // Guard against duplicate peer entries (can happen with fast re-joins)
    if (peersRef.current.find(p => p.peerId === peerId)) return;
    peersRef.current.push({ peerId, peer, peerName });
    setPeers(prev => [...prev, { peerId, peer, peerName }]);
  }, []);

  // ---------------------------------------------------------------------------
  // HELPER: remove a peer from both ref and state
  // ---------------------------------------------------------------------------
  const removePeer = useCallback((userId) => {
    const entry = peersRef.current.find(p => p.peerId === userId);
    if (entry) {
      try { entry.peer.destroy(); } catch (_) {}
    }
    peersRef.current = peersRef.current.filter(p => p.peerId !== userId);
    setPeers(prev => prev.filter(p => p.peerId !== userId));
  }, []);

  // ---------------------------------------------------------------------------
  // HELPER: createPeer — WE initiate (caller)
  // Called when an existing user is already in the room when we arrive,
  // OR when we are already in the room and a new user arrives.
  // ---------------------------------------------------------------------------
  const createPeer = useCallback((targetSocketId, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: true,   // trickle=true streams ICE candidates as they are found (faster)
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    // When simple-peer generates a signal (offer or ICE candidate), forward it
    peer.on('signal', signal => {
      if (!isCleanedUp.current) {
        socketRef.current?.emit('offer', signal, targetSocketId);
      }
    });

    peer.on('error', err => {
      console.error(`[Peer][caller → ${targetSocketId}] Error:`, err.message);
    });

    return peer;
  }, []);

  // ---------------------------------------------------------------------------
  // HELPER: addPeer — THEY initiated (answerer)
  // Called when we receive an offer from someone who joined before us.
  // ---------------------------------------------------------------------------
  const answerPeer = useCallback((incomingSignal, callerSocketId, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', signal => {
      if (!isCleanedUp.current) {
        socketRef.current?.emit('answer', signal, callerSocketId);
      }
    });

    peer.on('error', err => {
      console.error(`[Peer][answerer ← ${callerSocketId}] Error:`, err.message);
    });

    // Feed the incoming offer into simple-peer so it generates an answer
    peer.signal(incomingSignal);

    return peer;
  }, []);

  // ---------------------------------------------------------------------------
  // MAIN EFFECT — runs once on mount, cleans up on unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    isCleanedUp.current = false;

    // 1. Connect to signaling server
    const socket = io(SOCKET_SERVER, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    // 2. Request local camera + microphone
    navigator.mediaDevices
      .getUserMedia({ video: initVideo, audio: initAudio })
      .then(stream => {
        if (isCleanedUp.current) {
          // Component unmounted before promise resolved — stop tracks immediately
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        myStreamRef.current = stream;

        // Attach our own stream to the local <video> element
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }

        // 3. Tell the server we are in this room
        socket.emit('join-room', roomId, socket.id, userName);

        // -----------------------------------------------------------------
        // 4. A NEW user joined AFTER us → we are the CALLER
        //    The server sends us their socketId and name
        // -----------------------------------------------------------------
        socket.on('user-connected', (newUserId, newUserName) => {
          if (isCleanedUp.current) return;
          const peer = createPeer(newUserId, stream);
          addPeerToState(newUserId, peer, newUserName || 'Peer');
        });

        // -----------------------------------------------------------------
        // 5. We are new; an EXISTING user sends us an offer → we ANSWER
        // -----------------------------------------------------------------
        socket.on('offer', (incomingSignal, callerSocketId) => {
          if (isCleanedUp.current) return;
          const peer = answerPeer(incomingSignal, callerSocketId, stream);
          addPeerToState(callerSocketId, peer, 'Peer');
        });

        // -----------------------------------------------------------------
        // 6. Receive an answer to OUR offer
        // -----------------------------------------------------------------
        socket.on('answer', (signal, peerId) => {
          if (isCleanedUp.current) return;
          const entry = peersRef.current.find(p => p.peerId === peerId);
          if (entry) {
            try { entry.peer.signal(signal); } catch (e) {
              console.warn('[answer] Could not signal peer:', e.message);
            }
          }
        });

        // -----------------------------------------------------------------
        // 7. Relay ICE candidates for NAT traversal
        // -----------------------------------------------------------------
        socket.on('ice-candidate', (candidate, peerId) => {
          if (isCleanedUp.current) return;
          const entry = peersRef.current.find(p => p.peerId === peerId);
          if (entry) {
            try { entry.peer.signal(candidate); } catch (e) {
              console.warn('[ice-candidate] Could not signal peer:', e.message);
            }
          }
        });

        // -----------------------------------------------------------------
        // 8. Someone left
        // -----------------------------------------------------------------
        socket.on('user-disconnected', (userId) => {
          removePeer(userId);
        });

        // -----------------------------------------------------------------
        // 9. Receive chat messages (from socket server broadcast)
        // -----------------------------------------------------------------
        socket.on('chat-message', (message, senderName, senderId) => {
          if (isCleanedUp.current) return;
          setMessages(prev => [...prev, {
            user: senderId === socket.id ? 'You' : senderName,
            text: message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            mine: senderId === socket.id,
          }]);
        });
      })
      .catch(err => {
        console.error('getUserMedia error:', err);
        // Show a friendly error instead of a blank broken screen
        setMediaError(
          err.name === 'NotAllowedError'
            ? 'Camera/microphone access was denied. Please allow permissions in your browser and refresh.'
            : `Could not access media devices: ${err.message}`
        );
      });

    // -----------------------------------------------------------------
    // CLEANUP — fires when the component unmounts (user leaves the page)
    // -----------------------------------------------------------------
    return () => {
      isCleanedUp.current = true;

      // Stop all local media tracks (turns off camera/mic LED)
      myStreamRef.current?.getTracks().forEach(t => t.stop());

      // Destroy all peer connections
      peersRef.current.forEach(({ peer }) => {
        try { peer.destroy(); } catch (_) {}
      });
      peersRef.current = [];

      // Disconnect socket
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // Only re-run if roomId changes (navigating to a different room)

  // ---------------------------------------------------------------------------
  // CONTROL HANDLERS
  // ---------------------------------------------------------------------------

  // Mute / Unmute — toggles the actual audio track, notifies peers
  const toggleMic = useCallback(() => {
    const track = myStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
    socketRef.current?.emit('toggle-audio', !track.enabled);
  }, []);

  // Camera on/off — toggles the actual video track, notifies peers
  const toggleVideo = useCallback(() => {
    const track = myStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setVideoOn(track.enabled);
    socketRef.current?.emit('toggle-video', !track.enabled);
  }, []);

  // Screen Share — replaces the video track in every peer connection
  const toggleScreenShare = useCallback(async () => {
    if (!screenShare) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace track sent to every remote peer
        peersRef.current.forEach(({ peer }) => {
          const sender = peer._pc?.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack).catch(console.warn);
        });

        // Show screen in our own preview
        if (myVideoRef.current) myVideoRef.current.srcObject = screenStream;
        setScreenShare(true);

        // When user clicks "Stop sharing" in the browser's native UI
        screenTrack.addEventListener('ended', () => {
          stopScreenShare();
        }, { once: true });
      } catch (err) {
        console.error('Screen share failed:', err);
      }
    } else {
      stopScreenShare();
    }
  }, [screenShare]); // eslint-disable-line

  const stopScreenShare = useCallback(() => {
    const camTrack = myStreamRef.current?.getVideoTracks()[0];
    peersRef.current.forEach(({ peer }) => {
      const sender = peer._pc?.getSenders().find(s => s.track?.kind === 'video');
      if (sender && camTrack) sender.replaceTrack(camTrack).catch(console.warn);
    });
    if (myVideoRef.current) myVideoRef.current.srcObject = myStreamRef.current;
    setScreenShare(false);
  }, []);

  // Send chat message via Socket.IO
  const handleSendMessage = useCallback((e) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    socketRef.current?.emit('chat-message', trimmed, userName);
    setNewMessage('');
  }, [newMessage, userName]);

  // Leave the room cleanly
  const handleEndCall = useCallback(() => {
    myStreamRef.current?.getTracks().forEach(t => t.stop());
    socketRef.current?.disconnect();
    navigate('/dashboard');
  }, [navigate]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Side panel open/close
  const toggleSidePanel = useCallback((tab) => {
    setSidePanelOpen(prev => {
      if (prev && activeTab === tab) return false;
      setActiveTab(tab);
      return true;
    });
  }, [activeTab]);

  // Copy room ID to clipboard for sharing
  const copyRoomId = useCallback(() => {
    navigator.clipboard.writeText(roomId)
      .then(() => alert(`Room ID copied: ${roomId}`))
      .catch(() => prompt('Copy this Room ID:', roomId));
  }, [roomId]);

  // ---------------------------------------------------------------------------
  // MEDIA ERROR SCREEN
  // ---------------------------------------------------------------------------
  if (mediaError) {
    return (
      <div className="room-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          color: 'white', textAlign: 'center', padding: '2rem',
          background: '#1e293b', borderRadius: '12px', maxWidth: '500px'
        }}>
          <FaVideoSlash style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Cannot Access Camera / Microphone</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{mediaError}</p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: '#4f46e5', color: 'white', border: 'none',
              padding: '10px 24px', borderRadius: '8px', cursor: 'pointer'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="room-container">

      {/* ── 1. TOP HEADER ── */}
      <header className="room-header">
        <div className="meeting-info">
          <span className="secure-badge"><FaVideo /> Secure</span>
          <span className="meeting-title">Room: {roomId}</span>
          <span className="timer">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="header-controls">
          <button className="btn-fullscreen" onClick={toggleFullscreen}>
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </header>

      {/* ── 2. VIDEO GRID ── */}
      <main className={`main-stage ${sidePanelOpen ? 'shrink' : ''}`}>
        <div className="video-grid">

          {/* LOCAL VIDEO — always first tile */}
          <div className="video-tile">
            <video
              ref={myVideoRef}
              autoPlay
              playsInline
              muted              /* mute own audio to prevent echo */
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
            />
            <span className="participant-label">
              {userName} (You)
              {!micOn && <FaMicrophoneSlash className="mic-off-icon" />}
            </span>
            {/* Show avatar overlay if camera is off */}
            {!videoOn && (
              <div className="video-placeholder" style={{ position: 'absolute', inset: 0 }}>
                <div className="avatar-circle">{userName.charAt(0).toUpperCase()}</div>
              </div>
            )}
          </div>

          {/* REMOTE VIDEOS — one per connected peer */}
          {peers.map(({ peerId, peer, peerName }) => (
            <RemoteVideo key={peerId} peer={peer} peerName={peerName} />
          ))}

        </div>
      </main>

      {/* ── 3. FLOATING CONTROL DOCK ── */}
      <div className="control-dock">
        <div className="dock-group left">
          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="dock-group center">

          {/* Mute / Unmute */}
          <button
            className={`dock-btn ${!micOn ? 'danger' : ''}`}
            onClick={toggleMic}
            title={micOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
            <span>{micOn ? 'Mute' : 'Unmute'}</span>
          </button>

          {/* Stop / Start Video */}
          <button
            className={`dock-btn ${!videoOn ? 'danger' : ''}`}
            onClick={toggleVideo}
            title={videoOn ? 'Stop camera' : 'Start camera'}
          >
            {videoOn ? <FaVideo /> : <FaVideoSlash />}
            <span>{videoOn ? 'Stop Video' : 'Start Video'}</span>
          </button>

          {/* Screen Share */}
          <button
            className={`dock-btn ${screenShare ? 'active' : ''}`}
            onClick={toggleScreenShare}
            title={screenShare ? 'Stop sharing' : 'Share screen'}
          >
            <FaDesktop />
            <span>{screenShare ? 'Stop Share' : 'Share'}</span>
          </button>

          {/* Participants Panel */}
          <button
            className={`dock-btn ${sidePanelOpen && activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => toggleSidePanel('participants')}
            title="Participants"
          >
            <FaUserFriends />
            <span>People</span>
            <span className="badge-count">{peers.length + 1}</span>
          </button>

          {/* Chat Panel */}
          <button
            className={`dock-btn ${sidePanelOpen && activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => toggleSidePanel('chat')}
            title="Chat"
          >
            <FaComments />
            <span>Chat</span>
          </button>
        </div>

        <div className="dock-group right">
          <button className="dock-btn end-call" onClick={handleEndCall} title="Leave meeting">
            <FaPhoneSlash />
            <span>End</span>
          </button>
        </div>
      </div>

      {/* ── 4. SIDE PANEL ── */}
      <aside className={`side-panel ${sidePanelOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <h3>
            {activeTab === 'chat'
              ? 'Meeting Chat'
              : `Participants (${peers.length + 1})`}
          </h3>
          <button className="btn-close-panel" onClick={() => setSidePanelOpen(false)}>
            <FaChevronRight />
          </button>
        </div>

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="panel-content chat-mode">
            <div className="chat-messages">
              {messages.length === 0 && (
                <p style={{ color: '#475569', textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem' }}>
                  No messages yet. Say hello! 👋
                </p>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`chat-bubble ${msg.mine ? 'mine' : 'theirs'}`}
                >
                  <div className="bubble-meta">
                    <span className="sender">{msg.user}</span>
                    <span className="time">{msg.time}</span>
                  </div>
                  <div className="bubble-text">{msg.text}</div>
                </div>
              ))}
              {/* Invisible anchor for auto-scroll */}
              <div ref={chatBottomRef} />
            </div>
            <form className="chat-input-area" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
              />
              <button type="submit" className="btn-send">
                <FaPaperPlane />
              </button>
            </form>
          </div>
        )}

        {/* PARTICIPANTS TAB */}
        {activeTab === 'participants' && (
          <div className="panel-content people-mode">

            {/* Local user (always first) */}
            <div className="person-row">
              <div className="person-info">
                <div className="person-avatar">{userName.charAt(0).toUpperCase()}</div>
                <span className="person-name">{userName} (You)</span>
              </div>
              <div className="person-status">
                {videoOn
                  ? <FaVideo className="icon-on" />
                  : <FaVideoSlash className="icon-off" />}
                {micOn
                  ? <FaMicrophone className="icon-on" />
                  : <FaMicrophoneSlash className="icon-off" />}
              </div>
            </div>

            {/* Remote peers */}
            {peers.map(({ peerId, peerName }) => (
              <div key={peerId} className="person-row">
                <div className="person-info">
                  <div className="person-avatar">
                    {(peerName || 'P').charAt(0).toUpperCase()}
                  </div>
                  <span className="person-name">{peerName || 'Peer'}</span>
                </div>
              </div>
            ))}

            <div className="invite-section">
              <button className="btn-invite-link" onClick={copyRoomId}>
                Copy Room ID
              </button>
            </div>
          </div>
        )}
      </aside>

    </div>
  );
};

export default Room;
