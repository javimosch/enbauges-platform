const api = {
  baseUrl: '',
  
  getToken() {
    return localStorage.getItem('accessToken');
  },

  setTokens(token, refreshToken) {
    localStorage.setItem('accessToken', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  },

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  async request(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(this.baseUrl + url, { ...options, headers });
    
    if (res.status === 401 && token) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        const retry = await fetch(this.baseUrl + url, { ...options, headers });
        return this.handleResponse(retry);
      }
      this.clearTokens();
      throw new Error('Session expirée');
    }

    return this.handleResponse(res);
  },

  async handleResponse(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');
    return data;
  },

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    try {
      const res = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (res.ok) {
        const data = await res.json();
        this.setTokens(data.token, data.refreshToken);
        return true;
      }
    } catch (e) {}
    return false;
  },

  get(url) { return this.request(url); },
  post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
  put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); },
  delete(url) { return this.request(url, { method: 'DELETE' }); },

  auth: {
    login: (email, password) => api.post('/api/auth/login', { email, password }),
    register: (email, password, name) => api.post('/api/auth/register', { email, password, name }),
    me: async () => {
      const data = await api.get('/api/auth/me');
      return data.user;
    }
  },

  orgs: {
    list: () => api.get('/api/orgs'),
    listPublic: () => api.get('/api/orgs/public'),
    create: (data) => api.post('/api/orgs', data),
    get: (id) => api.get(`/api/orgs/${id}`),
    update: (id, data) => api.put(`/api/orgs/${id}`, data),
    getPublic: (id) => api.get(`/api/orgs/${id}/public`),
    join: (id) => api.post(`/api/orgs/${id}/join`, {})
  },

  members: {
    list: (orgId) => api.get(`/api/orgs/${orgId}/members`),
    add: (orgId, data) => api.post(`/api/orgs/${orgId}/members`, data),
    remove: (orgId, userId) => api.delete(`/api/orgs/${orgId}/members/${userId}`)
  },

  invites: {
    list: (orgId) => api.get(`/api/orgs/${orgId}/invites`),
    create: (orgId, data) => api.post(`/api/orgs/${orgId}/invites`, data),
    revoke: (orgId, id) => api.delete(`/api/orgs/${orgId}/invites/${id}`),
    getInfo: (token) => api.get(`/api/invites/info?token=${token}`),
    accept: (data) => api.post('/api/invites/accept', data)
  },

  events: {
    list: (orgId, params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/api/enbauges/orgs/${orgId}/events${qs ? '?' + qs : ''}`);
    },
    listPublicAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/api/enbauges/events/public${qs ? '?' + qs : ''}`);
    },
    listPublic: (orgId, params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/api/enbauges/orgs/${orgId}/events/public${qs ? '?' + qs : ''}`);
    },
    create: (orgId, data) => api.post(`/api/enbauges/orgs/${orgId}/events`, data),
    update: (orgId, id, data) => api.put(`/api/enbauges/orgs/${orgId}/events/${id}`, data),
    delete: (orgId, id) => api.delete(`/api/enbauges/orgs/${orgId}/events/${id}`),
    approve: (orgId, id) => api.post(`/api/enbauges/orgs/${orgId}/events/${id}/approve`),
    reject: (orgId, id, reason) => api.post(`/api/enbauges/orgs/${orgId}/events/${id}/reject`, { reason }),
    pendingCount: (orgId) => api.get(`/api/enbauges/orgs/${orgId}/events/pending-count`)
  }
};
