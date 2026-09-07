// src/routes/registrations.js - 报名路由
// REQ-03 学生报名（去重、状态、容量校验）；REQ-05 教师查看名单

const express = require('express');
const { getDb } = require('../db');
const { requireLogin, requireRole } = require('../auth');
const { asyncHandler, forbidden, notFound, conflict } = require('../util');

const router = express.Router();

// 学生报名活动
// POST /api/activities/:id/registrations
router.post('/:id/registrations', requireLogin, requireRole('student'), asyncHandler(async (req, res) => {
  const db = getDb();
  const activityId = parseInt(req.params.id, 10);
  if (!Number.isInteger(activityId)) return notFound(res, 'activity not found');

  const act = db.prepare('SELECT id, status, capacity, current_count FROM activities WHERE id = ?').get(activityId);
  if (!act) return notFound(res, 'activity not found');
  if (act.status !== 'open') return conflict(res, 'activity_closed', 'activity is closed');
  if (act.current_count >= act.capacity) return conflict(res, 'activity_full', 'no remaining capacity');

  const exists = db.prepare(
    'SELECT id FROM registrations WHERE activity_id = ? AND user_id = ?'
  ).get(activityId, req.user.id);
  if (exists) return conflict(res, 'already_registered', 'already registered');

  // 事务内再次校验容量，防并发超卖（node:sqlite 无 transaction 助手，手动 BEGIN/COMMIT）
  try {
    db.exec('BEGIN IMMEDIATE');
    const fresh = db.prepare('SELECT current_count, capacity FROM activities WHERE id = ?').get(activityId);
    if (fresh.current_count >= fresh.capacity) {
      const err = new Error('no remaining capacity');
      err.code = 'activity_full';
      throw err;
    }
    const r = db.prepare(
      'INSERT INTO registrations (activity_id, user_id) VALUES (?, ?)'
    ).run(activityId, req.user.id);
    db.prepare('UPDATE activities SET current_count = current_count + 1 WHERE id = ?').run(activityId);
    db.exec('COMMIT');
    res.status(201).json({ id: Number(r.lastInsertRowid), activity_id: activityId, user_id: req.user.id });
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) { /* ignore */ }
    if (err.code === 'activity_full') return conflict(res, 'activity_full', err.message);
    if (String(err.message).includes('UNIQUE')) return conflict(res, 'already_registered', 'already registered');
    throw err;
  }
}));

// 取消报名（学生）
// DELETE /api/activities/:id/registrations/me
router.delete('/:id/registrations/me', requireLogin, requireRole('student'), asyncHandler(async (req, res) => {
  const db = getDb();
  const activityId = parseInt(req.params.id, 10);
  const reg = db.prepare(
    'SELECT id FROM registrations WHERE activity_id = ? AND user_id = ?'
  ).get(activityId, req.user.id);
  if (!reg) return notFound(res, 'registration not found');

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM registrations WHERE id = ?').run(reg.id);
    db.prepare('UPDATE activities SET current_count = MAX(current_count - 1, 0) WHERE id = ?').run(activityId);
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) { /* ignore */ }
    throw err;
  }
  res.json({ ok: true });
}));

// 我的报名（学生）—— 必须先于 /:id/registrations 注册，避免被吞
// GET /api/activities/registrations/mine
router.get('/registrations/mine', requireLogin, requireRole('student'), asyncHandler(async (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT r.id AS registration_id, r.registered_at,
           a.id, a.title, a.location, a.start_time, a.end_time, a.status,
           c.name AS category, u.username AS organizer
    FROM registrations r
    JOIN activities a ON a.id = r.activity_id
    LEFT JOIN categories c ON c.id = a.category_id
    LEFT JOIN users u ON u.id = a.organizer_id
    WHERE r.user_id = ?
    ORDER BY r.registered_at DESC
  `).all(req.user.id);
  res.json({ total: rows.length, items: rows });
}));

// 教师查看名单（创建者或 admin）
// GET /api/activities/:id/registrations
router.get('/:id/registrations', requireLogin, asyncHandler(async (req, res) => {
  const db = getDb();
  const act = db.prepare('SELECT organizer_id FROM activities WHERE id = ?').get(req.params.id);
  if (!act) return notFound(res, 'activity not found');
  if (req.user.role !== 'admin' && act.organizer_id !== req.user.id) {
    return forbidden(res, 'only organizer can view roster');
  }

  const rows = db.prepare(`
    SELECT r.id, r.registered_at, u.id AS user_id, u.username
    FROM registrations r
    JOIN users u ON u.id = r.user_id
    WHERE r.activity_id = ?
    ORDER BY r.registered_at ASC
  `).all(req.params.id);

  res.json({ total: rows.length, items: rows });
}));

module.exports = router;
