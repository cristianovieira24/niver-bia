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

// The unguessable request ID is a receipt capability kept only in this browser.
// It is sent in a header, never in a URL, and cannot enumerate other groups.
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'X-Confirmation-Id' };
  const id = request.headers.get('x-confirmation-id');
  if (!id || !GROUP_ID.test(id)) return Response.json({ error: 'Confirmação inválida.' }, { status: 400, headers });
  try {
    await ensureGuestDatabase();
    const sql = database();
    const [group] = await sql`SELECT names, status FROM attendance_groups WHERE id = ${id} AND event_date = ${EVENT_DATE}`;
    if (!group) return Response.json({ error: 'Confirmação não encontrada.' }, { status: 404, headers });
    return Response.json({ names: group.names, status: group.status }, { headers });
  } catch { return Response.json({ error: 'Não foi possível verificar sua confirmação agora.' }, { status: 503, headers }); }
}
