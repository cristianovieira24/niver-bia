export const EVENT_DATE = '2026-12-19T14:00:00-03:00';
export const GROUP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function normalizeNames(input: unknown): string[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 20) throw new Error('Informe de 1 a 20 pessoas.');
  const names = input.map(name => typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '');
  if (names.some(name => name.length < 2 || name.length > 80 || /[\u0000-\u001f<>]/.test(name))) throw new Error('Preencha cada nome com 2 a 80 caracteres.');
  return names;
}
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
