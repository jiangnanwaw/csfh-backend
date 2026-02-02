# Render 部署指南

## 快速部署到 Render 平台

### 第一步：准备 GitHub 仓库

1. **创建 GitHub 仓库**
   - 访问 https://github.com/new
   - 创建新仓库名称：`csfh-backend`
   - 初始化 README 和 .gitignore
   - 点击 Create repository

2. **上传代码**
   ```bash
   # 初始化 Git
   git init

   # 添加所有文件
   git add .

   # 提交
   git commit -m "Initial commit: 自建后端服务替代 LeanCloud"

   # 添加远程仓库
   git remote add origin https://github.com/[你的用户名]/csfh-backend.git

   # 推送
   git push -u origin main
   ```

### 第二步：在 Render 部署

1. **访问 Render**
   - 打开 https://render.com
   - 使用 GitHub 登录
   - 点击 "New +"
   - 选择 "Web Service"

2. **配置 Render**
   - 选择对应的 GitHub 仓库
   - Root Directory: `backend`
   - Runtime: Node.js
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free

3. **环境变量配置**
   点击 "Environment" 标签，添加以下变量：

```env
# 基础配置
NODE_ENV=production
PORT=10000  # Render 会自动映射端口
JWT_SECRET=render-generated-secret-key-here

# PostgreSQL 数据库（Render 创建后自动提供）
PG_HOST=postgresql://postgres:password@host:port/database
PG_USER=postgres
PG_PASSWORD=render-generated-password
PG_DATABASE=render-generated-database-name

# SQL Server 配置
SQLSERVER_HOST=csfhcdz.f3322.net
SQLSERVER_PORT=1433
SQLSERVER_USER=csfh
SQLSERVER_PASSWORD=fh123456
SQLSERVER_DATABASE=chargingdata
SQLSERVER_ENCRYPT=false
SQLSERVER_TRUST_CERT=true

# 腾讯云短信配置
TENCENT_SECRET_ID=AKIDW1QcaKuOl03rQlskNly1rVwCKFxRhmkW
TENCENT_SECRET_KEY=c094j9KGxSkn8JG0XpsgLqAH9mFXdYN0
TENCENT_SMS_SDKAPPID=1400143789
TENCENT_SMS_TEMPLATE_ID=2525131
TENCENT_SMS_SIGN=长沙飞狐

# CORS 配置
CORS_ORIGIN=*,file://
```

### 第三步：创建 PostgreSQL 数据库

1. **在 Render 创建 PostgreSQL**
   - 回到 Render 首页
   - 点击 "New +"
   - 选择 "PostgreSQL"
   - 等待数据库创建完成

2. **更新环境变量**
   - 数据库创建后，复制数据库 URL
   - 格式：`postgresql://postgres:password@host:port/database`
   - 在 Render 的环境变量中设置 `PG_HOST`

### 第四步：运行数据库迁移

1. **连接到 Render 的容器**
   - Render 提供的 Web Service 会自动部署
   - 查看部署日志，确认服务启动成功

2. **远程执行迁移**
   由于 Render 容器不支持直接执行命令，需要通过 API 或手动执行 SQL：

**方案一：使用 Render Shell（推荐）**
- 在 Render Web Service 页面点击 "Open Shell"
- 执行：
  ```bash
  # 进入容器
  cd /opt/render/project/src

  # 运行迁移
  node -r dotenv/config src/database/migrate.js
  ```

**方案二：创建迁移 API 端点**

在 `server.js` 中添加：

```javascript
// 添加迁移路由
app.post('/migrate', async (req, res) => {
  try {
    // 导入迁移函数
    const { runMigrations } = await import('./src/database/migrate.js');
    await runMigrations();
    res.json({ success: true, message: '迁移完成' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

然后通过 Postman 或 curl 调用：
```bash
curl -X POST https://your-service.onrender.com/migrate
```

### 第五步：更新前端代码

修改 `index.html`：

```html
<!-- 替换 LeanCloud SDK -->
<!-- 删除这一行 -->
<script id="leancloud-cdn" src="https://unpkg.com/leancloud-storage@4.13.2/dist/av-min.js" ...></script>

<!-- 添加新的 API 调用 -->
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<script src="https://your-service.onrender.com/custom-api.js"></script>
```

或者创建本地 `custom-api.js`：

```javascript
// 修改 API_BASE_URL
const API_BASE_URL = 'https://your-service.onrender.com/api';
```

### 第六步：测试验证

1. **测试服务是否运行**
   ```bash
   curl https://your-service.onrender.com/health
   ```

2. **测试用户注册**
   ```bash
   curl -X POST https://your-service.onrender.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"123456","email":"test@example.com"}'
   ```

3. **测试短信发送**
   ```bash
   curl -X POST https://your-service.onrender.com/api/auth/send-sms-code \
     -H "Content-Type: application/json" \
     -d '{"phone":"13800138000"}'
   ```

### 第七步：配置自动部署

1. **设置 Webhook**
   - 在 GitHub 仓库设置中
   - 添加 Webhook URL：`https://api.render.com/webhooks/xxx`
   - 推送代码时自动部署

2. **监控日志**
   - 在 Render 控制台查看实时日志
   - 配置错误通知

### 常见问题

#### Q: Render 休眠问题
- 免费版 15 分钟无活动会休眠
- 首次访问可能较慢（1-2 分钟）
- 考虑使用 Ping 脚本保持活跃

#### Q: 数据库连接失败
- 检查 PostgreSQL 连接字符串
- 确认用户名密码正确
- 检查防火墙设置

#### Q: 短信发送失败
- 检查腾讯云配置
- 确认签名和模板已审核
- 查看控制台错误日志

### 启动保持脚本（可选）

创建 `keep-alive.js`：

```javascript
const http = require('http');

const options = {
  hostname: 'your-service.onrender.com',
  path: '/health',
  method: 'GET'
};

setInterval(() => {
  http.request(options, (res) => {
    console.log(`Pinging service: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error('Ping failed:', err);
  }).end();
}, 300000); // 每 5 分钟 ping 一次
```

## 成功标志

看到以下输出表示部署成功：

```
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   长沙飞狐数据管理平台 - 后端服务启动成功                ║
║                                                       ║
║   环境模式: production                                ║
║   服务端口: 10000                                     ║
║   启动时间: 2026-02-02 12:00:00                       ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝

PostgreSQL 连接成功: 2026-02-02 12:00:00.123
SQL Server 连接成功: 2026-02-02 12:00:00.456
```

完成后，您的服务就可以通过 `https://your-service.onrender.com` 访问了。