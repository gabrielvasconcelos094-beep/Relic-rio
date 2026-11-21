import type { Attachment, Capsule, Category, Memory, Person } from '@/db/types';
import { parseCivil } from './date';

export interface Stats {
  totalMemories: number;
  totalPeople: number;
  totalAttachments: number;
  photos: number;
  audios: number;
  videos: number;
  documents: number;
  textMemories: number;
  favorites: number;
  hardDays: number;
  capsules: number;
  bytes: number;
  withoutDate: number;
  byCategory: { id: string; name: string; color: string; count: number }[];
  byYear: { year: number; count: number }[];
  byPerson: { id: string; name: string; count: number }[];
  topPerson: { name: string; count: number } | null;
  firstYear: number | null;
  lastYear: number | null;
}

export function computeStats(
  memories: Memory[],
  people: Person[],
  categories: Category[],
  attachments: Attachment[],
  capsules: Capsule[],
): Stats {
  const byCategory = categories
    .map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      count: memories.filter((m) => m.categoryIds.includes(c.id)).length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));

  const yearMap = new Map<number, number>();
  let withoutDate = 0;
  for (const m of memories) {
    const y = m.occurredAt ? parseCivil(m.occurredAt)?.year ?? null : null;
    if (y === null) withoutDate += 1;
    else yearMap.set(y, (yearMap.get(y) ?? 0) + 1);
  }
  const byYear = [...yearMap.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  const byPerson = people
    .map((p) => ({
      id: p.id,
      name: p.name,
      count: memories.filter((m) => m.personIds.includes(p.id)).length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));

  const memoryAttachments = attachments.filter((a) => a.ownerKind === 'memory');

  return {
    totalMemories: memories.length,
    totalPeople: people.length,
    totalAttachments: memoryAttachments.length,
    photos: memoryAttachments.filter((a) => a.kind === 'image').length,
    audios: memoryAttachments.filter((a) => a.kind === 'audio').length,
    videos: memoryAttachments.filter((a) => a.kind === 'video').length,
    documents: memoryAttachments.filter((a) => a.kind === 'pdf' || a.kind === 'document').length,
    textMemories: memories.filter((m) => m.text.trim().length > 0).length,
    favorites: memories.filter((m) => m.favorite).length,
    hardDays: memories.filter((m) => m.hardDay).length,
    capsules: capsules.length,
    bytes: attachments.reduce((sum, a) => sum + (a.size || 0), 0),
    withoutDate,
    byCategory,
    byYear,
    byPerson,
    topPerson: byPerson.length && byPerson[0].count > 0 ? byPerson[0] : null,
    firstYear: byYear.length ? byYear[0].year : null,
    lastYear: byYear.length ? byYear[byYear.length - 1].year : null,
  };
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
