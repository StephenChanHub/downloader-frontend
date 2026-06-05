// Auth API — verify a one-time access key to obtain a 30-min Cookie session.
import { userFetch } from './config';

/**
 * POST /api/auth/verify-key
 * Body: { key }
 * Returns: { success: true, message, expires_at }
 * Sets Cookie: session_token (HttpOnly; SameSite=Strict; Secure in prod)
 */
export async function verifyAccessKey(key) {
  return userFetch('/api/auth/verify-key', {
    method: 'POST',
    body: JSON.stringify({ key }),
  });
}
