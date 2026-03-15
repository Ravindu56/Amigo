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
  'https://amigo-teal.vercel.app',
  'https://amigo-ashy-rho.vercel.app',
  'https://amigo-git-master-ravindu56s-projects.vercel.app',
  'https://amigo-df3s7ag6i-ravindu56s-projects.vercel.app',
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

app.use(express.json());
app.use(cookieParser());

// ── REST API Routes ───────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/meetings',   meetingRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/teams',      teamRoutes);

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

// rooms: { roomId: { socketId: { socketId, userName } } }
const rooms = {};

io.on('connection', (socket) => {
  console.log(`⚡ New connection: ${socket.id}`);

  socket.on('join-room', (roomId, userName) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = {};
    rooms[roomId][socket.id] = { socketId: socket.id, userName };

    const others = Object.values(rooms[roomId]).filter(u => u.socketId !== socket.id);
    console.log(`✅ ${userName} [${socket.id}] joined [${roomId}] — ${Object.keys(rooms[roomId]).length} user(s)`);

    // Tell the NEW joiner about everyone already in the room
    socket.emit('room-participants', others);

    // Tell EXISTING peers a new user joined (send new user's socketId + name)
    socket.to(roomId).emit('user-connected', socket.id, userName);
  });

  // Relay offer: sender sends { offer, targetSocketId, callerName }
  // Server forwards to target with sender's socket.id so target can reply
  socket.on('offer', (offer, targetSocketId, callerName) => {
    io.to(targetSocketId).emit('offer', offer, socket.id, callerName);
  });

  socket.on('answer', (answer, targetSocketId) => {
    io.to(targetSocketId).emit('answer', answer, socket.id);
  });

  socket.on('ice-candidate', (candidate, targetSocketId) => {
    io.to(targetSocketId).emit('ice-candidate', candidate, socket.id);
  });

  socket.on('chat-message', (message, senderName, roomId) => {
    io.in(roomId).emit('chat-message', message, senderName, socket.id);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    // Find which room this socket was in and notify peers
    for (const roomId of Object.keys(rooms)) {
      if (rooms[roomId][socket.id]) {
        const { userName } = rooms[roomId][socket.id];
        delete rooms[roomId][socket.id];
        console.log(`❌ ${userName} left room [${roomId}]`);
        io.to(roomId).emit('user-disconnected', socket.id);
        if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
        break;
      }
    }
  });
});

// ── Database sync + Server start ──────────────────────────────────────────
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
