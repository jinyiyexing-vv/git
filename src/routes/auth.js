// src/routes/auth.js - 占位：将在 commit c3d4e5f 完整实现
const express = require('express');
const router = express.Router();
router.post('/register', (req, res) => res.status(501).json({ error: 'not_implemented' }));
router.post('/login', (req, res) => res.status(501).json({ error: 'not_implemented' }));
router.post('/logout', (req, res) => res.status(501).json({ error: 'not_implemented' }));
module.exports = router;
