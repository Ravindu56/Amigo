/**
 * api.js — Centralised API service layer for Amigo
 *
 * FIX: Added global 401 interceptor — if ANY request returns 401 (token
 * expired / missing), we clear the localStorage flag and redirect to /auth.
 * This fixes the "No token" error that occurred on page refresh.
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------
const request = async (method, path, body = null) => {
  const options = {
    method,
    credentials: 'include',          // always send the httpOnly JWT cookie
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
  // Do NOT redirect on /api/auth/* routes (login / register / me)
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
  login:         (body) => request('POST', '/api/auth/login', body),
  logout:        ()     => request('POST', '/api/auth/logout'),
  getMe:         ()     => request('GET',  '/api/auth/me'),
  updateProfile: (body) => request('PUT',  '/api/auth/profile', body),
};

// ---------------------------------------------------------------------------
// Meeting API
// ---------------------------------------------------------------------------
export const meetingAPI = {
  create:      (body)          => request('POST',   '/api/meetings',              body),
  getMy:       ()              => request('GET',    '/api/meetings/my'),
  getHistory:  ()              => request('GET',    '/api/meetings/history'),
  getStats:    ()              => request('GET',    '/api/meetings/stats'),
  getByRoomId: (roomId)        => request('GET',    `/api/meetings/${roomId}`),
  update:      (roomId, body)  => request('PUT',    `/api/meetings/${roomId}`,    body),
  start:       (roomId)        => request('PUT',    `/api/meetings/${roomId}/start`),
  end:         (roomId)        => request('PUT',    `/api/meetings/${roomId}/end`),
  delete:      (roomId)        => request('DELETE', `/api/meetings/${roomId}`),
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
  getMy:        ()              => request('GET',    '/api/teams'),
  create:       (body)          => request('POST',   '/api/teams',                    body),
  update:       (teamId, body)  => request('PUT',    `/api/teams/${teamId}`,           body),
  delete:       (teamId)        => request('DELETE', `/api/teams/${teamId}`),
  addMember:    (teamId, body)  => request('POST',   `/api/teams/${teamId}/members`,  body),
  removeMember: (teamId, userId)=> request('DELETE', `/api/teams/${teamId}/members/${userId}`),
};
