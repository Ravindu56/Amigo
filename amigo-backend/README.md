# 🌿 Amigo Backend

The Express + Socket.IO backend for the Amigo video meeting platform.

---

## Tech Stack

- **Node.js + Express** — REST API server
- **Socket.IO** — Real-time WebRTC signaling and in-room chat
- **Sequelize ORM** — Database abstraction
- **PostgreSQL** — Primary database
- **JWT** — Authentication tokens stored in HTTP-only cookies
- **bcrypt** — Password hashing
- **cookie-parser** — Cookie middleware
- **cors** — Cross-origin request handling

---

## Project Structure

```
amigo-backend/
├── api/
│   ├── models/          # Sequelize models (User, Meeting, Recording, Team…)
│   ├── routes/          # Express route definitions
│   │   ├── authRoutes.js
│   │   ├── meetingRoutes.js
│   │   ├── recordingRoutes.js
│   │   └── teamRoutes.js
│   └── controllers/     # Route handler logic
├── DB/                  # Database config / migrations
├── utils/               # Shared utilities (JWT helpers, etc.)
├── server.js            # App entry point: Express + Socket.IO
├── knexfile.js          # Knex DB config (used for migrations)
├── .env.example         # Environment variable template
└── package.json
```

---

## REST API

### Auth — `/api/auth`

| Method | Path | Description |
|---|---|---|
| `POST` | `/register` | Register a new user |
| `POST` | `/login` | Login, sets HTTP-only JWT cookie |
| `POST` | `/logout` | Clears the auth cookie |
| `GET` | `/me` | Returns the current authenticated user |

### Meetings — `/api/meetings`

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | List all meetings for the user |
| `POST` | `/` | Create a new meeting |
| `GET` | `/:id` | Get a specific meeting |
| `PUT` | `/:id/end` | Mark a meeting as ended |

### Recordings — `/api/recordings`

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | List recordings for the user |
| `POST` | `/` | Save recording metadata |

### Teams — `/api/teams`

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Get team members |
| `POST` | `/` | Add a team member |
| `DELETE` | `/:id` | Remove a team member |

---

## Socket.IO — Real-time Events

The server acts as a **signaling relay** for WebRTC and handles in-room chat.

### Room State

```js
// rooms: { [roomId]: { [socketId]: { socketId, userName } } }
```

### Client → Server Events

| Event | Payload | Description |
|---|---|---|
| `join-room` | `(roomId, userName)` | Join a room; server responds with `room-participants` |
| `offer` | `(offer, targetSocketId, callerName)` | Forward WebRTC offer to a peer |
| `answer` | `(answer, targetSocketId)` | Forward WebRTC answer to a peer |
| `ice-candidate` | `(candidate, targetSocketId)` | Forward ICE candidate to a peer |
| `chat-message` | `(message, senderName, roomId)` | Send a chat message to the room |

### Server → Client Events

| Event | Payload | Description |
|---|---|---|
| `room-participants` | `[{ socketId, userName }]` | Sent to new joiner with existing participants |
| `user-connected` | `(socketId, userName)` | Broadcast to room when someone joins |
| `user-disconnected` | `(socketId)` | Broadcast to room when someone leaves |
| `offer` | `(offer, callerSocketId, callerName)` | Relayed offer from a peer |
| `answer` | `(answer, senderSocketId)` | Relayed answer from a peer |
| `ice-candidate` | `(candidate, senderSocketId)` | Relayed ICE candidate from a peer |
| `chat-message` | `(message, senderName, senderSocketId)` | Broadcast to all room members including sender |

> **Note:** `chat-message` is broadcast using `io.in(roomId)` which includes the sender. The client uses `senderSocketId === mySocketIdRef.current` to determine if a message is from self.

---

## Setup

```bash
npm install
```

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Fill in the required values:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/amigo
JWT_SECRET=your_super_secret_key
FRONTEND_URL=http://localhost:5173
```

Run database migrations:

```bash
npx knex migrate:latest
```

Start the server:

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

The server runs on `http://localhost:5000`.

---

## CORS

The server allows requests from the following origins (configurable via `FRONTEND_URL` env var):

- `https://amigo-teal.vercel.app`
- `https://amigo-ashy-rho.vercel.app`
- `http://localhost:5173`
- `http://localhost:3000`
- Any URL set in `FRONTEND_URL`

All routes require `credentials: true` — ensure the frontend sends `credentials: 'include'` on all fetch/socket calls.
