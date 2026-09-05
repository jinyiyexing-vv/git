// src/db.js - 数据库连接
// 使用 Node.js 内置 node:sqlite（Node >= 22.5 需 --experimental-sqlite，Node >= 23.4 开箱可用）
// 零原生依赖，无需 node-gyp 编译

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

let _db = null;

function getDb() {
  if (_db) return _db;
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'campus.sqlite');
  _db = new DatabaseSync(dbPath);
  _db.exec('PRAGMA journal_mode = WAL');
  _db.exec('PRAGMA foreign_keys = ON');
  return _db;
}

function initDb() {
  const db = getDb();
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  return Promise.resolve(db);
}

module.exports = { getDb, initDb };
