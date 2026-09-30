const API = '/api/admin';

async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('folio_admin_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const adminApi = {
  login: (body) => fetch('/api/admin/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.message);
    return d;
  }),
  me: () => api('/auth/me'.replace('/api/admin', '') || fetch('/api/admin/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('folio_admin_token')}` } }).then(r => r.json())),
  dashboard: () => api('/dashboard'),
  products: (page = 1) => api(`/products?page=${page}`),
  product: (id) => api(`/products/${id}`),
  createProduct: (body) => api('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) => api(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  duplicateProduct: (id) => api(`/products/${id}/duplicate`, { method: 'POST' }),
  categories: () => api('/categories'),
  subcategories: (catId) => api(`/subcategories${catId ? `?categoryId=${catId}` : ''}`),
  orders: (page = 1) => api(`/orders?page=${page}`),
  order: (id) => api(`/orders/${id}`),
  updateOrderStatus: (id, body) => api(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  customers: (page = 1) => api(`/customers?page=${page}`),
  approveCustomer: (id, approved) => api(`/customers/${id}/approval`, { method: 'PATCH', body: JSON.stringify({ approved }) }),
  blockCustomer: (id, blocked) => api(`/customers/${id}/block`, { method: 'PATCH', body: JSON.stringify({ blocked }) }),
  coupons: () => api('/coupons'),
  reviews: () => api('/reviews'),
  updateReview: (id, body) => api(`/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  banners: () => api('/banners'),
  shipping: () => api('/shipping-methods'),
  cmsPages: () => api('/cms-pages'),
  settings: () => api('/settings'),
  updateSettings: (body) => api('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  adminUsers: () => api('/admin-users'),
  roles: () => api('/roles'),
  activityLogs: () => api('/activity-logs'),
  analytics: (days = 30) => api(`/analytics/sales?days=${days}`),
  search: (q) => api(`/search?q=${encodeURIComponent(q)}`),
  adjustInventory: (body) => api('/inventory/adjust', { method: 'POST', body: JSON.stringify(body) }),
};

// Fix me endpoint
adminApi.me = () => fetch('/api/admin/auth/me', {
  headers: { Authorization: `Bearer ${localStorage.getItem('folio_admin_token')}` },
}).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; });
