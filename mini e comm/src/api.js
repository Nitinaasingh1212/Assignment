const API_ROOT = '/api';
let accessToken = null;
let refreshRequest = null;

async function request(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && retry && accessToken && path !== '/auth/refresh-token' && path !== '/auth/login') {
    try {
      await refreshSession();
      return request(path, options, false);
    } catch {
      accessToken = null;
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = data.errors?.map((error) => error.msg).join(' ');
    throw new Error(details || data.message || 'Something went wrong.');
  }
  return data;
}

async function refreshSession() {
  if (!refreshRequest) {
    refreshRequest = request('/auth/refresh-token', { method: 'POST' }, false)
      .then((data) => {
        accessToken = data.accessToken;
        return data;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

export const api = {
  async register(values) {
    return request('/auth/register', { method: 'POST', body: JSON.stringify(values) });
  },
  async login(values) {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify(values) });
    accessToken = data.accessToken;
    return data.user;
  },
  async restoreSession() {
    try {
      const data = await refreshSession();
      return data.user;
    } catch {
      accessToken = null;
      return null;
    }
  },
  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      accessToken = null;
    }
  },
  me: () => request('/auth/me'),
  products: (params = {}) => request(`/products?${new URLSearchParams(params)}`),
  createProduct: (values) => request('/products', { method: 'POST', body: JSON.stringify(values) }),
  updateProduct: (id, values) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(values) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
};