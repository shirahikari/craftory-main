/* ═══════════════════════════════════════════
   CRAFTORY api.js — Backend API Client
   All calls go through /api/v1/... (proxied by nginx)
   ═══════════════════════════════════════════ */

const API_BASE = (window.ENV && window.ENV.API_BASE) ? window.ENV.API_BASE : '/api/v1';

let _csrfToken = null;

function _showApiDownBanner() {
  if (document.getElementById('api-down-banner')) return;
  const div = document.createElement('div');
  div.id = 'api-down-banner';
  div.setAttribute('role', 'alert');
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#FEF3C7;color:#92400E;border-bottom:1.5px solid #FDE68A;padding:10px 16px;font-family:system-ui,sans-serif;font-size:.9rem;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.06)';
  div.textContent = '⚠️ Hệ thống đang bảo trì — một số tính năng tạm thời không khả dụng. Vui lòng thử lại sau ít phút.';
  document.body && document.body.appendChild(div);
}

function _hideApiDownBanner() {
  const el = document.getElementById('api-down-banner');
  if (el) el.remove();
}

async function _fetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { 'Content-Type': 'application/json' };

  // Include CSRF token for mutating requests
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && _csrfToken) {
    headers['X-CSRF-Token'] = _csrfToken;
  }

  let res;
  try {
    res = await fetch(API_BASE + path, {
      credentials: 'include',
      headers: { ...headers, ...(options.headers || {}) },
      ...options,
    });
  } catch (networkErr) {
    // Network failure — show maintenance banner once.
    _showApiDownBanner();
    const err = new Error('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    err.status = 0;
    err.networkError = true;
    throw err;
  }

  // 5xx upstream failure (e.g. 502/503/504 when backend container is down)
  if (res.status >= 502 && res.status <= 504) {
    _showApiDownBanner();
  } else if (res.ok) {
    _hideApiDownBanner();
  }

  // Parse response
  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

const API = {
  auth: {
    me() { return _fetch('/auth/me'); },

    async login(email, password) {
      const data = await _fetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.csrfToken) _csrfToken = data.csrfToken;
      return data;
    },

    async register(name, email, password) {
      const data = await _fetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      if (data.csrfToken) _csrfToken = data.csrfToken;
      return data;
    },

    async logout() {
      const result = await _fetch('/auth/logout', { method: 'POST' });
      _csrfToken = null;
      return result;
    },

    async getCsrf() {
      const data = await _fetch('/auth/csrf');
      if (data.csrfToken) _csrfToken = data.csrfToken;
      return data;
    },
  },

  products: {
    list(params = {})  { return _fetch('/products?' + new URLSearchParams(params)); },
    get(id)            { return _fetch(`/products/${id}`); },
  },

  workshops: {
    list()       { return _fetch('/workshops'); },
    get(id)      { return _fetch(`/workshops/${id}`); },
    register(d)  { return _fetch('/workshops/register', { method: 'POST', body: JSON.stringify(d) }); },
  },

  orders: {
    create(data) { return _fetch('/orders', { method: 'POST', body: JSON.stringify(data) }); },
    list()       { return _fetch('/orders'); },
    get(id)      { return _fetch(`/orders/${id}`); },
  },

  admin: {
    users: {
      list()          { return _fetch('/admin/users'); },
      update(id, d)   { return _fetch(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(d) }); },
    },
    products: {
      list(params = {})   { return _fetch('/admin/products?' + new URLSearchParams(params)); },
      create(d)           { return _fetch('/admin/products', { method: 'POST', body: JSON.stringify(d) }); },
      update(id, d)       { return _fetch(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(d) }); },
      remove(id)          { return _fetch(`/admin/products/${id}`, { method: 'DELETE' }); },
    },
    orders: {
      list(params = {})        { return _fetch('/admin/orders?' + new URLSearchParams(params)); },
      updateStatus(id, status) { return _fetch(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); },
    },
    stats() { return _fetch('/admin/stats'); },
  },

  chat: {
    send(messages, systemPrompt) {
      return _fetch('/chat', { method: 'POST', body: JSON.stringify({ messages, systemPrompt }) });
    },
  },
};

// Seed CSRF token from existing session on page load
(async () => {
  try {
    const data = await _fetch('/auth/me');
    if (data.user) {
      const csrf = await _fetch('/auth/csrf');
      if (csrf.csrfToken) _csrfToken = csrf.csrfToken;
    }
  } catch { /* not logged in */ }
})();
