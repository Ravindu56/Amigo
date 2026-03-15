# 🌿 Amigo — Team Meeting Platform

> A distraction-free, calm & collaborative video meeting platform built with React, Node.js, Socket.IO, and WebRTC.

![License](https://img.shields.io/badge/license-MIT-green)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20Node.js%20%7C%20WebRTC%20%7C%20Socket.IO-sage)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)

---

## Overview

Amigo is a full-stack video conferencing web application designed to reduce meeting fatigue and help teams collaborate effectively. It supports HD video calls, real-time chat, screen sharing, meeting scheduling, session recording, and team management — all in a clean, warm UI.

---

## Features

- 🎥 **HD Video Calls** — Peer-to-peer WebRTC video with adaptive quality
- 💬 **In-Room Chat** — Real-time messaging during meetings via Socket.IO
- 🖥️ **Screen Sharing** — Share your full screen or a specific window
- 📅 **Meeting Scheduling** — Schedule meetings with date, time and participant management
- 📼 **Session Recording** — Record meetings locally and save metadata to the server
- 👥 **Team Management** — Create and manage team members
- 🔐 **Authentication** — Secure JWT-based auth with HTTP-only cookies
- 👤 **User Profile & Settings** — Update personal info and preferences
- 📊 **Dashboard** — Overview of upcoming meetings, history, and quick actions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Realtime | Socket.IO (WebRTC signaling + chat) |
| Video | WebRTC (native browser APIs) |
| Backend | Node.js, Express.js |
| Database | PostgreSQL via Sequelize ORM |
| Auth | JWT, HTTP-only cookies, bcrypt |
| Deployment | Vercel (frontend), Render/Railway (backend) |

---

## Project Structure

```
Amigo/
├── amigo-frontend/       # React + Vite frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components (Header, AuthForm, ProtectedRoute…)
│   │   ├── context/      # AuthContext — global auth state
│   │   ├── pages/        # Route-level page components
│   │   ├── services/     # API client (api.js)
│   │   └── design-tokens.js
│   └── README.md
│
├── amigo-backend/        # Express + Socket.IO backend
│   ├── api/
│   │   ├── models/       # Sequelize models
│   │   ├── routes/       # REST API route handlers
│   │   └── controllers/  # Business logic
│   ├── utils/
│   ├── server.js         # Express app + Socket.IO signaling
│   └── README.md
│
└── README.md             # ← You are here
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL database
- npm or yarn

### 1. Clone the repository

```bash
git clone https://github.com/Ravindu56/Amigo.git
cd Amigo
```

### 2. Set up the backend

```bash
cd amigo-backend
npm install
cp .env.example .env
# Fill in your .env values (see Environment Variables below)
npm run dev
```

### 3. Set up the frontend

```bash
cd amigo-frontend
npm install
cp .env.example .env
# Fill in your .env values
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:5000`.

---

## Environment Variables

See [`amigo-backend/.env.example`](amigo-backend/.env.example) and [`amigo-frontend`](amigo-frontend/) for all required variables. Key ones:

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | backend | PostgreSQL connection string |
| `JWT_SECRET` | backend | Secret key for signing JWTs |
| `FRONTEND_URL` | backend | Allowed CORS origin (your frontend URL) |
| `VITE_API_URL` | frontend | Backend API base URL |
| `VITE_SOCKET_SERVER` | frontend | Socket.IO server URL |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

<p align="center">Made with 🌿 by the Amigo team</p>
