# 长沙飞狐数据管理平台 - 后端服务

替代 LeanCloud 的自建后端服务，提供用户认证、登录记录管理和 SQL Server 数据查询功能。

## 技术栈

- **框架**: Node.js + Express
- **数据库**: PostgreSQL (用户数据) + SQL Server 2008 R2 (业务数据)
- **认证**: JWT + bcrypt
- **短信**: 阿里云/腾讯云
- **部署**: Render / Railway / Vercel

## 目录结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   │   ├── database.config.js    # 数据库连接配置
│   │   └── jwt.config.js         # JWT 配置
│   ├── controllers/     # 控制器
│   │   ├── auth.controller.js
│   │   ├── query.controller.js
│   │   └── loginRecord.controller.js
│   ├── routes/          # 路由
│   │   ├── auth.routes.js
│   │   ├── query.routes.js
│   │   └── loginRecord.routes.js
│   ├── middleware/      # 中间件
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── database/        # 数据库迁移
│   │   └── migrate.js
│   └── utils/           # 工具函数
│       ├── response.util.js
│       ├── validator.util.js
│       ├── crypto.util.js
│       └── sms.util.js
├── server.js            # 主入口文件
├── package.json
└── .env.example         # 环境变量示例
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# PostgreSQL 配置
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your-postgres-password
PG_DATABASE=csfh_auth

# SQL Server 配置
SQLSERVER_HOST=csfhcdz.f3322.net
SQLSERVER_PORT=1433
SQLSERVER_USER=csfh
SQLSERVER_PASSWORD=fh123456
SQLSERVER_DATABASE=chargingdata
```

### 3. 创建 PostgreSQL 数据库

```bash
# 使用 psql 创建数据库
createdb csfh_auth
```

### 4. 运行数据库迁移

```bash
npm run migrate
```

### 5. 启动服务

```bash
npm start          # 生产环境
npm run dev        # 开发环境（支持热重载）
```

服务将在 `http://localhost:3000` 启动。

## API 接口文档

### 认证接口 (`/api/auth`)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/register` | 用户注册 | 否 |
| POST | `/login` | 用户名密码登录 | 否 |
| POST | `/send-sms-code` | 发送短信验证码 | 否 |
| POST | `/sms-login` | 短信验证码登录 | 否 |
| POST | `/reset-password` | 密码重置 | 否 |
| GET | `/check-authorization` | 检查用户授权 | 否 |
| POST | `/logout` | 登出 | 否 |
| GET | `/me` | 获取当前用户信息 | 是 |

### 查询接口 (`/api/query`)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/execute` | 执行 SQL 查询 | 是 |
| GET | `/tables` | 获取数据库表列表 | 是 |
| GET | `/schema/:tableName` | 获取表结构 | 是 |
| GET | `/test` | 测试数据库连接 | 是 |

### 登录记录接口 (`/api/login-records`)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/record` | 记录用户登录 | 否 |
| POST | `/logout` | 记录用户登出 | 否 |
| GET | `/history` | 获取登录历史 | 是 |
| GET | `/last` | 获取最近登录记录 | 是 |

## API 使用示例

### 用户注册

```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "password": "123456",
  "email": "test@example.com"
}
```

### 用户登录

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "123456"
}
```

响应：
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    },
    "sessionId": "web_session_1234567890_abc123"
  }
}
```

### 发送短信验证码

```bash
POST /api/auth/send-sms-code
Content-Type: application/json

{
  "phone": "13800138000"
}
```

### 短信登录

```bash
POST /api/auth/sms-login
Content-Type: application/json

{
  "phone": "13800138000",
  "code": "123456"
}
```

### 执行 SQL 查询（需要认证）

```bash
POST /api/query/execute
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "SELECT * FROM 表名 WHERE 条件"
}
```

## 前端集成

前端需要修改以下内容：

1. 移除 LeanCloud SDK 引用
2. 将所有 `AV.*` API 调用替换为自定义后端 API
3. 使用 JWT Token 进行身份验证

详见 `前端改造指南.md`

## 部署

### Render 部署

1. 创建 `render.yaml` 配置文件
2. 推送代码到 GitHub
3. 在 Render 中创建新的 Web Service
4. 设置环境变量
5. 部署

### Railway 部署

1. 安装 Railway CLI
2. 登录并创建项目
3. 部署 PostgreSQL
4. 部署后端服务
5. 设置环境变量

## 数据库表结构

### users (用户表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| username | VARCHAR(50) | 用户名（唯一） |
| email | VARCHAR(255) | 邮箱（唯一） |
| password | VARCHAR(255) | 密码（加密） |
| mobile_phone | VARCHAR(20) | 手机号 |
| login_method | VARCHAR(20) | 登录方式 |
| is_active | BOOLEAN | 是否激活 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### login_records (登录记录表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| user_id | INTEGER | 用户ID |
| username | VARCHAR(50) | 用户名 |
| login_time | TIMESTAMP | 登录时间 |
| logout_time | TIMESTAMP | 登出时间 |
| login_method | VARCHAR(20) | 登录方式 |
| user_agent | TEXT | 用户代理 |
| device_info | VARCHAR(100) | 设备信息 |
| ip_address | VARCHAR(45) | IP地址 |
| page | VARCHAR(500) | 页面URL |
| session_id | VARCHAR(100) | 会话ID |
| phone_number | VARCHAR(20) | 手机号 |

### authorized_users (授权用户表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| username | VARCHAR(50) | 用户名（唯一） |
| email | VARCHAR(255) | 邮箱 |
| role | VARCHAR(50) | 角色 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### sms_codes (短信验证码表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| phone | VARCHAR(20) | 手机号 |
| code | VARCHAR(10) | 验证码 |
| is_used | BOOLEAN | 是否已使用 |
| expires_at | TIMESTAMP | 过期时间 |
| ip_address | VARCHAR(45) | IP地址 |
| created_at | TIMESTAMP | 创建时间 |

## 安全说明

- 所有密码使用 bcrypt 加密
- JWT Token 有效期默认 24 小时
- API 接口有速率限制
- SQL 查询有安全验证，仅允许 SELECT 语句
- HTTPS 在生产环境中必须启用

## 故障排查

### PostgreSQL 连接失败

检查 `.env` 文件中的数据库配置是否正确。

### SQL Server 连接失败

1. 确认 SQL Server 服务已启动
2. 检查防火墙是否允许 1433 端口
3. 确认 SQL Server 支持的 TDS 版本

### 短信发送失败

1. 检查短信服务配置
2. 确认账户余额充足
3. 查看控制台错误日志

## License

MIT
