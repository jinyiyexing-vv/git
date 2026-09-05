// src/routes/admin.js - 占位：将在 commit e5f6a7b 完整实现
const express = require('express');
const router = express.Router();
router.post('/users/:id/disable', (req, res) => res.status(501).json({ error: 'not_implemented' }));
router.get('/users', (req, res) => res.status(501).json({ error: 'not_implemented' }));
module.exports = router;
