// Admin API — login, upload, list files, delete files.
import { adminFetch } from './config';

/**
 * POST /api/admin/login
 * Body: { password }
 * Returns: { token }
 */
export async function adminLogin(password) {
  const data = await adminFetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  if (data.token) {
    localStorage.setItem('admin_token', data.token);
  }
  return data;
}

/**
 * GET /api/admin/files
 * Returns: array of file objects (includes stored_path, download_count, etc.)
 */
export async function adminListFiles() {
  return adminFetch('/api/admin/files');
}

/**
 * POST /api/admin/files/upload
 * Body: FormData with fields "file", optional "title", optional "description"
 * Returns: { id, title, original_name, size }
 */
export async function adminUploadFile(formData) {
  return adminFetch('/api/admin/files/upload', {
    method: 'POST',
    body: formData,
  });
}

/**
 * DELETE /api/admin/files/:id
 * Returns: { success: true, message: "..." }
 */
export async function adminDeleteFile(id) {
  return adminFetch(`/api/admin/files/${id}`, {
    method: 'DELETE',
  });
}

/**
 * GET /api/admin/stats
 * Returns: { totalStorage, totalFiles, todayVisitors, todayDownloads, topDownloads }
 */
export async function adminGetStats() {
  return adminFetch('/api/admin/stats');
}

/**
 * GET /api/admin/download-logs
 * Returns: array of { id, ip, key_id, key_prefix, file_title, file_id, downloaded_at }
 */
export async function adminGetDownloadLogs() {
  return adminFetch('/api/admin/download-logs');
}
