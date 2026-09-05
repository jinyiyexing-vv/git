// db/init.js - 初始化数据库
const { initDb } = require('../src/db');

initDb()
  .then(() => {
    console.log('[init-db] schema applied at data/campus.sqlite');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[init-db] failed:', err);
    process.exit(1);
  });
