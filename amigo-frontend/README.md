# 🌿 Amigo Frontend

The React + Vite frontend for the Amigo video meeting platform.

---

## Tech Stack

- **React 18** — UI library
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Utility-first styling (Calm & Collaborative theme)
- **React Router v6** — Client-side routing
- **Socket.IO Client** — Real-time signaling and chat
- **WebRTC** — Peer-to-peer video/audio
- **React Icons** — Icon library

---

## Project Structure

```
amigo-frontend/
├── public/
├── src/
│   ├── assets/              # Static assets (logo, images)
│   ├── components/          # Reusable components
│   │   ├── AuthForm.jsx       # Login / register form
│   │   ├── Header.jsx         # App navigation header
│   │   └── ProtectedRoute.jsx # Auth guard for private routes
│   ├── context/
│   │   └── AuthContext.jsx    # Global auth state (user, login, logout)
│   ├── pages/               # Route-level page components
│   │   ├── WelcomePage.jsx
│   │   ├── AuthPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Room.jsx           # Main video room (WebRTC + chat)
│   │   ├── UserProfile.jsx
│   │   ├── MyMeetings.jsx
│   │   ├── ScheduleMeeting.jsx
│   │   ├── JoinMeeting.jsx
│   │   ├── NewMeeting.jsx
│   │   ├── History.jsx
│   │   ├── Recordings.jsx
│   │   ├── Team.jsx
│   │   └── styles/            # Page-specific CSS
│   ├── services/
│   │   └── api.js             # Axios/fetch API client
│   ├── design-tokens.js       # Shared design constants
│   ├── App.jsx                # Root router + route definitions
│   ├── index.css              # Tailwind base + custom tokens
│   └── main.jsx
├── index.html
├── tailwind.config.js
├── vite.config.js
└── package.json
```

---

## Routes

| Path | Component | Access |
|---|---|---|
| `/` | WelcomePage | Public |
| `/auth` | AuthPage | Public (redirects to `/dashboard` if logged in) |
| `/dashboard` | Dashboard | Protected |
| `/user-profile` | UserProfile | Protected |
| `/meetings` | MyMeetings | Protected |
| `/schedule-meeting` | ScheduleMeeting | Protected |
| `/join` | JoinMeeting | Protected |
| `/new-meeting` | NewMeeting | Protected |
| `/room/:roomId` | Room | Protected |
| `/history` | History | Protected |
| `/recordings` | Recordings | Protected |
| `/team` | Team | Protected |

---

## Auth Architecture

- `AuthContext` stores `user` and `loading` state globally.
- On app mount, `checkSession` calls `GET /api/auth/me` to verify the session cookie. It only sets/clears state — **it never calls `navigate()`** (navigation is handled by `ProtectedRoute` and individual components).
- `localStorage` is used as a warm-start cache so `ProtectedRoute` never flashes a redirect on page refresh.
- `ProtectedRoute` renders children if `user` exists (even while `loading`), shows a spinner if loading with no cache, and redirects to `/auth` only when `!loading && !user`.

---

## Room / WebRTC Architecture

The `Room.jsx` page handles the full WebRTC + Socket.IO lifecycle:

1. **Pre-Join Lobby** — Camera/mic preview before entering the room.
2. **Socket connection** — Created on join. `chat-message` listener registered immediately (not inside `getUserMedia`).
3. **`join-room` emit** — Signals the server; server responds with current `room-participants`.
4. **Offer/Answer/ICE** — Standard WebRTC signaling relayed through the Socket.IO server.
5. **Chat** — Server uses `io.in(roomId)` to broadcast to all (including sender). `isMine` is determined by comparing `senderId` (from server) against `mySocketIdRef.current` (updated on every connect/reconnect).
6. **Cleanup** — On unmount: tracks stopped, all peer connections closed, socket disconnected, named listeners removed via `socket.off`.

---

## Setup

```bash
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_SERVER=http://localhost:5000
```

```bash
# Development
npm run dev

# Production build
npm run build
npm run preview
```

---

## Design System

Amigo uses a custom Tailwind theme called **Calm & Collaborative**:

| Token | Description |
|---|---|
| `beige-*` | Warm background tones |
| `charcoal-*` | Dark text and room UI |
| `sage-*` | Primary brand green |
| `mint-*` | Secondary accent |
| `bg-hero` | Landing page gradient background |
| `font-display` | Heading font |

Custom utilities like `btn-primary`, `btn-secondary`, `btn-icon`, `card-hover`, `input`, and `badge-sage` are defined in `index.css`.
