// db/seed.js - 种子数据
// 创建 1 管理员 / 2 教师 / 3 学生账号、3 个分类、若干活动
const bcrypt = require('bcryptjs');
const { initDb, getDb } = require('../src/db');

async function seed() {
  await initDb();
  const db = getDb();

  const hashStudent = bcrypt.hashSync('pass123', 10);
  const hashAdmin = bcrypt.hashSync('admin123', 10);

  const insUser = db.prepare(
    'INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)'
  );
  insUser.run('admin', hashAdmin, 'admin');
  insUser.run('tch01', hashStudent, 'teacher');
  insUser.run('tch02', hashStudent, 'teacher');
  insUser.run('stu01', hashStudent, 'student');
  insUser.run('stu02', hashStudent, 'student');
  insUser.run('stu03', hashStudent, 'student');

  const insCat = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
  ['讲座', '比赛', '志愿服务'].forEach((n) => insCat.run(n));

  const teacher = db.prepare("SELECT id FROM users WHERE username='tch01'").get();
  const teacher2 = db.prepare("SELECT id FROM users WHERE username='tch02'").get();
  const catLecture = db.prepare("SELECT id FROM categories WHERE name='讲座'").get();
  const catContest = db.prepare("SELECT id FROM categories WHERE name='比赛'").get();
  const catVol = db.prepare("SELECT id FROM categories WHERE name='志愿服务'").get();

  const insAct = db.prepare(`
    INSERT INTO activities (title, description, category_id, location, start_time, end_time, capacity, organizer_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insAct.run('软件工程导论公开课', '面向大一新生的软件工程入门讲座，介绍课程、专业方向与学习方法。',
    catLecture.id, '信工楼 201', '2026-09-15 14:00', '2026-09-15 16:00', 60, teacher.id, 'open');
  insAct.run('2026 校园编程竞赛', 'ACM 赛制校内选拔赛，三人组队，5 题 4 小时。',
    catContest.id, '实验楼机房 3', '2026-09-20 13:00', '2026-09-20 17:00', 90, teacher.id, 'open');
  insAct.run('图书馆志愿引导', '开学季图书馆楼层引导志愿服务，时长 4 小时，记志愿时长 2 分。',
    catVol.id, '图书馆正门', '2026-09-18 09:00', '2026-09-18 13:00', 30, teacher2.id, 'open');
  insAct.run('网络安全科普讲座', '邀请业内专家讲解常见钓鱼与防护手段。',
    catLecture.id, '信工楼 302', '2026-09-22 19:00', '2026-09-22 21:00', 80, teacher2.id, 'open');

  console.log('[seed] done: 6 users, 3 categories, 4 activities');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
