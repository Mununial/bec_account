/**
 * Central REST API Client Wrapper
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const API_BASE = '/api';

const api = {
  getToken() {
    return sessionStorage.getItem('bec_auth_token') || localStorage.getItem('bec_auth_token');
  },

  setToken(token, remember = false) {
    if (remember) {
      localStorage.setItem('bec_auth_token', token);
    } else {
      sessionStorage.setItem('bec_auth_token', token);
    }
  },

  clearToken() {
    sessionStorage.removeItem('bec_auth_token');
    localStorage.removeItem('bec_auth_token');
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      // Handle 401 unauthorized
      if (response.status === 401) {
        this.clearToken();
        if (!window.location.pathname.includes('login')) {
          window.location.href = '/login.html';
        }
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data && data.message ? data.message : `HTTP error ${response.status}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check your internet or server status.');
      }
      throw err;
    }
  },

  get(endpoint, params = null) {
    let url = endpoint;
    if (params) {
      const cleanParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          cleanParams.append(k, v);
        }
      });
      const qs = cleanParams.toString();
      if (qs) url += `?${qs}`;
    }
    return this.request(url, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  },

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  },

  patch(endpoint, body) {
    return this.request(endpoint, { method: 'PATCH', body });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

window.api = api;
