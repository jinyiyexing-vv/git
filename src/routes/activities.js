// src/routes/activities.js - 活动路由
// REQ-02 活动列表/详情/分类筛选；REQ-04 教师创建/编辑/关闭活动

const express = require('express');
const { getDb } = require('../db');
const { requireLogin, requireRole } = require('../auth');
const { asyncHandler, badRequest, forbidden, notFound } = require('../util');

const router = express.Router();

// 活动列表（支持分类、状态、关键字筛选）
// GET /api/activities?category=讲座&status=open&q=编程
router.get('/', asyncHandler(async (req, res) => {
  const { category, status, q } = req.query;
  const db = getDb();

  let sql = `
    SELECT a.id, a.title, a.description, a.location, a.start_time, a.end_time,
           a.capacity, a.current_count, a.status, a.created_at,
           c.name AS category, u.username AS organizer
    FROM activities a
    LEFT JOIN categories c ON c.id = a.category_id
    LEFT JOIN users u ON u.id = a.organizer_id
    WHERE 1=1
  `;
  const params = [];

  if (category) {
    sql += ' AND c.name = ?';
    params.push(category);
  }
  if (status) {
    sql += ' AND a.status = ?';
    params.push(status);
  }
  if (q) {
    sql += ' AND (a.title LIKE ? OR a.description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY a.start_time ASC';

  const rows = db.prepare(sql).all(...params);
  res.json({ total: rows.length, items: rows });
}));

// 分类列表
router.get('/categories', asyncHandler(async (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT id, name FROM categories ORDER BY id ASC').all();
  res.json({ items: rows });
}));

// 活动详情
router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT a.*, c.name AS category, u.username AS organizer
    FROM activities a
    LEFT JOIN categories c ON c.id = a.category_id
    LEFT JOIN users u ON u.id = a.organizer_id
    WHERE a.id = ?
  `).get(req.params.id);
  if (!row) return notFound(res, 'activity not found');

  // 当前用户是否已报名（若已登录）
  let myRegistration = null;
  if (req.user) {
    myRegistration = db.prepare(
      'SELECT id, registered_at FROM registrations WHERE activity_id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id) || null;
  }

  res.json({ ...row, myRegistration });
}));

// 创建活动（仅教师）
router.post('/', requireLogin, requireRole('teacher'), asyncHandler(async (req, res) => {
  const { title, description = '', category, location = '', start_time, end_time, capacity } = req.body || {};
  if (!title || typeof title !== 'string' || title.length < 2 || title.length > 64) {
    return badRequest(res, 'invalid_title', 'title must be 2-64 chars');
  }
  if (!start_time || !end_time) return badRequest(res, 'missing_time', 'start_time and end_time required');
  const cap = parseInt(capacity, 10);
  if (!Number.isInteger(cap) || cap <= 0) return badRequest(res, 'invalid_capacity', 'capacity must be positive integer');

  const db = getDb();
  let categoryId = null;
  if (category) {
    let row = db.prepare('SELECT id FROM categories WHERE name = ?').get(category);
    if (!row) {
      const r = db.prepare('INSERT INTO categories (name) VALUES (?)').run(category);
      categoryId = r.lastInsertRowid;
    } else {
      categoryId = row.id;
    }
  }

  const result = db.prepare(`
    INSERT INTO activities (title, description, category_id, location, start_time, end_time, capacity, organizer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, categoryId, location, start_time, end_time, cap, req.user.id);

  res.status(201).json({ id: result.lastInsertRowid });
}));

// 编辑活动（仅创建者本人或 admin）
router.put('/:id', requireLogin, asyncHandler(async (req, res) => {
  const db = getDb();
  const act = db.prepare('SELECT organizer_id FROM activities WHERE id = ?').get(req.params.id);
  if (!act) return notFound(res, 'activity not found');
  if (req.user.role !== 'admin' && act.organizer_id !== req.user.id) {
    return forbidden(res, 'only organizer can edit');
  }

  const { title, description, category, location, start_time, end_time, capacity } = req.body || {};
  const updates = [];
  const params = [];

  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (location !== undefined) { updates.push('location = ?'); params.push(location); }
  if (start_time !== undefined) { updates.push('start_time = ?'); params.push(start_time); }
  if (end_time !== undefined) { updates.push('end_time = ?'); params.push(end_time); }
  if (capacity !== undefined) {
    const cap = parseInt(capacity, 10);
    if (!Number.isInteger(cap) || cap <= 0) return badRequest(res, 'invalid_capacity', 'capacity must be positive integer');
    updates.push('capacity = ?'); params.push(cap);
  }
  if (category !== undefined) {
    let categoryId = null;
    if (category) {
      let row = db.prepare('SELECT id FROM categories WHERE name = ?').get(category);
      if (!row) {
        const r = db.prepare('INSERT INTO categories (name) VALUES (?)').run(category);
        categoryId = r.lastInsertRowid;
      } else {
        categoryId = row.id;
      }
    }
    updates.push('category_id = ?'); params.push(categoryId);
  }

  if (updates.length === 0) return badRequest(res, 'nothing_to_update', 'no fields provided');

  params.push(req.params.id);
  db.prepare(`UPDATE activities SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
}));

// 关闭活动（仅创建者本人或 admin）
router.post('/:id/close', requireLogin, asyncHandler(async (req, res) => {
  const db = getDb();
  const act = db.prepare('SELECT organizer_id, status FROM activities WHERE id = ?').get(req.params.id);
  if (!act) return notFound(res, 'activity not found');
  if (req.user.role !== 'admin' && act.organizer_id !== req.user.id) {
    return forbidden(res, 'only organizer can close');
  }
  if (act.status === 'closed') return res.json({ ok: true, already: 'closed' });

  db.prepare('UPDATE activities SET status = ? WHERE id = ?').run('closed', req.params.id);
  res.json({ ok: true });
}));

// 我创建的活动（教师工作台）
router.get('/mine/created', requireLogin, requireRole('teacher'), asyncHandler(async (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT a.*, c.name AS category
    FROM activities a
    LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.organizer_id = ?
    ORDER BY a.created_at DESC
  `).all(req.user.id);
  res.json({ total: rows.length, items: rows });
}));

module.exports = router;
