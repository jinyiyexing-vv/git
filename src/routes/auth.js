// src/routes/auth.js - 认证路由
// REQ-01: 注册、登录、登出、当前用户查询

const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const auth = require('../auth');
const { asyncHandler, badRequest, unauthorized, conflict } = require('../util');

const router = express.Router();

// 注册（默认学生角色）
router.post('/register', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || typeof username !== 'string' || username.length < 3 || username.length > 32) {
    return badRequest(res, 'invalid_username', 'username must be 3-32 chars');
  }
  if (!password || typeof password !== 'string' || password.length < 6 || password.length > 64) {
    return badRequest(res, 'invalid_password', 'password must be 6-64 chars');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return badRequest(res, 'invalid_username', 'username must be alphanumeric/underscore');
  }

  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return conflict(res, 'username_taken', 'username already registered');

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, 'student');

  const { token, expires } = auth.createSession(result.lastInsertRowid);
  auth.setSessionCookie(res, token, expires);
  res.status(201).json({ id: result.lastInsertRowid, username, role: 'student' });
}));

// 登录
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return badRequest(res, 'missing_fields', 'username and password required');

  const db = getDb();
  const user = db.prepare('SELECT id, username, password_hash, role, disabled FROM users WHERE username = ?').get(username);
  if (!user) return unauthorized(res, 'invalid_credentials', 'invalid username or password');
  if (user.disabled) return unauthorized(res, 'disabled', 'account has been disabled');
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return unauthorized(res, 'invalid_credentials', 'invalid username or password');
  }

  const { token, expires } = auth.createSession(user.id);
  auth.setSessionCookie(res, token, expires);
  res.json({ id: user.id, username: user.username, role: user.role });
}));

// 登出
router.post('/logout', asyncHandler(async (req, res) => {
  if (req.sessionToken) auth.destroySession(req.sessionToken);
  auth.clearSessionCookie(res);
  res.json({ ok: true });
}));

// 查询当前登录用户
router.get('/me', auth.resolveUser, asyncHandler(async (req, res) => {
  if (!req.user) return unauthorized(res);
  res.json(req.user);
}));

module.exports = router;
