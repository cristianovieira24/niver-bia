'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeGuestName, possibleDuplicateNames } from '@/lib/guest-duplicates';
import Link from 'next/link';
import type { GuestGroup } from '@/lib/guest-db';
import styles from './guest-admin.module.css';
type Session = { authenticated: boolean; configured: boolean; databaseConfigured: boolean };
export default function GuestAdmin() {
  const [session, setSession] = useState<Session | null>(null);
  const [password, setPassword] = useState('');
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('confirmed');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<GuestGroup | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [pending, setPending] = useState<GuestGroup | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState('');
  const fetching = useRef(false);
  const sessionVersion = useRef(0);
  const load = useCallback(async (quiet = false, signal?: AbortSignal) => {
    if (fetching.current) return false;
    fetching.current = true;
    const currentSession = sessionVersion.current;
    if (!quiet) { setLoading(true); setError(''); }
    try {
      const response = await fetch('/api/admin/guests', { cache: 'no-store', signal });
      const data = await response.json();
      if (signal?.aborted || currentSession !== sessionVersion.current) return false;
      if (response.status === 401) { setSession(s => s ? { ...s, authenticated: false } : null); setGroups([]); throw new Error('Sua sessão terminou. Entre novamente.'); }
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar a lista.');
      setGroups(data.groups); setLastUpdated(new Date()); setRefreshError(''); return true;
    } catch (err) {
      if (signal?.aborted || currentSession !== sessionVersion.current) return false;
      const message = err instanceof Error ? err.message : 'Não foi possível carregar a lista.';
      if (quiet) setRefreshError('A atualização automática falhou. Os dados exibidos são da última consulta.'); else setError(message);
      return false;
    } finally { fetching.current = false; if (!quiet) setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    fetch('/api/admin/session', { cache: 'no-store' }).then(async r => {
      if (!r.ok) throw new Error();
      const data: Session = await r.json();
      if (!active) return;
      setSession(data);
      if (data.authenticated) await load();
      else setLoading(false);
    }).catch(() => { if (active) { setError('Não foi possível abrir o painel. Recarregue a página.'); setLoading(false); } });
    return () => { active = false; };
  }, [load]);
  useEffect(() => {
    if (!session?.authenticated || busy || editing || pending) return;
    const controller = new AbortController();
    const refresh = () => { if (document.visibilityState === 'visible') void load(true, controller.signal); };
    const interval = window.setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(interval); controller.abort(); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); };
  }, [session?.authenticated, busy, editing, pending, load]);
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const r = await fetch('/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Não foi possível entrar.');
      setPassword(''); setSession(s => s ? { ...s, authenticated: true } : null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível entrar.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/admin/session', { method: 'DELETE' });
      if (!r.ok) throw new Error('Não foi possível sair. Tente novamente.');
      sessionVersion.current += 1; setGroups([]); setEditing(null); setPending(null); setNotice(''); setRefreshError(''); setLastUpdated(null); setSession(s => s ? { ...s, authenticated: false } : null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Tente novamente.'); }
    finally { setBusy(false); }
  }
  async function save(group: GuestGroup, updatedNames: string[], status: GuestGroup['status']) {
    setBusy(true); setError(''); setNotice('');
    try {
      const r = await fetch('/api/admin/guests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: group.id, version: group.version, names: updatedNames, status }) });
      const data = await r.json();
      if (r.status === 401) { setSession(s => s ? { ...s, authenticated: false } : null); setGroups([]); setEditing(null); setPending(null); }
      if (!r.ok) throw new Error(data.error || 'Não foi possível salvar.');
      setEditing(null); setPending(null); const refreshed = await load(); if (!refreshed) return; setNotice(status !== group.status ? (status === 'cancelled' ? 'Grupo cancelado. Você pode restaurá-lo na aba Cancelados.' : 'Presença restaurada.') : 'Nomes atualizados.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }
  async function download() {
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/admin/guests?format=csv', { cache: 'no-store' });
      if (!r.ok) { const data = await r.json(); throw new Error(data.error || 'Não foi possível exportar.'); }
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a'); a.href = url; a.download = 'convidados-niver-da-be.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível exportar.'); }
    finally { setBusy(false); }
  }
  const duplicates = possibleDuplicateNames(groups);
  const normalizedQuery = normalizeGuestName(query);
  const confirmed = groups.filter(g => g.status === 'confirmed');
  const total = confirmed.reduce((sum, g) => sum + g.names.length, 0);
  const visible = groups.filter(g => (filter === 'all' || (filter === 'duplicates' ? duplicates.has(g.id) : g.status === filter)) && g.names.some(name => normalizeGuestName(name).includes(normalizedQuery)));
  return <main className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.header}><div><p className={styles.eyebrow}>Niver da Bê · 19 de dezembro</p><h1>Lista de convidados<span>✦</span></h1><p className={styles.subtitle}>Tudo pronto para celebrar quem vem.</p></div><Link className={styles.inviteLink} href="/">Ver convite ↗</Link></header>
      <div aria-live="polite">{error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice}>{notice}</p>}</div>
      {!session?.authenticated ? <section className={styles.login} aria-label="Acesso à administração"><span className={styles.flower} aria-hidden="true">✦</span><h2>Um cantinho só de vocês</h2><p>Entre para acompanhar as confirmações e organizar os convidados.</p>
        {loading ? <p role="status">Abrindo painel…</p> : session && (!session.configured || !session.databaseConfigured) ? <div className={styles.setup}><strong>Conexão do banco pendente</strong><p>O painel estará disponível assim que a configuração do banco de dados for concluída.</p><button onClick={() => window.location.reload()}>Verificar novamente</button></div> : session ? <form onSubmit={login}><label htmlFor="admin-password">Senha de administração</label><input id="admin-password" type="password" name="password" autoComplete="current-password" required maxLength={256} value={password} onChange={e => setPassword(e.target.value)} /><button className={styles.primary} disabled={busy}>{busy ? 'Entrando…' : 'Entrar no painel'}</button></form> : <button onClick={() => window.location.reload()}>Recarregar painel</button>}
      </section> : <>
        <section className={styles.stats} aria-label="Resumo de presenças"><div><span>Pessoas confirmadas</span><strong>{total}</strong><small>Inclui todos os acompanhantes</small></div><div><span>Grupos confirmados</span><strong>{confirmed.length}</strong><small>Cada envio do convite é um grupo</small></div><div><span>Acompanhantes</span><strong>{total - confirmed.length}</strong><small>Além de quem confirmou o grupo</small></div></section>
        <section className={styles.list} aria-labelledby="guests-title"><div className={styles.listHeader}><div><p className={styles.eyebrow}>Presenças</p><h2 id="guests-title">Quem vem comemorar</h2></div><div className={styles.actions}><button onClick={() => void load()} disabled={loading || busy || !!editing || !!pending}>{loading ? 'Atualizando…' : 'Atualizar'}</button><button onClick={download} disabled={busy || loading}>Exportar CSV ↓</button></div></div>
          {duplicates.size > 0 && <div className={styles.duplicateNotice}><div><strong>Possíveis confirmações repetidas</strong><p>{duplicates.size} {duplicates.size === 1 ? 'grupo tem' : 'grupos têm'} nomes iguais. Pessoas diferentes podem ter o mesmo nome: confira antes de cancelar.</p></div><button onClick={() => { setFilter('duplicates'); setQuery(''); }}>Conferir grupos</button></div>}
          <div className={styles.syncStatus} role="status">{editing || pending ? 'Atualização automática pausada durante a edição.' : 'Atualização automática a cada 30 segundos.'}{lastUpdated && ` Última consulta: ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`}{refreshError && <span>{refreshError}</span>}</div>
          <div className={styles.filters}><label><span className={styles.srOnly}>Buscar convidado</span><input type="search" placeholder="Buscar por nome…" value={query} onChange={e => setQuery(e.target.value)} /></label><label><span className={styles.srOnly}>Filtrar por status</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="confirmed">Confirmados</option><option value="cancelled">Cancelados</option><option value="all">Todos os grupos</option><option value="duplicates">Possíveis duplicados</option></select></label></div>
          <p className={styles.resultCount}>{visible.length} {visible.length === 1 ? 'grupo encontrado' : 'grupos encontrados'}. A exportação inclui todos os grupos e seus status.</p>
          {loading ? <p className={styles.empty} role="status">Carregando convidados…</p> : visible.length === 0 ? <div className={styles.empty}><span aria-hidden="true">✧</span><h3>{groups.length ? 'Nenhum grupo por aqui' : 'A lista está esperando os primeiros convidados'}</h3><p>{groups.length ? 'Experimente outro nome ou filtro.' : 'As confirmações feitas pelo convite vão aparecer aqui.'}</p></div> : <div className={styles.groups}>{visible.map(group => <article className={styles.group} key={group.id}><div className={styles.groupTop}><div><span className={`${styles.badge} ${group.status === 'cancelled' ? styles.cancelled : ''}`}>{group.status === 'confirmed' ? 'Confirmado' : 'Cancelado'}</span>{duplicates.has(group.id) && <span className={styles.duplicateBadge}>Conferir nomes</span>}<h3>{group.names[0]}</h3><p>{group.names.length} {group.names.length === 1 ? 'pessoa' : 'pessoas'} · {new Date(group.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p></div><div className={styles.groupActions}><button disabled={busy} onClick={() => { setEditing(group); setNames([...group.names]); setPending(null); setError(''); }}>Editar grupo</button><button disabled={busy} onClick={() => { setPending(group); setEditing(null); setError(''); }}>{group.status === 'confirmed' ? 'Cancelar presença' : 'Restaurar presença'}</button></div></div>{duplicates.has(group.id) && <p className={styles.groupDuplicate}>Nome(s) repetido(s): {duplicates.get(group.id)!.join(', ')}. Verifique se são as mesmas pessoas.</p>}<ul className={styles.guestNames}>{group.names.map((name, i) => <li key={i}><span aria-hidden="true">{name.trim()[0]?.toUpperCase()}</span><div>{name}<small>{i === 0 ? 'Responsável pelo grupo' : 'Acompanhante'}</small></div></li>)}</ul>
            {editing?.id === group.id && <form className={styles.editor} onSubmit={e => { e.preventDefault(); void save(editing, names, editing.status); }}><h4>Editar nomes e acompanhantes</h4>{names.map((name, i) => <div className={styles.editRow} key={i}><label htmlFor={`edit-${group.id}-${i}`}>{i === 0 ? 'Responsável' : `Acompanhante ${i}`}<input id={`edit-${group.id}-${i}`} required minLength={2} maxLength={80} value={name} disabled={busy} onChange={e => setNames(previous => previous.map((n, index) => index === i ? e.target.value : n))} /></label>{i > 0 && <button type="button" disabled={busy} onClick={() => setNames(previous => previous.filter((_, index) => index !== i))} aria-label={`Remover acompanhante ${i}`}>Remover</button>}</div>)}<div className={styles.editorActions}><button type="button" disabled={busy || names.length >= 20} onClick={() => setNames(previous => [...previous, ''])}>+ Acompanhante</button><button type="button" disabled={busy} onClick={() => setEditing(null)}>Voltar</button><button className={styles.primary} disabled={busy}>{busy ? 'Salvando…' : 'Salvar alterações'}</button></div></form>}
            {pending?.id === group.id && <div className={styles.confirm} role="region" aria-label="Confirmar alteração de presença"><p>{group.status === 'confirmed' ? `Cancelar a presença das ${group.names.length} pessoa(s) deste grupo? Elas sairão do total de confirmados. Você poderá restaurar depois.` : 'Restaurar a presença de todas as pessoas deste grupo?'}</p><div className={styles.actions}><button disabled={busy} onClick={() => setPending(null)}>Voltar</button><button className={styles.primary} disabled={busy} onClick={() => save(group, group.names, group.status === 'confirmed' ? 'cancelled' : 'confirmed')}>{busy ? 'Salvando…' : 'Confirmar'}</button></div></div>}
          </article>)}</div>}
        </section><footer className={styles.footer}><p>Com carinho, Bê <span aria-hidden="true">✦</span></p><button onClick={logout} disabled={busy}>Sair do painel</button></footer>
      </>}
    </div>
  </main>;
}
