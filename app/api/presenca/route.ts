import { database, ensureGuestDatabase } from '@/lib/guest-db';
import { EVENT_DATE, GROUP_ID, normalizeNames } from '@/lib/guest-validation';
import { readJson } from '@/lib/request-json';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  let names: string[], requestId: string;
  try {
    const body = await readJson(request);
    names = normalizeNames(Array.isArray(body.names) ? body.names : typeof body.name === 'string' ? [body.name] : null);
    if (body.count !== undefined && body.count !== names.length) throw new Error('Preencha o nome de todas as pessoas.');
    if (typeof body.requestId !== 'string' || !GROUP_ID.test(body.requestId)) throw new Error('Abra o formulário novamente.');
    requestId = body.requestId;
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Dados inválidos.' }, { status: 400 }); }
  try {
    await ensureGuestDatabase();
    const sql = database();
    await sql`INSERT INTO attendance_groups (id, names, event_date) VALUES (${requestId}, ${JSON.stringify(names)}::jsonb, ${EVENT_DATE}) ON CONFLICT (id) DO NOTHING`;
    const [saved] = await sql`SELECT names, status FROM attendance_groups WHERE id = ${requestId} AND event_date = ${EVENT_DATE}`;
    if (!saved || saved.status !== 'confirmed' || JSON.stringify(saved.names) !== JSON.stringify(names)) return Response.json({ error: 'Esta confirmação já foi registrada com outros dados. Abra o formulário novamente.' }, { status: 409 });
    return Response.json({ ok: true, count: saved.names.length }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch { console.error('Attendance storage unavailable'); return Response.json({ error: 'A confirmação está temporariamente indisponível. Tente novamente mais tarde.' }, { status: 503 }); }
}
