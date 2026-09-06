// server.js - 入口文件
// V1.0: 提供 6 项核心 API 与前端静态资源

const express = require('express');
const path = require('path');
const { initDb } = require('./src/db');
const authMiddleware = require('./src/auth');

const authRoutes = require('./src/routes/auth');
const activityRoutes = require('./src/routes/activities');
const registrationRoutes = require('./src/routes/registrations');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false }));

// 全局会话解析：把 Cookie 里的 token 解析成 req.user
app.use(authMiddleware.resolveUser);

// 静态资源
app.use(express.static(path.join(__dirname, 'public')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: '1.0.0', time: new Date().toISOString() });
});

// 业务路由
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/activities', registrationRoutes);   // 报名接口挂在活动下
app.use('/api/admin', authMiddleware.requireRole('admin'), adminRoutes);

// 错误处理
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.code || 'internal_error', message: err.message });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('[fatal] failed to init db:', err);
  process.exit(1);
});
