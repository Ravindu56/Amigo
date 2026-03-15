require('dotenv').config();
const express      = require('express');
const http         = require('http');
const { Server }   = require('socket.io');
const cookieParser = require('cookie-parser');
const cors         = require('cors');
const db           = require('./api/models');

// ── Route imports ─────────────────────────────────────────────────────────
const authRoutes      = require('./api/routes/authRoutes');
const meetingRoutes   = require('./api/routes/meetingRoutes');
const recordingRoutes = require('./api/routes/recordingRoutes');
const teamRoutes      = require('./api/routes/teamRoutes');

// ── App Init ──────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
};

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// ── REST API Routes ───────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/meetings',   meetingRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/teams',      teamRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: '✅ Amigo Backend is running!', version: '2.0' });
});

// ── Socket.IO — WebRTC Signaling ──────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  },
});

// Room tracking: { roomId: [{ socketId, userId, userName }] }
const rooms = {};

io.on('connection', (socket) => {
  console.log(`⚡ New connection: ${socket.id}`);

  socket.on('join-room', (roomId, userId, userName) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ socketId: socket.id, userId, userName });

    console.log(`✅ ${userName} joined room [${roomId}] — ${rooms[roomId].length} user(s)`);

    // Tell everyone else a new user arrived
    socket.to(roomId).emit('user-connected', userId, userName);

    // Send the joining user the current participant list (excluding themselves)
    const others = rooms[roomId].filter(u => u.socketId !== socket.id);
    socket.emit('room-participants', others);

    // ── WebRTC signaling ──────────────────────────────────────────────
    socket.on('offer', (offer, targetSocketId) => {
      io.to(targetSocketId).emit('offer', offer, socket.id);
    });

    socket.on('answer', (answer, targetSocketId) => {
      io.to(targetSocketId).emit('answer', answer, socket.id);
    });

    socket.on('ice-candidate', (candidate, targetSocketId) => {
      io.to(targetSocketId).emit('ice-candidate', candidate, socket.id);
    });

    // ── In-room chat ──────────────────────────────────────────────────
    socket.on('chat-message', (message, senderName) => {
      io.in(roomId).emit('chat-message', message, senderName, socket.id);
    });

    // ── Media state sync ──────────────────────────────────────────────
    socket.on('toggle-audio', (isMuted) => {
      socket.to(roomId).emit('peer-audio-toggle', socket.id, isMuted);
    });

    socket.on('toggle-video', (isOff) => {
      socket.to(roomId).emit('peer-video-toggle', socket.id, isOff);
    });

    // ── Screen share ──────────────────────────────────────────────────
    socket.on('screen-share-started', () => {
      socket.to(roomId).emit('peer-screen-share-started', socket.id);
    });

    socket.on('screen-share-stopped', () => {
      socket.to(roomId).emit('peer-screen-share-stopped', socket.id);
    });

    // ── Disconnect ────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`❌ ${userName} left room [${roomId}]`);
      socket.to(roomId).emit('user-disconnected', userId, socket.id);
      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter(u => u.socketId !== socket.id);
        if (rooms[roomId].length === 0) delete rooms[roomId];
      }
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

// ── Database sync + Server start ──────────────────────────────────────────
// alter:true safely updates tables without dropping existing data
db.sequelize.sync({ alter: true })
  .then(() => console.log('✅ Database synced (alter mode).'))
  .catch(err => console.error('❌ DB sync failed:', err.message));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Amigo backend running on http://localhost:${PORT}`);
  console.log(`   Auth       → /api/auth`);
  console.log(`   Meetings   → /api/meetings`);
  console.log(`   Recordings → /api/recordings`);
  console.log(`   Teams      → /api/teams`);
});
