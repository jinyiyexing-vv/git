// src/util.js - 通用工具
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function badRequest(res, code, message) {
  return res.status(400).json({ error: code, message });
}

function unauthorized(res, code = 'unauthorized', message = 'login required') {
  return res.status(401).json({ error: code, message });
}

function forbidden(res, message = 'forbidden') {
  return res.status(403).json({ error: 'forbidden', message });
}

function notFound(res, message = 'not found') {
  return res.status(404).json({ error: 'not_found', message });
}

function conflict(res, code, message) {
  return res.status(409).json({ error: code, message });
}

module.exports = { asyncHandler, badRequest, unauthorized, forbidden, notFound, conflict };
