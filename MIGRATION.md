# LeanCloud 迁移总结

## 项目概述

将现有的 LeanCloud 后端服务迁移到自建 Node.js + Express 后端，实现：
- 用户注册/登录（用户名密码、短信验证码）
- 用户授权检查
- 登录记录管理
- SQL Server 2008 R2 数据查询

## 迁移方案

### 架构对比

**原架构 (LeanCloud):**
```
前端 → LeanCloud SDK → LeanCloud API
                    ↓
               云函数 (executeSQLQuery)
                    ↓
               SQL Server 2008 R2
```

**新架构 (自建后端):**
```
前端 → 自定义 API → Node.js 后端
                    ↓
           ┌────────┴────────┐
           ▼                 ▼
     PostgreSQL         SQL Server
     (用户数据)         (业务数据)
```

## 已创建的文件

### 后端项目结构

```
backend/
├── package.json          # 项目依赖配置
├── server.js             # 主入口文件
├── .env.example          # 环境变量示例
├── .gitignore           # Git 忽略文件
├── render.yaml          # Render 部署配置
├── README.md            # 项目说明文档
├── custom-api.js        # 前端 API 封装 (替代 LeanCloud SDK)
├── frontend-update-guide.md  # 前端改造指南
├── MIGRATION.md         # 本文档
└── src/
    ├── config/
    │   ├── database.config.js  # 数据库连接配置
    │   └── jwt.config.js       # JWT 配置
    ├── controllers/
    │   ├── auth.controller.js       # 认证控制器
    │   ├── query.controller.js     # SQL 查询控制器
    │   └── loginRecord.controller.js # 登录记录控制器
    ├── routes/
    │   ├── auth.routes.js          # 认证路由
    │   ├── query.routes.js         # 查询路由
    │   └── loginRecord.routes.js   # 登录记录路由
    ├── middleware/
    │   ├── auth.middleware.js      # 认证中间件
    │   └── error.middleware.js    # 错误处理中间件
    ├── database/
    │   └── migrate.js              # 数据库迁移脚本
    └── utils/
        ├── response.util.js       # 响应工具
        ├── validator.util.js      # 验证工具
        ├── crypto.util.js         # 加密工具
        └── sms.util.js            # 短信工具
```

## API 接口对照表

| LeanCloud API | 新 API | 方法 | 路径 |
|---------------|--------|------|------|
| `AV.User.logIn(username, password)` | `authAPI.login(username, password)` | POST | `/api/auth/login` |
| `user.signUp()` | `authAPI.register(username, password, email)` | POST | `/api/auth/register` |
| `AV.User.requestPasswordReset(email)` | `authAPI.resetPassword(email)` | POST | `/api/auth/reset-password` |
| `AV.Cloud.run('sendSmsCode', {phone})` | `authAPI.sendSmsCode(phone)` | POST | `/api/auth/send-sms-code` |
| `AV.Cloud.run('verifySmsCode', {phone, code})` | `authAPI.smsLogin(phone, code)` | POST | `/api/auth/sms-login` |
| 登录记录 `LoginRecord` | `loginRecordAPI.recordLogin()` | POST | `/api/login-records/record` |
| 查询登录记录 | `loginRecordAPI.getLoginHistory()` | GET | `/api/login-records/history` |
| 检查授权 `AuthorizedUsers` | `authAPI.checkAuthorization()` | GET | `/api/auth/check-authorization` |
| SQL 查询云函数 | `queryAPI.executeQuery(sql)` | POST | `/api/query/execute` |

## 部署步骤

### 1. 本地测试

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写数据库配置

# 创建 PostgreSQL 数据库
createdb csfh_auth

# 运行数据库迁移
npm run migrate

# 启动服务
npm start
```

### 2. 前端修改

1. 在 `index.html` 的 `<head>` 中添加：
   ```html
   <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
   <script src="./backend/custom-api.js"></script>
   ```

2. 删除 LeanCloud SDK 引用（第 11 行）

3. 修改页面底部的初始化代码（详情见 `frontend-update-guide.md`）

### 3. 生产部署

#### Render 部署（推荐）

1. 将代码推送到 GitHub
2. 在 Render 创建新项目，连接 GitHub 仓库
3. 选择 `backend` 目录作为 Root Directory
4. 配置环境变量
5. 创建 PostgreSQL 数据库
6. 部署

#### Railway 部署

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 添加 PostgreSQL
railway add postgresql

# 添加后端服务
railway up

# 配置环境变量
railway variables set JWT_SECRET=your-secret-key
# ... 其他环境变量
```

## 数据库迁移

### 从 LeanCloud 导出数据

```bash
# 使用 LeanCloud CLI
leancloud export

# 或使用导出功能导出为 JSON 文件
```

### 导入到 PostgreSQL

创建导入脚本 `import-data.js`：

```javascript
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'your-password',
  database: 'csfh_auth'
});

// 导入用户数据
async function importUsers() {
  const data = JSON.parse(fs.readFileSync('leancloud_users.json'));
  for (const user of data) {
    await pool.query(
      'INSERT INTO users (username, email, password, mobile_phone) VALUES ($1, $2, $3, $4)',
      [user.username, user.email, user.password, user.mobilePhoneNumber]
    );
  }
}

// 导入授权用户
async function importAuthorizedUsers() {
  const data = JSON.parse(fs.readFileSync('leancloud_authorized_users.json'));
  for (const user of data) {
    await pool.query(
      'INSERT INTO authorized_users (username, email, role) VALUES ($1, $2, $3)',
      [user.username, user.email, user.role]
    );
  }
}

// 导入登录记录
async function importLoginRecords() {
  const data = JSON.parse(fs.readFileSync('leancloud_login_records.json'));
  for (const record of data) {
    await pool.query(
      `INSERT INTO login_records (user_id, username, login_time, logout_time, login_method, user_agent, device_info, ip_address, page, session_id, phone_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [record.user_id, record.username, record.loginTime, record.logoutTime, record.loginMethod, record.userAgent, record.deviceInfo, record.ipAddress, record.page, record.sessionId, record.phoneNumber]
    );
  }
}
```

## 短信服务配置

### 阿里云短信服务

1. 注册阿里云账号
2. 开通短信服务
3. 创建签名和模板
4. 获取 Access Key ID 和 Secret

配置环境变量：

```env
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY_ID=your-access-key-id
SMS_ACCESS_KEY_SECRET=your-access-key-secret
SMS_SIGN_NAME=your-sign-name
SMS_TEMPLATE_CODE=your-template-code
```

### 腾讯云短信服务

配置类似，使用 `SMS_PROVIDER=tencent`

## 测试清单

### 功能测试

- [ ] 用户注册
  - [ ] 新用户注册成功
  - [ ] 用户名已存在提示
  - [ ] 邮箱已存在提示
- [ ] 用户登录
  - [ ] 正确用户名密码登录
  - [ ] 错误密码提示
  - [ ] 不存在用户名提示
- [ ] 短信验证码登录
  - [ ] 发送验证码成功
  - [ ] 验证码验证成功
  - [ ] 验证码过期提示
  - [ ] 手机号格式验证
- [ ] 密码重置
  - [ ] 发送重置邮件/短信
- [ ] 用户授权检查
  - [ ] 授权用户通过检查
  - [ ] 未授权用户拒绝
- [ ] SQL 查询
  - [ ] SELECT 查询成功
  - [ ] 恶意 SQL 拒绝
  - [ ] 超时处理
- [ ] 登录记录
  - [ ] 记录登录
  - [ ] 记录登出
  - [ ] 查询历史

### 兼容性测试

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### 安全测试

- [ ] SQL 注入防护
- [ ] XSS 防护
- [ ] CSRF 防护
- [ ] Token 过期处理
- [ ] 速率限制

## 回滚方案

如果迁移后出现问题：

1. 恢复 LeanCloud 配置
2. 恢复前端代码到迁移前版本
3. 通知用户临时使用备用方案

## 常见问题

### Q: 为什么选择自建后端而不是 Supabase？

A: Supabase 不支持直接连接 SQL Server 2008 R2，而自建后端可以直接连接，不受第三方限制。

### Q: 如何处理 SQL Server 2008 R2 的兼容性问题？

A: 已在 `database.config.js` 中配置 `tdsVersion: '7_3_B'`，使用较老的 TDS 协议版本以确保兼容。

### Q: 短信服务费用如何？

A: 阿里云/腾讯云短信按条计费，一般每条约 0.05 元，小规模使用成本很低。

### Q: 免费部署平台的限制？

A:
- Render: 免费版休眠 15 分钟无活动后会休眠，首次请求较慢
- Railway: 每月 $5 免费额度
- Vercel: Serverless 函数免费，但不适合长连接数据库

### Q: 如何更新 API_BASE_URL？

A: 在 `custom-api.js` 第一行修改：
```javascript
const API_BASE_URL = 'https://your-backend.onrender.com/api';
```

## 联系支持

如遇到问题，请检查：
1. 后端日志 (`console.log` 输出)
2. 浏览器开发者工具 Network 面板
3. 数据库连接状态
4. 环境变量配置

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|---------|
| 2026-02-02 | 1.0.0 | 初始版本，完成基础功能 |
