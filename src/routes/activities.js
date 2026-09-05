// src/routes/activities.js - 占位：将在 commit d4e5f6a 完整实现
const express = require('express');
const router = express.Router();
router.get('/', (req, res) => res.status(501).json({ error: 'not_implemented' }));
router.get('/:id', (req, res) => res.status(501).json({ error: 'not_implemented' }));
router.post('/', (req, res) => res.status(501).json({ error: 'not_implemented' }));
router.put('/:id', (req, res) => res.status(501).json({ error: 'not_implemented' }));
router.post('/:id/close', (req, res) => res.status(501).json({ error: 'not_implemented' }));
module.exports = router;
