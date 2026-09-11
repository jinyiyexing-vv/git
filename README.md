# 校园活动管理系统 V1.0

> 基于工程意图的软件迭代开发 · 实验一 · 基因重组小组

## 项目简介

一个面向高校的轻量级活动发布与报名系统 V1.0，覆盖学生注册/登录、活动浏览/筛选、教师创建与管理、学生报名、管理员账号管控 6 项核心需求。

## 技术栈

- **前端**：HTML + 原生 JavaScript（无框架、无构建工具，JS 内联于各页面）
- **后端**：Node.js + Express
- **数据库**：SQLite（Node.js 内置 `node:sqlite` 模块，**需要 Node.js ≥ 23.4**）
- **密码加密**：`bcryptjs`（bcrypt 算法，10 轮加盐）
- **会话**：自实现的 Token 会话（32 字节随机 token，Cookie `session_token` 携带，7 天有效）

## 快速开始

```bash
# 环境要求：Node.js >= 23.4（内置 node:sqlite）

# 安装依赖
npm install

# 初始化数据库 + 种子数据
npm run init-db
npm run seed

# 启动服务（默认 3000 端口）
npm start
```

打开浏览器访问 `http://localhost:3000`。

## 测试账号

| 角色 | 账号 | 密码 |
|---|---|---|
| 学生 | `stu01` | `pass123` |
| 学生 | `stu02` | `pass123` |
| 教师 | `tch01` | `pass123` |
| 管理员 | `admin` | `admin123` |

## 目录结构

```
.
├── server.js              # 入口
├── package.json
├── .gitignore
├── README.md
├── db/
│   ├── init.js            # 初始化数据库
│   ├── seed.js            # 种子数据
│   └── schema.sql         # 建表语句
├── src/
│   ├── auth.js            # 认证/会话中间件
│   ├── db.js              # 数据库连接
│   ├── routes/
│   │   ├── auth.js
│   │   ├── activities.js
│   │   ├── registrations.js
│   │   └── admin.js
│   └── util.js
└── public/                # 前端静态资源（8 个页面，JS 内联）
    ├── index.html
    ├── login.html
    ├── register.html
    ├── activities.html
    ├── activity-detail.html
    ├── my-registrations.html
    ├── teacher-dashboard.html
    └── admin.html
```

## 6 项核心需求（与报告 REQ-01~06 对应）

| 编号 | 需求 | 实现入口 |
|---|---|---|
| REQ-01 | 学生注册/登录 | `POST /api/auth/register` `POST /api/auth/login` |
| REQ-02 | 活动列表/详情/分类筛选 | `GET /api/activities` `GET /api/activities/:id` |
| REQ-03 | 学生报名（含去重、状态校验） | `POST /api/activities/:id/registrations` |
| REQ-04 | 教师创建/编辑/关闭活动 | `POST /api/activities` `PUT /api/activities/:id` `POST /api/activities/:id/close` |
| REQ-05 | 教师查看报名名单 | `GET /api/activities/:id/registrations` |
| REQ-06 | 管理员查询用户 / 禁用 / 启用 | `GET /api/admin/users` `POST /api/admin/users/:id/disable` `POST /api/admin/users/:id/enable` |

## 提交历史

本仓库的 5 次代表性提交与实验报告 6.2 节一一对应：

| Commit | 标题 | 对应需求 |
|---|---|---|
| 7b98be6 | init: 项目骨架与依赖声明 | REQ-01~06 |
| cf95b62 | feat(db): 建表与种子数据 | REQ-01, REQ-02, REQ-04 |
| b66ba1a | feat(auth): 登录、注册、会话中间件 | REQ-01 |
| 21de09f | feat(activities): 活动列表/详情/分类筛选 + 教师端 CRUD | REQ-02, REQ-04 |
| 925711e | feat(registration): 报名/防重/状态校验 + 管理员禁用 | REQ-03, REQ-05, REQ-06 |

## License

MIT
