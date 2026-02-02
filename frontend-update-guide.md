# 前端改造指南

将 `index.html` 从 LeanCloud 迁移到自建后端 API。

## 修改步骤

### 1. 移除 LeanCloud SDK

删除第 11 行的 LeanCloud SDK 引入：

```html
<!-- 删除这一行 -->
<script id="leancloud-cdn" src="https://unpkg.com/leancloud-storage@4.13.2/dist/av-min.js" onerror="this.onerror=null; this.src='https://cdn.staticfile.org/leancloud-storage/4.13.2/av-min.js'; this.onerror=function(){ this.onerror=null; this.src='https://cdn.jsdelivr.net/npm/leancloud-storage@4.13.2/dist/av-min.js'; };"</script>
```

### 2. 添加新的 JS 文件

在 `<head>` 标签内添加以下脚本：

```html
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<script src="./custom-api.js"></script>
```

### 3. 创建 custom-api.js 文件

创建一个新文件 `custom-api.js`，内容如下：

```javascript
// 自定义 API 封装
const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 添加 JWT Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('jwtToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// 响应拦截器 - 处理错误
api.interceptors.response.use(response => response.data, error => {
  if (error.response && error.response.status === 401) {
    // Token 过期，跳转到登录页
    clearLoginStatus();
    showLoginContainer();
    alert('登录已过期，请重新登录');
  }
  return Promise.reject(error);
});

// 认证相关函数
export const authAPI = {
  register: async (username, password, email) => {
    return api.post('/auth/register', { username, password, email });
  },

  login: async (username, password) => {
    return api.post('/auth/login', { username, password });
  },

  smsLogin: async (phone, code) => {
    return api.post('/auth/sms-login', { phone, code });
  },

  sendSmsCode: async (phone) => {
    return api.post('/auth/send-sms-code', { phone });
  },

  resetPassword: async (email) => {
    return api.post('/auth/reset-password', { email });
  },

  checkAuthorization: async (username) => {
    return api.get('/auth/check-authorization', { params: { username } });
  },

  getCurrentUser: async () => {
    return api.get('/auth/me');
  },

  logout: async (sessionId) => {
    return api.post('/auth/logout', { sessionId });
  }
};

// SQL 查询相关函数
export const queryAPI = {
  executeQuery: async (sql) => {
    return api.post('/query/execute', { query: sql });
  },

  getTables: async () => {
    return api.get('/query/tables');
  },

  getTableSchema: async (tableName) => {
    return api.get(`/query/schema/${tableName}`);
  }
};

// 登录记录相关函数
export const loginRecordAPI = {
  recordLogin: async (username, loginMethod, additionalData = {}) => {
    return api.post('/login-records/record', { username, loginMethod, additionalData });
  },

  recordLogout: async (sessionId, recordId) => {
    return api.post('/login-records/logout', { sessionId, recordId });
  },

  getLoginHistory: async (username, limit = 10) => {
    return api.get('/login-records/history', { params: { username, limit } });
  },

  getLastLoginRecord: async (username) => {
    return api.get('/login-records/last', { params: { username } });
  }
};

// 获取客户端 IP 地址
async function getClientIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    try {
      const response = await fetch('https://httpbin.org/ip');
      const data = await response.json();
      return data.origin.split(',')[0].trim();
    } catch (error2) {
      return 'unknown';
    }
  }
}

// 显示消息
export function showMessage(message, type = 'error') {
  const messageEl = document.getElementById('loginMessage');
  if (messageEl) {
    messageEl.textContent = message;
    messageEl.className = 'message ' + type;
    messageEl.style.display = 'block';
  }

  // 3秒后自动隐藏
  setTimeout(() => {
    if (messageEl) {
      messageEl.style.display = 'none';
    }
  }, 3000);
}

// 隐藏消息
export function hideMessage() {
  const messageEl = document.getElementById('loginMessage');
  if (messageEl) {
    messageEl.style.display = 'none';
  }
}
```

### 4. 修改 index.html 中的函数

#### 修改 initLoginSystem 函数

将第 4906 行开始的代码块修改为：

```javascript
// 初始化登录系统
export async function initLoginSystem() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const resetForm = document.getElementById('resetForm');
  const loginMessage = document.getElementById('loginMessage');

  if (!loginForm || !registerForm || !resetForm || !loginMessage) {
    console.error('登录表单元素未找到，请检查DOM结构');
    return;
  }

  const showRegister = document.getElementById('showRegister');
  const showSmsLogin = document.getElementById('showSmsLogin');
  const backToLoginFromRegister = document.getElementById('backToLoginFromRegister');
  const backToLoginFromReset = document.getElementById('backToLoginFromReset');
  const backToLoginFromSms = document.getElementById('backToLoginFromSms');

  // 显示消息
  function showMessage(msg, type = 'error') {
    loginMessage.textContent = msg;
    loginMessage.className = 'message ' + type;
    loginMessage.style.display = 'block';
  }

  // 隐藏消息
  function hideMessage() {
    loginMessage.style.display = 'none';
  }

  // 切换表单显示
  function showLoginForm(formName, iconClass = 'fa-user-lock') {
    hideMessage();
    loginForm.style.display = formName === 'login' ? 'block' : 'none';
    registerForm.style.display = formName === 'register' ? 'block' : 'none';
    document.getElementById('resetForm').style.display = formName === 'reset' ? 'block' : 'none';
    document.getElementById('smsLoginForm').style.display = formName === 'sms' ? 'block' : 'none';
    document.querySelector('#login-container .logo i').className = `fas ${iconClass}`;
  }

  if (showRegister) {
    showRegister.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginForm('register', 'fa-user-plus');
    });
  }

  if (showSmsLogin) {
    showSmsLogin.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginForm('sms', 'fa-mobile-alt');
    });
  }

  if (backToLoginFromRegister) {
    backToLoginFromRegister.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginForm('login');
    });
  }

  // 处理登录表单提交
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUsername').value;
      const password = document.getElementById('loginPassword').value;

      try {
        const result = await authAPI.login(username, password);

        if (result.success) {
          // 保存 Token
          localStorage.setItem('jwtToken', result.data.token);
          localStorage.setItem('userLoginInfo', JSON.stringify({
            username: result.data.user.username,
            email: result.data.user.email,
            mobilePhone: result.data.user.mobilePhone,
            loginTime: new Date().getTime(),
            loginMethod: 'web_form'
          }));

          // 记录登录
          await loginRecordAPI.recordLogin(result.data.user.username, 'web_form', {
            userId: result.data.user.id,
            sessionId: result.data.sessionId,
            phone: result.data.user.mobilePhone
          });

          hideMessage();
          showMainPage(result.data.user.username);
        } else {
          showMessage(result.error || '登录失败');
        }
      } catch (error) {
        console.error('登录错误:', error);
        showMessage('登录失败，请检查用户名和密码');
      }
    });
  }

  // 处理注册表单提交
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('registerUsername').value;
      const password = document.getElementById('registerPassword').value;
      const email = document.getElementById('registerEmail').value;

      try {
        const result = await authAPI.register(username, password, email);

        if (result.success) {
          showLoginForm('login');
          showMessage('注册成功，请登录', 'success');
        } else {
          showMessage(result.error || '注册失败');
        }
      } catch (error) {
        console.error('注册错误:', error);
        showMessage('注册失败，请稍后重试');
      }
    });
  }

  // 处理短信登录
  const smsLoginForm = document.getElementById('smsLoginForm');
  const sendSmsCodeBtn = document.getElementById('sendSmsCode');
  const smsPhoneInput = document.getElementById('smsPhone');
  const smsCodeInput = document.getElementById('smsCode');

  if (sendSmsCodeBtn) {
    sendSmsCodeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const phone = smsPhoneInput.value.trim();

      if (!phone) {
        showMessage('请输入手机号码');
        return;
      }

      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        showMessage('手机号格式不正确');
        return;
      }

      sendSmsCodeBtn.disabled = true;
      sendSmsCodeBtn.textContent = '发送中...';

      try {
        const result = await authAPI.sendSmsCode(phone);

        if (result.success) {
          showMessage('验证码已发送', 'success');
          let countdown = 60;
          sendSmsCodeBtn.textContent = `${countdown}秒后重发`;
          sendSmsCodeBtn.classList.add('countdown');

          const timer = setInterval(() => {
            countdown--;
            sendSmsCodeBtn.textContent = `${countdown}秒后重发`;

            if (countdown <= 0) {
              clearInterval(timer);
              sendSmsCodeBtn.disabled = false;
              sendSmsCodeBtn.textContent = '发送验证码';
              sendSmsCodeBtn.classList.remove('countdown');
            }
          }, 1000);
        } else {
          showMessage(result.error || '发送失败');
          sendSmsCodeBtn.disabled = false;
          sendSmsCodeBtn.textContent = '发送验证码';
        }
      } catch (error) {
        console.error('发送验证码错误:', error);
        showMessage('发送验证码失败，请稍后重试');
        sendSmsCodeBtn.disabled = false;
        sendSmsCodeBtn.textContent = '发送验证码';
      }
    });
  }

  if (smsLoginForm) {
    smsLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phone = smsPhoneInput.value.trim();
      const code = smsCodeInput.value.trim();

      if (!phone || !code) {
        showMessage('请输入手机号和验证码');
        return;
      }

      try {
        const result = await authAPI.smsLogin(phone, code);

        if (result.success) {
          localStorage.setItem('jwtToken', result.data.token);
          localStorage.setItem('userLoginInfo', JSON.stringify({
            username: result.data.user.username,
            email: result.data.user.email,
            mobilePhone: result.data.user.mobilePhone,
            loginTime: new Date().getTime(),
            loginMethod: 'sms'
          }));

          await loginRecordAPI.recordLogin(result.data.user.username, 'sms', {
            userId: result.data.user.id,
            sessionId: result.data.sessionId,
            phone: phone
          });

          hideMessage();
          showMainPage(result.data.user.username);
        } else {
          showMessage(result.error || '短信登录失败');
        }
      } catch (error) {
        console.error('短信登录错误:', error);
        showMessage('短信登录失败，请检查验证码');
      }
    });
  }
}

// 修改 checkLoginStatus 函数
export async function checkLoginStatus() {
  const savedUserInfo = localStorage.getItem('userLoginInfo');

  if (savedUserInfo) {
    const userInfo = JSON.parse(savedUserInfo);
    const LOGIN_EXPIRY = 24 * 60 * 60 * 1000;
    const timeSinceLogin = new Date().getTime() - userInfo.loginTime;

    if (timeSinceLogin < LOGIN_EXPIRY) {
      // 用户仍然有效
      return {
        valid: true,
        username: userInfo.username,
        mobilePhoneNumber: userInfo.mobilePhone,
        loginMethod: userInfo.loginMethod
      };
    } else {
      // 登录过期
      localStorage.removeItem('userLoginInfo');
      localStorage.removeItem('jwtToken');
      return { valid: false };
    }
  }

  return { valid: false };
}

// 修改 clearLoginStatus 函数
export function clearLoginStatus() {
  localStorage.removeItem('userLoginInfo');
  localStorage.removeItem('jwtToken');
}

// 修改 saveLoginStatus 函数
export function saveLoginStatus(username, loginMethod, mobilePhoneNumber = null) {
  localStorage.setItem('userLoginInfo', JSON.stringify({
    username: username,
    mobilePhoneNumber: mobilePhoneNumber,
    loginMethod: loginMethod,
    loginTime: new Date().getTime()
  }));
}

// 修改登出函数
export async function logout() {
  const userInfo = JSON.parse(localStorage.getItem('userLoginInfo') || '{}');
  const token = localStorage.getItem('jwtToken');

  try {
    if (token) {
      // 获取用户信息
      const currentUser = await authAPI.getCurrentUser();
      if (currentUser.success && currentUser.data.user) {
        // 记录登出
        await loginRecordAPI.recordLogout(null, currentUser.data.user.sessionId);
      }
    }
  } catch (error) {
    console.error('记录登出失败:', error);
  }

  // 清除登录状态
  clearLoginStatus();
  showLoginContainer();
}
```

### 5. 修改 SQL 查询函数

修改第 12914 行附近的 `executeSQLQuery` 函数：

```javascript
// 执行SQL查询
async function executeSQLQuery() {
  const queryInput = document.getElementById('sql-query-input');
  const query = queryInput.value.trim();

  if (!query) {
    alert('请输入SQL查询语句');
    return;
  }

  const resultContent = document.getElementById('query-result-content');
  resultContent.innerHTML = '<p>正在执行查询...</p>';

  try {
    const result = await queryAPI.executeQuery(query);

    if (result.success) {
      displayQueryResult(result);
    } else {
      resultContent.innerHTML = `
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 4px; color: #721c24;">
          <h4>查询失败</h4>
          <p>${result.error || '未知错误'}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('查询错误:', error);
    resultContent.innerHTML = `
      <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 4px; color: #721c24;">
        <h4>查询失败</h4>
        <p>网络错误，请检查后端服务是否运行</p>
      </div>
    `;
  }
}
```

### 6. 修改页面初始化

找到页面底部的 `initLoginSystem()` 调用，确保它在 DOM 加载完成后执行：

```javascript
// 确保 DOM 加载完成后再初始化
document.addEventListener('DOMContentLoaded', () => {
  initLoginSystem();

  // 检查登录状态
  if (!checkLoginStatus()) {
    showLoginContainer();
  }
});
```

### 7. 部署后端服务

1. 将后端代码推送到 GitHub
2. 在 Render 或 Railway 上部署
3. 更新 `custom-api.js` 中的 `API_BASE_URL` 为实际的后端地址

### 8. 测试所有功能

- 用户注册
- 用户登录
- 短信验证码登录
- SQL 查询
- 登录记录
- 登出

## 注意事项

1. 确保 CORS 配置正确，允许前端域名访问
2. 生产环境使用 HTTPS
3. 定期更新依赖包
4. 监控错误日志
5. 配置短信服务提供商（阿里云/腾讯云）
