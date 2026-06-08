// Files API — user-facing: list available files, download a file.
import { userFetch, userDownloadFetch } from './config';

/**
 * GET /api/files?page=1&limit=20&search=keyword
 * Requires valid session_token Cookie.
 * Returns: { total, files: [{ id, title, description, size, created_at }] }
 */
export async function fetchFileList({ page = 1, limit = 20, search = '' } = {}) {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (search) params.append('search', search);
  return userFetch(`/api/files?${params}`);
}

/**
 * GET /api/files/:id/download
 * Returns: Response (PDF binary stream)
 * Triggers browser download via Content-Disposition header.
 */
export { userDownloadFetch as downloadFile };
