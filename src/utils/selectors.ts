import type { Attachment, Capsule, CivilDate, Memory } from '@/db/types';
import { parseCivil, todayCivil } from './date';
import { byOccurrenceDesc } from './search';

/** Registros ocorridos no mesmo dia e mês do dia atual, em anos anteriores. */
export function onThisDay(memories: Memory[], today = new Date()): Memory[] {
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const year = today.getFullYear();
  return memories
    .filter((m) => {
      // Só datas com dia exato: nada de inferir dia a partir de mês/ano.
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

/* ================================================================
   Calendário
   ================================================================ */

export interface CalendarDay {
  day: number;
  date: CivilDate;
  memories: Memory[];
}

export interface CalendarMonth {
  year: number;
  month: number;
  /** Primeiro dia da semana (0 = domingo) em que o mês começa. */
  startWeekday: number;
  days: CalendarDay[];
  /**
   * Registros daquele mês que NÃO têm dia exato (mês/ano, só ano, aproximados).
   * Ficam fora da grade para não inventar uma data que o usuário não informou.
   */
  loose: Memory[];
  total: number;
}

export function buildCalendarMonth(
  memories: Memory[],
  year: number,
  month: number,
): CalendarMonth {
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = new Date(year, month - 1, 1).getDay();

  const byDay = new Map<number, Memory[]>();
  const loose: Memory[] = [];

  for (const m of memories) {
    if (!m.occurredAt) continue;
    const p = parseCivil(m.occurredAt);
    if (!p) continue;

    if (m.occurredPrecision === 'day') {
      if (p.year === year && p.month === month) {
        const list = byDay.get(p.day) ?? [];
        list.push(m);
        byDay.set(p.day, list);
      }
      continue;
    }
    // Precisão menor que o dia: pertence ao mês (ou ao ano), nunca a uma casa.
    if (m.occurredPrecision === 'year') {
      if (p.year === year) loose.push(m);
    } else if (p.year === year && p.month === month) {
      loose.push(m);
    }
  }

  const days: CalendarDay[] = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    days.push({
      day: d,
      date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      memories: byDay.get(d) ?? [],
    });
  }

  return {
    year,
    month,
    startWeekday,
    days,
    loose,
    total: days.reduce((sum, d) => sum + d.memories.length, 0) + loose.length,
  };
}

/** Anos que têm pelo menos um registro, do mais recente ao mais antigo. */
export function yearsWithMemories(memories: Memory[]): number[] {
  const set = new Set<number>();
  for (const m of memories) {
    const p = m.occurredAt ? parseCivil(m.occurredAt) : null;
    if (p) set.add(p.year);
  }
  return [...set].sort((a, b) => b - a);
}

/** Quantos dias faltam para a exclusão definitiva de um item da lixeira. */
export function daysLeftInTrash(memory: Memory, retentionDays: number): number {
  if (!memory.deletedAt) return retentionDays;
  const elapsed = (Date.now() - new Date(memory.deletedAt).getTime()) / 86400000;
  return Math.max(0, Math.ceil(retentionDays - elapsed));
}
