export const API_BASE = import.meta.env.VITE_API_URL || 'https://colonialbackend.surfsyncinfotech.xyz';

export function inr(value) {
  const num = Number(value || 0);
  return `₹${num.toLocaleString('en-IN')}`;
}

export function discountOf(price, sale) {
  if (sale == null || Number(sale) >= Number(price)) return 0;
  return Math.round((1 - Number(sale) / Number(price)) * 100);
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = localStorage.getItem('folio_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const response = await fetch(url, { method, headers, body: payload });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong. Please try again.');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function media(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE}${url}`;
  if (url.startsWith('uploads/')) return `${API_BASE}/${url}`;
  return url;
}
