import { neon } from '@neondatabase/serverless';
import { EVENT_DATE } from './guest-validation';
export type GuestGroup = { id: string; names: string[]; status: 'confirmed' | 'cancelled'; created_at: string; updated_at: string; version: number };
let initialized: Promise<void> | undefined;
export function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_NOT_CONFIGURED');
  return neon(process.env.DATABASE_URL);
}
export async function ensureGuestDatabase() {
  if (!initialized) initialized = (async () => {
    const sql = database();
    await sql.transaction([
      sql`SELECT pg_advisory_xact_lock(19122026)`,
      sql`CREATE TABLE IF NOT EXISTS attendance (id TEXT PRIMARY KEY, name TEXT NOT NULL, event_date TEXT NOT NULL, created_at TEXT NOT NULL)`,
      sql`CREATE TABLE IF NOT EXISTS attendance_groups (
        id TEXT PRIMARY KEY, names JSONB NOT NULL CHECK (jsonb_typeof(names) = 'array' AND jsonb_array_length(names) BETWEEN 1 AND 20),
        event_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), version INTEGER NOT NULL DEFAULT 1
      )`,
      sql`CREATE TABLE IF NOT EXISTS admin_login_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL)`,
      sql`INSERT INTO attendance_groups (id, names, event_date, created_at, updated_at)
        SELECT split_part(id, ':', 1), jsonb_agg(name ORDER BY CASE WHEN strpos(id, ':') = 0 THEN 0 ELSE split_part(id, ':', 2)::integer END), event_date, MIN(created_at)::timestamptz, MAX(created_at)::timestamptz
        FROM attendance WHERE event_date = ${EVENT_DATE}
        GROUP BY split_part(id, ':', 1), event_date ON CONFLICT (id) DO NOTHING`
    ]);
  })().catch(error => { initialized = undefined; throw error; });
  await initialized;
}
export async function guestGroups(): Promise<GuestGroup[]> {
  await ensureGuestDatabase();
  const sql = database();
  return await sql`SELECT id, names, status, created_at, updated_at, version FROM attendance_groups WHERE event_date = ${EVENT_DATE} ORDER BY created_at DESC, id` as GuestGroup[];
}
