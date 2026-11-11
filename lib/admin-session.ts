import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export const SESSION_COOKIE = 'be_admin';
const SESSION_SECONDS = 60 * 60 * 12;
export function adminConfigured() { return !!process.env.ADMIN_PASSWORD_HASH && !!process.env.ADMIN_SESSION_SECRET; }
export function sign(value: string) { return createHmac('sha256', process.env.ADMIN_SESSION_SECRET!).update(value).digest('base64url'); }
export function validPassword(password: string) {
  const [salt, hash] = (process.env.ADMIN_PASSWORD_HASH || '').split(':');
  if (!salt || !hash || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(expected, actual);
}
export function makeSession() {
  if (!adminConfigured()) throw new Error('ADMIN_NOT_CONFIGURED');
  const payload = `${Math.floor(Date.now() / 1000) + SESSION_SECONDS}.${randomBytes(24).toString('base64url')}`;
  return `${payload}.${sign(payload)}`;
}
export function validSession(token: string | undefined) {
  if (!adminConfigured() || !token || token.length > 256) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || !/^\d+$/.test(parts[0])) return false;
  const expires = Number(parts[0]);
  const now = Math.floor(Date.now() / 1000);
  if (expires <= now || expires > now + SESSION_SECONDS) return false;
  const actual = Buffer.from(parts[2]);
  const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
