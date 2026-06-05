// Files API — user-facing: list available files, download a file.
import { userFetch, userDownloadFetch } from './config';

/**
 * GET /api/files
 * Requires valid session_token Cookie.
 * Returns: array of { id, title, description, size, created_at }
 */
export async function fetchFileList() {
  return userFetch('/api/files');
}

/**
 * GET /api/files/:id/download
 * Returns: Response (PDF binary stream)
 * Triggers browser download via Content-Disposition header.
 */
export { userDownloadFetch as downloadFile };
