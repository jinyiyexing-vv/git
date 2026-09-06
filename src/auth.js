// src/auth.js - 会话中间件
// 自实现的 token 会话：登录后下发 32 字节 token，Cookie 携带，7 天有效

const crypto = require('crypto');
const { getDb } = require('./db');

const COOKIE_NAME = 'session_token';
const SESSION_TTL_DAYS = 7;

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > 0) out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

function createSession(userId) {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  return { token, expires };
}

function destroySession(token) {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function resolveUser(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  req.user = null;
  req.sessionToken = token || null;
  if (token) {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT u.id, u.username, u.role, u.disabled, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ?`
      )
      .get(token);
    if (row && row.expires_at > new Date().toISOString().slice(0, 19).replace('T', ' ')) {
      if (row.disabled) {
        return res.status(401).json({ error: 'disabled', message: 'account has been disabled' });
      }
      req.user = { id: row.id, username: row.username, role: row.role };
    }
  }
  next();
}

function requireLogin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'unauthorized', message: 'login required' });
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized', message: 'login required' });
    if (req.user.role !== role) return res.status(403).json({ error: 'forbidden', message: `requires role=${role}` });
    next();
  };
}

function setSessionCookie(res, token, expires) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expires.replace(' ', 'T') + 'Z').toUTCString()}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
}

module.exports = {
  COOKIE_NAME,
  createSession,
  destroySession,
  resolveUser,
  requireLogin,
  requireRole,
  setSessionCookie,
  clearSessionCookie,
};
