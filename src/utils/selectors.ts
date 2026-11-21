import type { Attachment, Capsule, Memory } from '@/db/types';
import { parseCivil, todayCivil } from './date';
import { byOccurrenceDesc } from './search';

/** Registros ocorridos no mesmo dia e mês do dia atual, em anos anteriores. */
export function onThisDay(memories: Memory[], today = new Date()): Memory[] {
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const year = today.getFullYear();
  return memories
    .filter((m) => {
      if (!m.occurredAt || m.occurredPrecision !== 'day') return false;
      const p = parseCivil(m.occurredAt);
      return !!p && p.month === month && p.day === day && p.year < year;
    })
    .sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? ''));
}

export function recentlyAdded(memories: Memory[], limit = 5): Memory[] {
  return [...memories].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export function sortedByOccurrence(memories: Memory[]): Memory[] {
  return [...memories].sort(byOccurrenceDesc);
}

export interface TimelineGroup {
  year: number | null;
  months: { month: number | null; items: Memory[] }[];
}

export function groupForTimeline(memories: Memory[]): TimelineGroup[] {
  const byYear = new Map<number | null, Map<number | null, Memory[]>>();
  for (const m of sortedByOccurrence(memories)) {
    const p = m.occurredAt ? parseCivil(m.occurredAt) : null;
    const year = p ? p.year : null;
    const month = p && m.occurredPrecision !== 'year' ? p.month : null;
    if (!byYear.has(year)) byYear.set(year, new Map());
    const months = byYear.get(year)!;
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(m);
  }
  return [...byYear.entries()]
    .sort((a, b) => {
      if (a[0] === null) return 1;
      if (b[0] === null) return -1;
      return b[0] - a[0];
    })
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort((a, b) => {
          if (a[0] === null) return 1;
          if (b[0] === null) return -1;
          return b[0] - a[0];
        })
        .map(([month, items]) => ({ month, items })),
    }));
}

export interface GalleryEntry {
  attachment: Attachment;
  memory: Memory;
}

export function galleryEntries(memories: Memory[], attachments: Attachment[]): GalleryEntry[] {
  const index = new Map(memories.map((m) => [m.id, m]));
  return attachments
    .filter((a) => a.kind === 'image' && a.ownerKind === 'memory' && index.has(a.ownerId))
    .map((a) => ({ attachment: a, memory: index.get(a.ownerId)! }))
    .sort((a, b) => byOccurrenceDesc(a.memory, b.memory));
}

export type CapsuleStatus = 'sealed' | 'ready' | 'opened';

export function capsuleStatus(capsule: Capsule, today = todayCivil()): CapsuleStatus {
  if (capsule.openedAt) return 'opened';
  return capsule.openAt > today ? 'sealed' : 'ready';
}
