#!/bin/bash

# Render 快速部署脚本
echo "🚀 开始部署到 Render..."

# 检查是否安装了 Git
if ! command -v git &> /dev/null; then
    echo "❌ Git 未安装，请先安装 Git"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -f "package.json" ] || [ ! -f "server.js" ]; then
    echo "❌ 请在 backend 目录下运行此脚本"
    exit 1
fi

# 获取用户名
read -p "请输入您的 GitHub 用户名: " github_username

# 初始化 Git
echo "📦 初始化 Git..."
git init

# 添加文件
echo "📤 添加文件到 Git..."
git add .

# 提交
echo "💾 提交代码..."
git commit -m "Initial commit: 自建后端服务替代 LeanCloud"

# 添加远程仓库
echo "🔗 添加远程仓库..."
git remote add origin "https://github.com/$github_username/csfh-backend.git"

# 推送到 GitHub
echo "📤 推送到 GitHub..."
git push -u origin main

echo ""
echo "✅ 代码已推送到 GitHub"
echo ""
echo "📋 接下来的步骤："
echo ""
echo "1. 访问 https://render.com 并使用 GitHub 登录"
echo "2. 点击 'New +' 选择 'Web Service'"
echo "3. 选择 'csfh-backend' 仓库"
echo "4. 配置如下："
echo "   - Root Directory: backend"
echo "   - Runtime: Node.js"
echo "   - Build Command: npm install"
echo "   - Start Command: npm start"
echo "   - Instance Type: Free"
echo ""
echo "5. 添加环境变量："
echo "   - NODE_ENV=production"
echo "   - JWT_SECRET=render-generated-secret-key-here"
echo "   - SQLSERVER_HOST=csfhcdz.f3322.net"
echo "   - SQLSERVER_PORT=1433"
echo "   - SQLSERVER_USER=csfh"
echo "   - SQLSERVER_PASSWORD=fh123456"
echo "   - SQLSERVER_DATABASE=chargingdata"
echo "   - SQLSERVER_ENCRYPT=false"
echo "   - SQLSERVER_TRUST_CERT=true"
echo "   - TENCENT_SECRET_ID=AKIDW1QcaKuOl03rQlskNly1rVwCKFxRhmkW"
echo "   - TENCENT_SECRET_KEY=c094j9KGxSkn8JG0XpsgLqAH9mFXdYN0"
echo "   - TENCENT_SMS_SDKAPPID=1400143789"
echo "   - TENCENT_SMS_TEMPLATE_ID=2525131"
echo "   - TENCENT_SMS_SIGN=长沙飞狐"
echo "   - CORS_ORIGIN=*,file://"
echo ""
echo "6. 创建 PostgreSQL 数据库："
echo "   - 在 Render 点击 'New +' 选择 'PostgreSQL'"
echo "   - 数据库创建后，更新环境变量中的 PG_HOST"
echo ""
echo "7. 运行数据库迁移："
echo "   - 在 Render Web Service 页面点击 'Open Shell'"
echo "   - 执行: node -r dotenv/config src/database/migrate.js"
echo ""
echo "8. 更新前端代码（参考 render-deployment.md）"
echo ""
echo "📖 更多详情请查看: render-deployment.md"
echo ""