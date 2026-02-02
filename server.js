import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// 路由导入
import authRoutes from './routes/auth.routes.js';
import queryRoutes from './routes/query.routes.js';
import loginRecordRoutes from './routes/loginRecord.routes.js';

// 配置
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: false, // 禁用 CSP 以避免前端资源加载问题
}));

// CORS 配置
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:8080', 'http://127.0.0.1:8080', 'file://'];

    // 允许 file:// 协议（本地 HTML 文件）
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('file://')) {
      callback(null, true);
    } else {
      callback(new Error('不允许的跨域请求'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// 请求体解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 次请求
  message: { error: '请求过于频繁，请稍后再试' }
});

// API 路由应用速率限制
app.use('/api', limiter);

// 短信验证码更严格的速率限制
const smsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 5, // 每个 IP 最多 5 次短信请求
  message: { error: '短信发送过于频繁，请稍后再试' }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/login-records', loginRecordRoutes);

// 静态文件服务（如果需要）
app.use(express.static(path.join(__dirname, 'public')));

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误:', err);

  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   长沙飞狐数据管理平台 - 后端服务启动成功                ║
║                                                       ║
║   环境模式: ${process.env.NODE_ENV || 'development'}${' '.repeat(10)}
║   服务端口: ${PORT}${' '.repeat(24)}
║   启动时间: ${new Date().toLocaleString('zh-CN')}${' '.repeat(8)}
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});
