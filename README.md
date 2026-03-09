# 🤝 Amigo — Real-Time Video Conferencing

> A full-stack WebRTC video conferencing application built with **React + Vite** (frontend) and **Node.js + Express + Socket.IO** (backend). Enables real-time peer-to-peer video, audio, screen sharing, and text chat.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture & WebRTC Flow](#architecture--webrtc-flow)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Socket.IO Events](#socketio-events)
- [Pages & Routes](#pages--routes)
- [Assignment Context](#assignment-context)

---

## Overview

Amigo is a browser-based video conferencing platform where users can create or join meeting rooms and communicate in real-time using **WebRTC peer-to-peer technology**. The signaling server (built with Socket.IO) coordinates the connection handshake between peers — after that, audio and video travel directly between browsers without going through the server.

---

## ✨ Features

| Feature | Status | Description |
|---|---|---|
| 📹 Live Video Calling | ✅ Done | Real camera stream via `getUserMedia()` + WebRTC |
| 🎤 Live Audio | ✅ Done | Real microphone stream, peer-to-peer |
| 🔇 Mute / Unmute | ✅ Done | Disables audio track at hardware level |
| 📷 Camera Toggle | ✅ Done | Disables video track, sends black frame |
| 🖥️ Screen Sharing | ✅ Done | `getDisplayMedia()` + live track replacement |
| 💬 Text Chat | ✅ Done | Real-time via Socket.IO relay |
| 👥 Participants List | ✅ Done | Live count, updates as users join/leave |
| 🔗 Invite Link | ✅ Done | Copies `/join?id=ROOMID` to clipboard |
| 🔐 User Authentication | ✅ Done | Register/Login with bcrypt + JWT cookies |
| 🪪 Personal Meeting ID | ✅ Done | Auto-generated unique 9-digit PMI per user |
| 📅 Schedule Meeting | ✅ Done | Book future meetings via UI |
| 👤 User Profile | ✅ Done | Account settings and avatar management |
| 📱 Fullscreen Mode | ✅ Done | Browser Fullscreen API |

---

## 🛠 Tech Stack

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | ^19 | UI framework |
| Vite | ^7 | Dev server & bundler |
| React Router DOM | ^7 | Client-side routing |
| Socket.IO Client | ^4.8 | WebRTC signaling connection |
| Simple-Peer | ^9.11 | WebRTC `RTCPeerConnection` wrapper |
| Framer Motion | ^12 | Auth form animations |
| React Icons | ^5 | Icon library (Font Awesome) |
| Axios | ^1 | HTTP requests to REST API |

### Backend
| Package | Version | Purpose |
|---|---|---|
| Express | ^5 | REST API framework |
| Socket.IO | ^4.8 | Real-time WebRTC signaling |
| Sequelize | ^6 | ORM for database models |
| MySQL2 | ^3 | MySQL database driver |
| bcryptjs | ^3 | Password hashing |
| jsonwebtoken | ^9 | JWT auth token generation |
| cookie-parser | ^1 | JWT cookie handling |
| dotenv | ^17 | Environment variable management |
| nodemon | ^3 | Dev hot-reload |

---

## 📁 Project Structure

```
Amigo/
├── amigo-frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── WelcomePage.jsx      # Landing page with typewriter animation
│   │   │   ├── AuthPage.jsx         # Auth page wrapper
│   │   │   ├── Dashboard.jsx        # Meeting hub & history
│   │   │   ├── NewMeeting.jsx       # Configure & launch meeting
│   │   │   ├── JoinMeeting.jsx      # Join by meeting ID
│   │   │   ├── Room.jsx             # ⭐ Core WebRTC meeting room
│   │   │   ├── ScheduleMeeting.jsx  # Book a future meeting
│   │   │   └── UserProfile.jsx      # Account management
│   │   ├── components/
│   │   │   ├── AuthForm.jsx         # Login / Register form
│   │   │   ├── Header.jsx           # Navigation bar
│   │   │   └── Footer.jsx           # Footer
│   │   ├── App.jsx                  # Router & route definitions
│   │   └── main.jsx                 # React entry point
│   ├── package.json
│   └── vite.config.js
│
└── amigo-backend/           # Node.js + Express backend
    ├── server.js                    # ⭐ Express + Socket.IO entry point
    ├── api/
    │   ├── models/
    │   │   ├── User.js              # Sequelize User model
    │   │   └── index.js             # DB connection setup
    │   ├── controllers/
    │   │   └── authController.js    # Register / Login / Logout logic
    │   └── routes/
    │       └── authRoutes.js        # POST /api/auth routes
    ├── utils/
    │   └── generateToken.js         # JWT token generator
    ├── DB/                          # Database config
    ├── knexfile.js                  # DB migration config
    ├── .env                         # Environment variables
    └── package.json
```

---

## 🔄 Architecture & WebRTC Flow

WebRTC needs a **signaling server** only to exchange connection metadata (SDP offer/answer and ICE candidates). Once the handshake is complete, all audio/video data flows **directly peer-to-peer** — the server is no longer involved.

```
┌─────────────────────────────────────────────────────────────────┐
│                        SIGNALING PHASE                          │
│                     (via Socket.IO server)                      │
│                                                                 │
│   Browser A                Server               Browser B       │
│      │                       │                      │           │
│      │── join-room ─────────>│                      │           │
│      │<─ all-users: [] ──────│                      │           │
│      │                       │                      │           │
│      │                       │<─── join-room ────────│           │
│      │                       │──── all-users:[A] ───>│           │
│      │                       │                      │           │
│      │                       │<─ sending-signal ─────│ (offer)   │
│      │<─ user-joined ────────│                      │           │
│      │── returning-signal ──>│                      │ (answer)  │
│      │                       │─ returned-signal ────>│           │
│      │                       │                      │           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     P2P MEDIA PHASE                             │
│              (direct browser-to-browser, no server)             │
│                                                                 │
│   Browser A  ◄──────── Video / Audio / Data ────────►  Browser B│
│                     RTCPeerConnection (WebRTC)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- MySQL database running locally
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/deshanWimalasooriya/Amigo.git
cd Amigo
git checkout backend
```

### 2. Set Up the Backend

```bash
cd amigo-backend
npm install
```

Create a `.env` file (see [Environment Variables](#environment-variables)), then:

```bash
npm run dev
# Server starts at http://localhost:5000
# Socket.IO WebRTC Signaling: ACTIVE
```

### 3. Set Up the Frontend

```bash
cd ../amigo-frontend
npm install
npm run dev
# Frontend starts at http://localhost:5173
```

### 4. Test a Video Call

Open **two browser tabs** (or two different browsers) and navigate to:

```
Tab 1: http://localhost:5173/room?id=test-room&name=Alice
Tab 2: http://localhost:5173/room?id=test-room&name=Bob
```

Both tabs must use the **same `id`** to join the same room. You will be prompted to allow camera and microphone access.

---

## 🔐 Environment Variables

Create `amigo-backend/.env`:

```env
# Server
PORT=5000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=amigo_db

# JWT
JWT_SECRET=your_super_secret_jwt_key
NODE_ENV=development
```

---

## 📡 API Reference

Base URL: `http://localhost:5000/api`

### Auth Routes

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | `{ fullName, email, password }` | Register new user, auto-assigns PMI |
| `POST` | `/api/auth/login` | `{ email, password }` | Login, returns JWT in cookie |
| `POST` | `/api/auth/logout` | — | Clears JWT cookie |

#### Register Response
```json
{
  "id": 1,
  "fullName": "Alex Sterling",
  "email": "alex@example.com",
  "pmi": "394201992"
}
```

#### Login Response
```json
{
  "id": 1,
  "fullName": "Alex Sterling",
  "email": "alex@example.com",
  "pmi": "394201992",
  "avatar": ""
}
```

---

## 📡 Socket.IO Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join-room` | `{ roomId, userName }` | Join a meeting room |
| `sending-signal` | `{ userToSignal, signal, callerID, userName }` | Send SDP offer to an existing peer |
| `returning-signal` | `{ signal, callerID }` | Send SDP answer back to the initiator |
| `send-message` | `{ roomId, message, userName, time }` | Broadcast a chat message to the room |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `all-users` | `[socketId, ...]` | List of users already in the room |
| `user-connected` | `{ socketId, userName }` | A new user joined |
| `user-joined` | `{ signal, callerID, userName }` | Incoming SDP offer from a new user |
| `receiving-returned-signal` | `{ signal, id }` | SDP answer from an existing user |
| `receive-message` | `{ message, userName, time }` | Incoming chat message |
| `user-disconnected` | `socketId` | A user left the room |

---

## 🗺 Pages & Routes

| URL | Component | Description |
|---|---|---|
| `/` | `WelcomePage` | Marketing landing page |
| `/auth` | `AuthPage` | Login / Register |
| `/dashboard` | `Dashboard` | Meeting hub |
| `/new-meeting` | `NewMeeting` | Configure & start a meeting |
| `/join` | `JoinMeeting` | Join by meeting ID |
| `/room?id=ROOM&name=NAME` | `Room` | Live WebRTC meeting room |
| `/schedule-meeting` | `ScheduleMeeting` | Book a future meeting |
| `/dashboard/user-profile` | `UserProfile` | Account settings |

---

## 🎓 Assignment Context

This project was built for **EC9520 – Advanced Computer and Data Network**, Assignment 1 at the **University of Jaffna, Faculty of Engineering**.

**Assignment Title:** Real-Time Video Conferencing Application with WebRTC  
**Objective:** Build a functional real-time video conferencing application using WebRTC technology, enabling peer-to-peer communication with video, audio, and text chat.

### Requirements Checklist

- [x] Peer-to-peer video and audio via WebRTC
- [x] Text chat integration alongside video call
- [x] Mute / Unmute audio control
- [x] Camera toggle control
- [x] Web-based application
- [ ] Hosted deployment (Vercel / GitHub Pages)
- [ ] Project report (architecture, challenges, implementation details)
- [ ] Demo video (max 8 minutes)

---

<p align="center">
  Built with ❤️ using WebRTC, React, and Node.js
</p>
