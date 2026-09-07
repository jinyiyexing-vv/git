// src/routes/admin.js - 管理员路由
// REQ-06：账号禁用 / 启用 / 查询
// 注：server.js 已在挂载点统一加上 requireRole('admin')

const express = require('express');
const { getDb } = require('../db');
const { asyncHandler, badRequest, notFound } = require('../util');

const router = express.Router();

// 查询所有用户（支持角色、关键字筛选）
// GET /api/admin/users?role=student&q=stu
router.get('/users', asyncHandler(async (req, res) => {
  const { role, q } = req.query;
  const db = getDb();

  let sql = 'SELECT id, username, role, disabled, created_at FROM users WHERE 1=1';
  const params = [];
  if (role) { sql += ' AND role = ?'; params.push(role); }
  if (q) { sql += ' AND username LIKE ?'; params.push(`%${q}%`); }
  sql += ' ORDER BY id ASC';

  const rows = db.prepare(sql).all(...params);
  res.json({ total: rows.length, items: rows });
}));

// 禁用账号
// POST /api/admin/users/:id/disable
router.post('/users/:id/disable', asyncHandler(async (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, role, disabled FROM users WHERE id = ?').get(req.params.id);
  if (!user) return notFound(res, 'user not found');
  if (user.role === 'admin') return badRequest(res, 'cannot_disable_admin', 'cannot disable admin account');
  if (user.disabled) return res.json({ ok: true, already: 'disabled' });

  // 禁用同时吊销所有 session
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE users SET disabled = 1 WHERE id = ?').run(user.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) { /* ignore */ }
    throw err;
  }
  res.json({ ok: true, username: user.username, disabled: 1 });
}));

// 启用账号
// POST /api/admin/users/:id/enable
router.post('/users/:id/enable', asyncHandler(async (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, disabled FROM users WHERE id = ?').get(req.params.id);
  if (!user) return notFound(res, 'user not found');
  if (!user.disabled) return res.json({ ok: true, already: 'enabled' });

  db.prepare('UPDATE users SET disabled = 0 WHERE id = ?').run(user.id);
  res.json({ ok: true, username: user.username, disabled: 0 });
}));

module.exports = router;
