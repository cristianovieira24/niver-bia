import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';

const EVENT_DATE = '2026-12-19T14:00:00-03:00';

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Origem inválida.' }, { status: 403 });
    if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({ error: 'Formato inválido.' }, { status: 415 });
    const raw = await request.text();
    if (raw.length > 8192) return Response.json({ error: 'Dados muito longos.' }, { status: 413 });
    let data: unknown;
    try { data = JSON.parse(raw); } catch { return Response.json({ error: 'Dados inválidos.' }, { status: 400 }); }
    if (!data || typeof data !== 'object') return Response.json({ error: 'Dados inválidos.' }, { status: 400 });
    const body = data as { names?: unknown; name?: unknown; count?: unknown; requestId?: unknown };
    const submitted = Array.isArray(body.names) ? body.names : typeof body.name === 'string' ? [body.name] : null;
    if (!submitted || submitted.length < 1 || submitted.length > 20) return Response.json({ error: 'Informe de 1 a 20 pessoas.' }, { status: 400 });
    if (body.count !== undefined && body.count !== submitted.length) return Response.json({ error: 'Preencha o nome de todas as pessoas.' }, { status: 400 });
    const names = submitted.map((name) => typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '');
    if (names.some((name) => name.length < 2 || name.length > 80 || /[\u0000-\u001f<>]/.test(name))) return Response.json({ error: 'Preencha cada nome com 2 a 80 caracteres.' }, { status: 400 });
    if (typeof body.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) return Response.json({ error: 'Abra o formulário novamente.' }, { status: 400 });
    if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not configured'); return Response.json({ error: 'A confirmação está temporariamente indisponível.' }, { status: 503 }); }
    const sql = neon(process.env.DATABASE_URL);
    await sql`CREATE TABLE IF NOT EXISTS attendance (id TEXT PRIMARY KEY, name TEXT NOT NULL, event_date TEXT NOT NULL, created_at TEXT NOT NULL)`;
    const created = new Date().toISOString();
    for (let index = 0; index < names.length; index += 1) {
      const id = index === 0 ? body.requestId : `${body.requestId}:${index}`;
      await sql`INSERT INTO attendance (id, name, event_date, created_at) VALUES (${id}, ${names[index]}, ${EVENT_DATE}, ${created}) ON CONFLICT (id) DO NOTHING`;
    }
    return Response.json({ ok: true, count: names.length }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { console.error('Attendance save failed', error); return Response.json({ error: 'Não foi possível confirmar agora. Tente novamente.' }, { status: 503 }); }
}