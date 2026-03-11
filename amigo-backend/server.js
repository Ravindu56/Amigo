require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const db = require('./api/models');

// ─── CUSTOM CONSOLE LOGGER ────────────────────────────────────────────────────
// Formats logs with timestamps, emojis, and categories for easier debugging
const log = (emoji, category, message) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${emoji} [${category}] ${message}`);
};

const app = express();
const server = http.createServer(app);

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());
app.use(cookieParser());

// ─── SOCKET.IO (WebRTC Signaling Server) ──────────────────────────────────────
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// ─── REST ROUTES ──────────────────────────────────────────────────────────────
const authRoutes = require('./api/routes/authRoutes');
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    log('🌐', 'HTTP', 'GET / (Root) endpoint accessed');
    res.send('✅ Amigo Backend Server is Running!');
});

// ─── ROOM REGISTRY ────────────────────────────────────────────────────────────
// rooms: { roomId: [ { socketId, userName } ] }
const rooms = {};

// ─── SOCKET.IO – REAL-TIME WEBRTC SIGNALING ───────────────────────────────────
io.on('connection', (socket) => {
    log('⚡', 'Socket', `New Connection: ${socket.id}`);

    // ── 1. JOIN ROOM ──────────────────────────────────────────────────────────
    socket.on('join-room', ({ roomId, userName }) => {
        socket.join(roomId);

        if (!rooms[roomId]) rooms[roomId] = [];

        // Send list of existing users to the new joiner so they can initiate peers
        const existingSocketIds = rooms[roomId].map(u => u.socketId);
        socket.emit('all-users', existingSocketIds);

        // Register the new user
        rooms[roomId].push({ socketId: socket.id, userName });

        // Notify all other users in the room
        socket.to(roomId).emit('user-connected', { socketId: socket.id, userName });

        log('📌', 'Room', `${userName} joined [${roomId}]. Total users: ${rooms[roomId].length}`);
    });

    // ── 2. SDP OFFER (Initiator → New User) ──────────────────────────────────
    socket.on('sending-signal', ({ userToSignal, signal, callerID, userName }) => {
        log('📡', 'WebRTC', `SDP Offer: ${userName} (${callerID}) ➔ User(${userToSignal})`);
        io.to(userToSignal).emit('user-joined', { signal, callerID, userName });
    });

    // ── 3. SDP ANSWER (Non-Initiator → Initiator) ────────────────────────────
    socket.on('returning-signal', ({ signal, callerID }) => {
        log('📡', 'WebRTC', `SDP Answer: User(${socket.id}) ➔ Initiator(${callerID})`);
        io.to(callerID).emit('receiving-returned-signal', { signal, id: socket.id });
    });

    // ── 4. CHAT MESSAGE RELAY ─────────────────────────────────────────────────
    socket.on('send-message', ({ roomId, message, userName, time }) => {
        log('💬', 'Chat', `Message from ${userName} in [${roomId}]`);
        socket.to(roomId).emit('receive-message', { message, userName, time });
    });

    // ── 5. DISCONNECT ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        log('❌', 'Socket', `Disconnected: ${socket.id}`);

        for (const roomId in rooms) {
            const idx = rooms[roomId].findIndex(u => u.socketId === socket.id);
            if (idx !== -1) {
                const [removed] = rooms[roomId].splice(idx, 1);
                socket.to(roomId).emit('user-disconnected', socket.id);
                
                log('🚪', 'Room', `${removed.userName} left [${roomId}]. Remaining: ${rooms[roomId].length}`);
                
                if (rooms[roomId].length === 0) {
                    delete rooms[roomId];
                    log('🗑️', 'Room', `Room [${roomId}] is empty and was deleted.`);
                }
                break;
            }
        }
    });
});

// ─── DATABASE SYNC ────────────────────────────────────────────────────────────
db.sequelize.sync()
    .then(() => log('✅', 'Database', 'MySQL Synced successfully.'))
    .catch((err) => log('❌', 'Database', 'Sync failed: ' + err.message));

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log('\n==================================================');
    log('🚀', 'Server', `Amigo Backend running on PORT: ${PORT}`);
    log('🔗', 'Server', `URL: http://localhost:${PORT}`);
    log('⚙️', 'Config', `Environment: ${process.env.NODE_ENV || 'development'}`);
    log('📡', 'WebRTC', `Socket.IO Signaling is ACTIVE`);
    console.log('==================================================\n');
});