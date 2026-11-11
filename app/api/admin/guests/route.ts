import { isAdmin, sameOrigin } from '@/lib/admin-auth';
import { database, guestGroups } from '@/lib/guest-db';
import { csvCell, EVENT_DATE, GROUP_ID, normalizeNames } from '@/lib/guest-validation';
import { readJson } from '@/lib/request-json';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: 'Entre para consultar os convidados.' }, { status: 401, headers });
  try {
    const groups = await guestGroups();
    if (new URL(request.url).searchParams.get('format') === 'csv') {
      const rows = [['Grupo', 'Convidado', 'Tipo', 'Status', 'Confirmado em'], ...groups.flatMap(g => g.names.map((name, index) => [g.id, name, index === 0 ? 'Responsável' : 'Acompanhante', g.status === 'confirmed' ? 'Confirmado' : 'Cancelado', new Date(g.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })]))];
      return new Response('\ufeff' + rows.map(row => row.map(csvCell).join(';')).join('\r\n'), { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="convidados-niver-da-be.csv"' } });
    }
    return Response.json({ groups }, { headers });
  } catch { return Response.json({ error: 'Não foi possível carregar a lista. Tente novamente.' }, { status: 503, headers }); }
}
export async function PATCH(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: 'Sua sessão terminou. Entre novamente.' }, { status: 401, headers });
  if (!sameOrigin(request)) return Response.json({ error: 'Origem inválida.' }, { status: 403, headers });
  let id: string, names: string[], status: string, version: number;
  try {
    const body = await readJson(request);
    if (typeof body.id !== 'string' || !GROUP_ID.test(body.id)) throw new Error('Grupo inválido.');
    if (body.status !== 'confirmed' && body.status !== 'cancelled') throw new Error('Status inválido.');
    if (!Number.isInteger(body.version) || Number(body.version) < 1) throw new Error('Atualize a lista antes de editar.');
    id = body.id; names = normalizeNames(body.names); status = body.status; version = Number(body.version);
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Dados inválidos.' }, { status: 400, headers }); }
  try {
    const sql = database();
    const rows = await sql`UPDATE attendance_groups SET names = ${JSON.stringify(names)}::jsonb, status = ${status}, updated_at = NOW(), version = version + 1 WHERE id = ${id} AND event_date = ${EVENT_DATE} AND version = ${version} RETURNING id`;
    if (!rows.length) return Response.json({ error: 'Este grupo foi alterado em outra sessão. Atualize a lista e tente novamente.' }, { status: 409, headers });
    return Response.json({ ok: true }, { headers });
  } catch { return Response.json({ error: 'Não foi possível salvar. Tente novamente.' }, { status: 503, headers }); }
}
