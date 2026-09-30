const API_BASE = '/api';

function getSessionId() {
  let id = localStorage.getItem('folio_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('folio_session_id', id);
  }
  return id;
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = localStorage.getItem('folio_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!token) headers['x-session-id'] = getSessionId();

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const catalogApi = {
  categories: () => api('/catalog/categories'),
  category: (slug) => api(`/catalog/categories/${slug}`),
  subcategory: (cat, sub) => api(`/catalog/categories/${cat}/${sub}`),
  products: (params) => api(`/catalog/products?${new URLSearchParams(params)}`),
  product: (slug) => api(`/catalog/products/${slug}`),
  search: (q) => api(`/catalog/search?q=${encodeURIComponent(q)}`),
  banners: () => api('/catalog/banners'),
  shipping: () => api('/catalog/shipping-methods'),
  page: (slug) => api(`/catalog/pages/${slug}`),
  settings: () => api('/catalog/settings/public'),
  recentlyViewed: (customerId) => api(`/catalog/recently-viewed${customerId ? `?customerId=${customerId}` : ''}`),
};

export const authApi = {
  signup: (body) => api('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  verifySignup: (body) => api('/auth/verify-signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => api('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  requestOtp: (body) => api('/auth/request-otp', { method: 'POST', body: JSON.stringify(body) }),
  loginOtp: (body) => api('/auth/login-otp', { method: 'POST', body: JSON.stringify(body) }),
  me: () => api('/auth/me'),
};

export const cartApi = {
  get: () => api('/cart'),
  addItem: (productId, quantity = 1) => api('/cart/items', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),
  updateItem: (id, quantity) => api(`/cart/items/${id}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),
  applyCoupon: (code) => api('/cart/coupon', { method: 'POST', body: JSON.stringify({ code }) }),
  removeCoupon: () => api('/cart/coupon', { method: 'DELETE' }),
  shippingEstimate: (shippingMethodId) => api('/cart/shipping-estimate', { method: 'POST', body: JSON.stringify({ shippingMethodId }) }),
};

export const accountApi = {
  profile: () => api('/account/profile'),
  updateProfile: (body) => api('/account/profile', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) => api('/account/password', { method: 'PUT', body: JSON.stringify(body) }),
  addresses: () => api('/account/addresses'),
  addAddress: (body) => api('/account/addresses', { method: 'POST', body: JSON.stringify(body) }),
  deleteAddress: (id) => api(`/account/addresses/${id}`, { method: 'DELETE' }),
  wishlist: () => api('/account/wishlist'),
  addWishlist: (id) => api(`/account/wishlist/${id}`, { method: 'POST' }),
  removeWishlist: (id) => api(`/account/wishlist/${id}`, { method: 'DELETE' }),
  orders: (page = 1) => api(`/account/orders?page=${page}`),
  order: (id) => api(`/account/orders/${id}`),
  placeOrder: (body) => api('/account/orders', { method: 'POST', body: JSON.stringify(body) }),
  cancelOrder: (id, reason) => api(`/account/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  addReview: (body) => api('/account/reviews', { method: 'POST', body: JSON.stringify(body) }),
  notifications: () => api('/account/notifications'),
};
