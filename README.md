# 在线工具平台 - 用户管理系统

一个完整的用户注册登录系统和强大的管理员后台。

## 功能特性

### 用户系统
- ✅ 用户注册和登录（支持用户名/邮箱）
- ✅ JWT Token 认证
- ✅ 密码 bcrypt 加密
- ✅ 用户等级系统（青铜 → 白银 → 黄金 → 铂金 → 钻石 → 大师 → 宗师）
- ✅ VIP 会员系统（普通用户 / VIP / SVIP）
- ✅ 用户称号系统
- ✅ 经验值获取机制
- ✅ 完整的操作日志记录

### 管理员后台
- ✅ 仪表盘统计（用户数、工具数、日志数等）
- ✅ 用户管理（查看、编辑、删除、授予称号）
- ✅ 角色管理（普通用户、管理员、超级管理员）
- ✅ VIP 等级授予
- ✅ 用户状态管理（正常/禁用）
- ✅ 操作日志查看
- ✅ 工具管理（增删改查）

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 初始化管理员账号

```bash
npm run init-admin
```

这将创建一个默认管理员：
- 用户名: `admin`
- 密码: `admin123`
- 角色: `superadmin`

**⚠️ 重要：请立即登录后修改默认密码！**

### 3. 启动服务器

```bash
npm start
```

服务器将在 http://localhost:3000 启动

### 4. 访问页面

- 首页: http://localhost:3000/
- 登录: http://localhost:3000/login.html
- 注册: http://localhost:3000/register.html
- 用户中心: http://localhost:3000/user-center.html
- 管理后台: http://localhost:3000/admin.html

## API 接口文档

### 认证接口

#### 注册
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "用户名",
  "email": "邮箱@example.com",
  "password": "密码"
}
```

#### 登录
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "用户名或邮箱",
  "password": "密码"
}
```

#### 获取当前用户
```
GET /api/auth/me
Authorization: Bearer <token>
```

#### 退出登录
```
POST /api/auth/logout
Authorization: Bearer <token>
```

### 用户接口

#### 获取用户公开信息
```
GET /api/users/:id/public
```

#### 更新个人资料
```
PUT /api/users/profile
Authorization: Bearer <token>

{
  "username": "新用户名",
  "avatar": "头像URL",
  "title": "称号"
}
```

#### 修改密码
```
PUT /api/users/password
Authorization: Bearer <token>

{
  "currentPassword": "当前密码",
  "newPassword": "新密码"
}
```

#### 获取经验信息
```
GET /api/users/experience
Authorization: Bearer <token>
```

#### 获取操作日志
```
GET /api/users/logs?page=1&limit=20
Authorization: Bearer <token>
```

### 管理员接口

#### 获取用户列表
```
GET /api/admin/users?page=1&limit=20&search=&role=&vipLevel=&status=
Authorization: Bearer <token> (需要管理员权限)
```

#### 获取单个用户详情
```
GET /api/admin/users/:id
Authorization: Bearer <token> (需要管理员权限)
```

#### 更新用户信息
```
PUT /api/admin/users/:id
Authorization: Bearer <token> (需要管理员权限)

{
  "role": "admin",
  "vipLevel": "svip",
  "title": "荣誉称号",
  "status": "active"
}
```

#### 删除用户
```
DELETE /api/admin/users/:id
Authorization: Bearer <token> (需要管理员权限)
```

#### 授予称号
```
POST /api/admin/users/:id/title
Authorization: Bearer <token> (需要管理员权限)

{
  "title": "荣誉称号"
}
```

#### 获取操作日志
```
GET /api/admin/logs?page=1&limit=20&userId=&action=&startDate=&endDate=
Authorization: Bearer <token> (需要管理员权限)
```

#### 获取统计数据
```
GET /api/admin/stats
Authorization: Bearer <token> (需要管理员权限)
```

## 权限等级

### 用户角色
- `user` - 普通用户
- `admin` - 管理员
- `superadmin` - 超级管理员

### 用户等级（经验值）
- 🥉 青铜: 0+ 经验
- 🥈 白银: 100+ 经验
- 🥇 黄金: 500+ 经验
- 💎 铂金: 1000+ 经验
- 💠 钻石: 5000+ 经验
- 🌟 大师: 10000+ 经验
- 👑 宗师: 50000+ 经验

### VIP 等级
- 普通用户 - 无特殊权限
- VIP会员 - 可能有专属功能
- SVIP会员 - 最高会员等级

## 安全特性

- ✅ 密码使用 bcrypt 加密（10轮盐）
- ✅ JWT Token 认证（7天过期）
- ✅ 敏感数据 AES 加密存储
- ✅ 操作日志完整记录
- ✅ 防止暴力破解（可在中间件中扩展）
- ✅ CORS 跨域支持

## 文件结构

```
server/
├── src/
│   ├── data/              # JSON 数据存储
│   │   ├── users.json     # 用户数据
│   │   ├── tools.json     # 工具数据
│   │   └── logs.json      # 操作日志
│   ├── middleware/
│   │   └── auth.js        # 认证中间件
│   ├── routes/
│   │   ├── auth.js        # 认证路由
│   │   ├── users.js       # 用户路由
│   │   └── admin.js       # 管理员路由
│   └── utils/
│       ├── dataManager.js # 数据管理工具
│       ├── encryption.js  # 加密工具
│       └── logger.js     # 日志工具
├── public/
│   └── ...               # 前端页面
├── server.js             # 主服务器
├── init-admin.js         # 初始化管理员
└── package.json
```

## 扩展建议

1. **数据库升级**: 可以将 JSON 文件替换为 MongoDB 或 MySQL
2. **邮件服务**: 添加邮箱验证和找回密码功能
3. **限流保护**: 添加 API 请求频率限制
4. **文件上传**: 添加用户头像上传功能
5. **社交登录**: 添加微信、QQ 等第三方登录
6. **WebSocket**: 添加实时通知功能

## 许可证

MIT License
