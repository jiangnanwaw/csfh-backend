/**
 * 自定义 API 封装 - 替代 LeanCloud
 * 长沙飞狐数据管理平台
 */

// API 基础配置
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
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Token 过期或无效
          clearLoginStatus();
          showLoginContainer();
          alert('登录已过期，请重新登录');
          break;
        case 403:
          alert('无权访问此资源');
          break;
        case 404:
          console.error('API 接口不存在:', error.config.url);
          break;
        case 500:
          console.error('服务器内部错误:', error.response.data);
          break;
      }
    } else if (error.request) {
      console.error('网络错误，无法连接到服务器');
    }
    return Promise.reject(error);
  }
);

// ============================================================
// 认证相关 API
// ============================================================
const authAPI = {
  // 用户注册
  register: async (username, password, email) => {
    return api.post('/auth/register', { username, password, email });
  },

  // 用户名密码登录
  login: async (username, password) => {
    return api.post('/auth/login', { username, password });
  },

  // 短信验证码登录
  smsLogin: async (phone, code) => {
    return api.post('/auth/sms-login', { phone, code });
  },

  // 发送短信验证码
  sendSmsCode: async (phone) => {
    return api.post('/auth/send-sms-code', { phone });
  },

  // 密码重置
  resetPassword: async (email) => {
    return api.post('/auth/reset-password', { email });
  },

  // 检查用户授权
  checkAuthorization: async (username) => {
    return api.get('/auth/check-authorization', { params: { username } });
  },

  // 获取当前用户信息
  getCurrentUser: async () => {
    return api.get('/auth/me');
  },

  // 登出
  logout: async (sessionId) => {
    return api.post('/auth/logout', { sessionId });
  }
};

// ============================================================
// SQL 查询相关 API
// ============================================================
const queryAPI = {
  // 执行 SQL 查询
  executeQuery: async (sql) => {
    return api.post('/query/execute', { query: sql });
  },

  // 获取数据库表列表
  getTables: async () => {
    return api.get('/query/tables');
  },

  // 获取表结构
  getTableSchema: async (tableName) => {
    return api.get(`/query/schema/${tableName}`);
  }
};

// ============================================================
// 登录记录相关 API
// ============================================================
const loginRecordAPI = {
  // 记录用户登录
  recordLogin: async (username, loginMethod, additionalData = {}) => {
    return api.post('/login-records/record', { username, loginMethod, additionalData });
  },

  // 记录用户登出
  recordLogout: async (sessionId, recordId) => {
    return api.post('/login-records/logout', { sessionId, recordId });
  },

  // 获取用户登录历史
  getLoginHistory: async (username, limit = 10) => {
    return api.get('/login-records/history', { params: { username, limit } });
  },

  // 获取最近一次登录记录
  getLastLoginRecord: async (username) => {
    return api.get('/login-records/last', { params: { username } });
  }
};

// ============================================================
// 工具函数
// ============================================================

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
function showMessage(message, type = 'error') {
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
function hideMessage() {
  const messageEl = document.getElementById('loginMessage');
  if (messageEl) {
    messageEl.style.display = 'none';
  }
}

// 显示登录容器
function showLoginContainer() {
  document.getElementById('login-container').style.display = 'flex';
  document.getElementById('login-header-title').style.display = 'block';
  document.getElementById('login-footer-copyright').style.display = 'block';
  document.getElementById('main-container').style.display = 'none';

  // 重置表单
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('resetForm').style.display = 'none';
  document.getElementById('smsLoginForm').style.display = 'none';
  document.querySelector('#login-container .logo i').className = 'fas fa-user-lock';

  // 清空输入
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('smsPhone').value = '';
  document.getElementById('smsCode').value = '';
}

// 隐藏登录容器
function hideLoginContainer() {
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('login-header-title').style.display = 'none';
  document.getElementById('login-footer-copyright').style.display = 'none';
  document.getElementById('main-container').style.display = 'block';
}

// 显示主页面
function showMainPage(username) {
  hideLoginContainer();
  // 这里可以添加其他初始化逻辑
  console.log('用户登录:', username);
}

// 清除登录状态
function clearLoginStatus() {
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('userLoginInfo');
  localStorage.removeItem('lastLoginRecordId');
}

// 保存登录状态
function saveLoginStatus(username, loginMethod, mobilePhoneNumber = null) {
  localStorage.setItem('userLoginInfo', JSON.stringify({
    username: username,
    mobilePhoneNumber: mobilePhoneNumber,
    loginMethod: loginMethod,
    loginTime: new Date().getTime()
  }));
}

// 检查登录状态
function checkLoginStatus() {
  const savedUserInfo = localStorage.getItem('userLoginInfo');

  if (savedUserInfo) {
    const userInfo = JSON.parse(savedUserInfo);
    const LOGIN_EXPIRY = 24 * 60 * 60 * 1000;
    const timeSinceLogin = new Date().getTime() - userInfo.loginTime;

    if (timeSinceLogin < LOGIN_EXPIRY) {
      return {
        valid: true,
        username: userInfo.username,
        mobilePhoneNumber: userInfo.mobilePhoneNumber,
        loginMethod: userInfo.loginMethod
      };
    } else {
      clearLoginStatus();
      return { valid: false };
    }
  }

  return { valid: false };
}

// ============================================================
// 登录系统初始化
// ============================================================
async function initLoginSystem() {
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

  // 切换表单显示
  function showLoginForm(formName, iconClass = 'fa-user-lock', title = '用户登录') {
    hideMessage();
    loginForm.style.display = formName === 'login' ? 'block' : 'none';
    registerForm.style.display = formName === 'register' ? 'block' : 'none';
    resetForm.style.display = formName === 'reset' ? 'block' : 'none';
    const smsLoginForm = document.getElementById('smsLoginForm');
    if (smsLoginForm) {
      smsLoginForm.style.display = formName === 'sms' ? 'block' : 'none';
    }
    const icon = document.querySelector('#login-container .logo i');
    if (icon) {
      icon.className = `fas ${iconClass}`;
    }
    const titleEl = document.getElementById('form-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  // 显示注册链接
  if (showRegister) {
    showRegister.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginForm('register', 'fa-user-plus', '用户注册');
    });
  }

  // 显示短信登录
  if (showSmsLogin) {
    showSmsLogin.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginForm('sms', 'fa-mobile-alt', '短信登录');
    });
  }

  // 返回登录（从注册）
  if (backToLoginFromRegister) {
    backToLoginFromRegister.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginForm('login');
    });
  }

  // 返回登录（从密码重置）
  if (backToLoginFromReset) {
    backToLoginFromReset.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginForm('login');
    });
  }

  // 返回登录（从短信登录）
  if (backToLoginFromSms) {
    backToLoginFromSms.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginForm('login');
    });
  }

  // ============================================================
  // 登录表单提交
  // ============================================================
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
          saveLoginStatus(result.data.user.username, 'web_form', result.data.user.mobilePhone);

          // 记录登录
          try {
            await loginRecordAPI.recordLogin(result.data.user.username, 'web_form', {
              userId: result.data.user.id,
              sessionId: result.data.sessionId,
              phone: result.data.user.mobilePhone
            });
          } catch (recordError) {
            console.error('记录登录失败:', recordError);
          }

          hideMessage();
          showMainPage(result.data.user.username);
        } else {
          const errorMsg = result.error || '登录失败';
          if (errorMsg.includes('用户名或密码')) {
            showMessage('用户名或密码错误');
          } else {
            showMessage(errorMsg);
          }
        }
      } catch (error) {
        console.error('登录错误:', error);
        showMessage('登录失败，请检查用户名和密码');
      }
    });
  }

  // ============================================================
  // 注册表单提交
  // ============================================================
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
          const errorMsg = result.error || '注册失败';
          if (errorMsg.includes('用户名已存在')) {
            showMessage('用户名已存在，请使用其他用户名');
          } else if (errorMsg.includes('邮箱已被注册')) {
            showMessage('邮箱已被注册，请使用其他邮箱');
          } else {
            showMessage(errorMsg);
          }
        }
      } catch (error) {
        console.error('注册错误:', error);
        showMessage('注册失败，请稍后重试');
      }
    });
  }

  // ============================================================
  // 密码重置
  // ============================================================
  const resetForm = document.getElementById('resetForm');
  if (resetForm) {
    const showReset = document.getElementById('showReset');
    if (showReset) {
      showReset.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm('reset', 'fa-key', '密码重置');
      });
    }

    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('resetEmail').value;

      try {
        const result = await authAPI.resetPassword(email);

        if (result.success) {
          showLoginForm('login');
          showMessage('如果邮箱存在，重置链接已发送', 'success');
        } else {
          showMessage(result.error || '重置请求失败');
        }
      } catch (error) {
        console.error('密码重置错误:', error);
        showMessage('重置请求失败，请稍后重试');
      }
    });
  }

  // ============================================================
  // 短信验证码登录
  // ============================================================
  const smsLoginForm = document.getElementById('smsLoginForm');
  const sendSmsCodeBtn = document.getElementById('sendSmsCode');
  const smsPhoneInput = document.getElementById('smsPhone');
  const smsCodeInput = document.getElementById('smsCode');

  // 发送验证码按钮
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

          // 开发环境显示验证码
          if (result.data && result.data.code) {
            console.log(`[开发环境] 验证码: ${result.data.code}`);
          }

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

  // 短信登录表单提交
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
          saveLoginStatus(result.data.user.username, 'sms', result.data.user.mobilePhone);

          // 记录登录
          try {
            await loginRecordAPI.recordLogin(result.data.user.username, 'sms', {
              userId: result.data.user.id,
              sessionId: result.data.sessionId,
              phone: phone
            });
          } catch (recordError) {
            console.error('记录登录失败:', recordError);
          }

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

// ============================================================
// 页面初始化
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // 初始化登录系统
  initLoginSystem();

  // 检查登录状态
  const loginStatus = checkLoginStatus();
  if (loginStatus.valid) {
    // 已登录，显示主页面
    showMainPage(loginStatus.username);
  } else {
    // 未登录，显示登录容器
    showLoginContainer();
  }
});

// ============================================================
// 导出 API (供其他脚本使用)
// ============================================================
window.authAPI = authAPI;
window.queryAPI = queryAPI;
window.loginRecordAPI = loginRecordAPI;
window.checkLoginStatus = checkLoginStatus;
window.clearLoginStatus = clearLoginStatus;
window.saveLoginStatus = saveLoginStatus;
window.showLoginContainer = showLoginContainer;
window.hideLoginContainer = hideLoginContainer;
window.showMainPage = showMainPage;
