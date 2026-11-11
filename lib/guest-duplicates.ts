type GroupForDuplicates = { id: string; names: string[]; status: string };
export function normalizeGuestName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}
// A warning only: equal names can belong to different people.
export function possibleDuplicateNames(groups: GroupForDuplicates[]): Map<string, string[]> {
  const occurrences = new Map<string, { name: string; groups: string[] }>();
  for (const group of groups) {
    if (group.status !== 'confirmed') continue;
    for (const name of group.names) {
      const key = normalizeGuestName(name);
      if (!key) continue;
      const entry = occurrences.get(key) ?? { name: name.trim(), groups: [] };
      entry.groups.push(group.id);
      occurrences.set(key, entry);
    }
  }
  const duplicates = new Map<string, string[]>();
  for (const entry of occurrences.values()) {
    if (entry.groups.length < 2) continue;
    for (const id of new Set(entry.groups)) duplicates.set(id, [...(duplicates.get(id) ?? []), entry.name]);
  }
  return duplicates;
}
