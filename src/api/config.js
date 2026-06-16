// API configuration — environment-aware base URL and shared helpers.
// Production backend:  https://cjdfnwwofgct.sealosgzg.site
// Development backend: http://localhost:8080 (with CRA proxy in package.json)

export const API_BASE = process.env.REACT_APP_API_BASE || '';

// ---- shared fetch wrappers -------------------------------------------------

/**
 * Fetch wrapper that injects the admin JWT Bearer token and handles 401.
 * Token is read from localStorage("admin_token") on every call.
 * Returns the parsed JSON body on success; throws with `{status, body}` on error.
 */
export async function adminFetch(path, options = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // For FormData, let the browser set Content-Type with boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // On 401, clear the stale token so the UI can redirect
    if (res.status === 401) {
      localStorage.removeItem('admin_token');
    }
    const err = new Error(`[${res.status}] ${data.error || 'Request failed'}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

/**
 * Fetch wrapper for user-facing endpoints that rely on Cookie-based sessions.
 * Automatically includes `credentials: "include"`.
 * Handles 401 by resolving the JSON error body (caller decides on redirect).
 */
export async function userFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(`[${res.status}] ${data.error || 'Request failed'}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

/**
 * Fetch wrapper for user file downloads that returns the raw Response.
 * Does NOT parse as JSON — the response is a PDF binary stream.
 */
export async function userDownloadFetch(fileId, signal) {
  const res = await fetch(`${API_BASE}/api/files/${fileId}/download`, {
    credentials: 'include',
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || `Download failed (${res.status})`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return res;
}
