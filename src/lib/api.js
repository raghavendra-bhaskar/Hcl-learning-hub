// In development Vite proxies /api → http://localhost:4000 (no CORS, same origin).
// Set VITE_API_URL only when deploying without the Vite dev server proxy.
const API_BASE = import.meta.env.VITE_API_URL?.trim() || '/api';

export const TOKEN_KEY = 'hcl-quest-token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

export function storeToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    let msg = `HTTP ${res.status}`;
    if (typeof body.error === 'string') {
      msg = body.error;
    } else if (body.error && typeof body.error === 'object') {
      const fieldErrors = Object.values(body.error.fieldErrors || {}).flat();
      msg = fieldErrors[0] || body.error.formErrors?.[0] || `HTTP ${res.status}`;
    }
    throw Object.assign(new Error(msg), { status: res.status, body });
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get:    (path)       => request(path),
  post:   (path, data) => request(path, { method: 'POST',   body: JSON.stringify(data) }),
  put:    (path, data) => request(path, { method: 'PUT',    body: JSON.stringify(data) }),
  patch:  (path, data) => request(path, { method: 'PATCH',  body: JSON.stringify(data) }),
  delete: (path)       => request(path, { method: 'DELETE' }),
};
