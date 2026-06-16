// Admin API — login, upload, list files, delete files.
import { adminFetch, API_BASE } from './config';

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
 * POST /api/admin/files/upload (with progress callback)
 * Uses XMLHttpRequest to report upload progress for large files (up to 500MB).
 * onProgress receives a 0–100 integer.
 */
export function adminUploadFileWithProgress(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const token = localStorage.getItem('admin_token');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/admin/files/upload`);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          if (xhr.status === 401) localStorage.removeItem('admin_token');
          const err = new Error(data.error || `Upload failed (${xhr.status})`);
          err.status = xhr.status;
          reject(err);
        }
      } catch {
        reject(new Error('Invalid server response'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.timeout = 600000; // 10 min for 500MB
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.send(formData);
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
