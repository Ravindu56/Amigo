/**
 * api.js — Centralised API service layer for Amigo
 *
 * FIX (401 interceptor): if ANY non-auth request returns 401, clear
 * localStorage and redirect to /auth (token expired / missing).
 *
 * FIX (meetingAPI.join): Added join() helper that was called in JoinMeeting.jsx
 * but was missing from this file, causing "meetingAPI.join is not a function".
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------
const request = async (method, path, body = null) => {
  const options = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };

  if (body !== null) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, options);

  let data;
  try {
    data = await res.json();
  } catch {
    data = { message: res.statusText };
  }

  // Global 401 handler — token expired or missing
  if (res.status === 401 && !path.startsWith('/api/auth')) {
    localStorage.removeItem('amigo_user');
    window.location.href = '/auth';
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }

  return data;
};

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------
export const authAPI = {
  register:      (body) => request('POST', '/api/auth/register', body),
  login:         (body) => request('POST', '/api/auth/login',    body),
  logout:        ()     => request('POST', '/api/auth/logout'),
  getMe:         ()     => request('GET',  '/api/auth/me'),
  updateProfile: (body) => request('PUT',  '/api/auth/profile',  body),
};

// ---------------------------------------------------------------------------
// Meeting API
// ---------------------------------------------------------------------------
export const meetingAPI = {
  create:      (body)         => request('POST',   '/api/meetings',             body),
  getMy:       ()             => request('GET',    '/api/meetings/my'),
  getHistory:  ()             => request('GET',    '/api/meetings/history'),
  getStats:    ()             => request('GET',    '/api/meetings/stats'),
  getByRoomId: (roomId)       => request('GET',    `/api/meetings/${roomId}`),
  update:      (roomId, body) => request('PUT',    `/api/meetings/${roomId}`,   body),
  start:       (roomId)       => request('PUT',    `/api/meetings/${roomId}/start`),
  end:         (roomId)       => request('PUT',    `/api/meetings/${roomId}/end`),
  delete:      (roomId)       => request('DELETE', `/api/meetings/${roomId}`),

  /**
   * join(roomId, passcode?)
   *
   * FIX: This method was called in JoinMeeting.jsx but was missing from this
   * file entirely, causing "meetingAPI.join is not a function" at runtime.
   *
   * The backend has no dedicated POST /join endpoint. The correct flow is:
   *   1. GET /api/meetings/:roomId  — verify the room exists
   *   2. If the meeting has a passcode set, validate it client-side
   *   3. Return the meeting object so the caller can navigate to /room/:roomId
   *
   * @param {string} roomId   - The room ID entered by the user
   * @param {string} passcode - The passcode entered (can be empty string)
   * @returns {Promise<Meeting>} the meeting object
   * @throws if room not found, passcode wrong, or meeting already ended
   */
  join: async (roomId, passcode = '') => {
    // Step 1: fetch the meeting — throws if 404 (room not found)
    const meeting = await request('GET', `/api/meetings/${roomId}`);

    // Step 2: if the meeting has a passcode, validate it
    if (meeting.passcode && meeting.passcode.trim() !== '') {
      if (passcode.trim() !== meeting.passcode.trim()) {
        throw new Error('Incorrect passcode. Please try again.');
      }
    }

    // Step 3: reject if the meeting has already ended
    if (meeting.status === 'ended') {
      throw new Error('This meeting has already ended.');
    }

    return meeting;
  },
};

// ---------------------------------------------------------------------------
// Recording API
// ---------------------------------------------------------------------------
export const recordingAPI = {
  getMy:  ()     => request('GET',    '/api/recordings'),
  create: (body) => request('POST',   '/api/recordings', body),
  delete: (id)   => request('DELETE', `/api/recordings/${id}`),
};

// ---------------------------------------------------------------------------
// Team API
// ---------------------------------------------------------------------------
export const teamAPI = {
  getMy:        ()               => request('GET',    '/api/teams'),
  create:       (body)           => request('POST',   '/api/teams',                   body),
  update:       (teamId, body)   => request('PUT',    `/api/teams/${teamId}`,          body),
  delete:       (teamId)         => request('DELETE', `/api/teams/${teamId}`),
  addMember:    (teamId, body)   => request('POST',   `/api/teams/${teamId}/members`, body),
  removeMember: (teamId, userId) => request('DELETE', `/api/teams/${teamId}/members/${userId}`),
};
