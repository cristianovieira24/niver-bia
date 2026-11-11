import { cookies } from 'next/headers';
import { database, ensureGuestDatabase } from './guest-db';
import { sign, validSession, SESSION_COOKIE } from './admin-session';
export { adminConfigured, makeSession, SESSION_COOKIE, validPassword } from './admin-session';
export async function isAdmin() { return validSession((await cookies()).get(SESSION_COOKIE)?.value); }
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/', maxAge: 60 * 60 * 12 };
export function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
export async function loginAllowed(request: Request) {
  // Shared counter across server instances; IPs are stored only as keyed hashes.
  await ensureGuestDatabase();
  const sql = database();
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const key = sign(`login:${ip}`);
  const rows = await sql`INSERT INTO admin_login_limits (key, attempts, expires_at) VALUES (${key}, 1, NOW() + INTERVAL '15 minutes')
    ON CONFLICT (key) DO UPDATE SET attempts = CASE WHEN admin_login_limits.expires_at < NOW() THEN 1 ELSE admin_login_limits.attempts + 1 END,
    expires_at = CASE WHEN admin_login_limits.expires_at < NOW() THEN NOW() + INTERVAL '15 minutes' ELSE admin_login_limits.expires_at END RETURNING attempts`;
  return Number(rows[0].attempts) <= 10;
}
