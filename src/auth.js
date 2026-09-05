// src/auth.js - 占位：将在 commit c3d4e5f 完整实现
// 当前仅提供 requireRole 透传接口
module.exports = {
  requireRole: (role) => (req, res, next) => {
    req._roleRequired = role;
    next();
  },
  attachUser: (req, res, next) => next(),
};
