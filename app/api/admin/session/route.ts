import { NextResponse } from 'next/server';
import { adminConfigured, cookieOptions, isAdmin, loginAllowed, makeSession, sameOrigin, SESSION_COOKIE, validPassword } from '@/lib/admin-auth';
import { readJson } from '@/lib/request-json';
export const runtime = 'nodejs';
export async function GET() {
  return NextResponse.json({ authenticated: await isAdmin(), configured: adminConfigured(), databaseConfigured: !!process.env.DATABASE_URL }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  if (!adminConfigured() || !process.env.DATABASE_URL) return NextResponse.json({ error: 'O painel aguarda a conexão do banco de dados.' }, { status: 503 });
  let password: string;
  try { const body = await readJson(request); if (typeof body.password !== 'string' || body.password.length > 256) throw new Error(); password = body.password; }
  catch { return NextResponse.json({ error: 'Informe sua senha.' }, { status: 400 }); }
  try {
    if (!(await loginAllowed(request))) return NextResponse.json({ error: 'Muitas tentativas. Aguarde 15 minutos.' }, { status: 429, headers: { 'Retry-After': '900' } });
    if (!validPassword(password)) return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, makeSession(), cookieOptions);
    return response;
  } catch { return NextResponse.json({ error: 'Não foi possível acessar o banco. Tente novamente.' }, { status: 503 }); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  return response;
}
