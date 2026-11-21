import type { Attachment, Category, Memory, Person } from '@/db/types';
import { parseCivil } from './date';

export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export interface Filters {
  query: string;
  personIds: string[];
  categoryIds: string[];
  tags: string[];
  years: number[];
  favoritesOnly: boolean;
  hardDayOnly: boolean;
  withImagesOnly: boolean;
  from: string;
  to: string;
}

export const EMPTY_FILTERS: Filters = {
  query: '',
  personIds: [],
  categoryIds: [],
  tags: [],
  years: [],
  favoritesOnly: false,
  hardDayOnly: false,
  withImagesOnly: false,
  from: '',
  to: '',
};

export function filtersActive(f: Filters): number {
  return (
    (f.query.trim() ? 1 : 0) +
    f.personIds.length +
    f.categoryIds.length +
    f.tags.length +
    f.years.length +
    (f.favoritesOnly ? 1 : 0) +
    (f.hardDayOnly ? 1 : 0) +
    (f.withImagesOnly ? 1 : 0) +
    (f.from ? 1 : 0) +
    (f.to ? 1 : 0)
  );
}

interface Haystack {
  people: Person[];
  categories: Category[];
  attachments: Attachment[];
}

function buildHaystack(memory: Memory, ctx: Haystack): string {
  const people = memory.personIds
    .map((id) => ctx.people.find((p) => p.id === id)?.name ?? '')
    .join(' ');
  const cats = memory.categoryIds
    .map((id) => ctx.categories.find((c) => c.id === id)?.name ?? '')
    .join(' ');
  const atts = ctx.attachments
    .filter((a) => a.ownerId === memory.id)
    .map((a) => `${a.name} ${a.caption}`)
    .join(' ');
  return normalize(
    [
      memory.title,
      memory.text,
      memory.feeling,
      memory.context,
      memory.tags.join(' '),
      people,
      cats,
      atts,
      memory.occurredAt ?? '',
    ].join(' \u0001 '),
  );
}

/** Ordem padrão: acontecimentos mais recentes primeiro; sem data vai para o fim. */
export function byOccurrenceDesc(a: Memory, b: Memory): number {
  if (a.occurredAt && b.occurredAt) {
    if (a.occurredAt === b.occurredAt) return b.createdAt.localeCompare(a.createdAt);
    return b.occurredAt.localeCompare(a.occurredAt);
  }
  if (a.occurredAt) return -1;
  if (b.occurredAt) return 1;
  return b.createdAt.localeCompare(a.createdAt);
}

export function applyFilters(memories: Memory[], f: Filters, ctx: Haystack): Memory[] {
  const terms = normalize(f.query).split(/\s+/).filter(Boolean);
  const imageOwners = new Set(
    ctx.attachments.filter((a) => a.kind === 'image').map((a) => a.ownerId),
  );

  return memories
    .filter((m) => {
      if (f.favoritesOnly && !m.favorite) return false;
      if (f.hardDayOnly && !m.hardDay) return false;
      if (f.withImagesOnly && !imageOwners.has(m.id)) return false;
      if (f.personIds.length && !f.personIds.every((id) => m.personIds.includes(id))) return false;
      if (f.categoryIds.length && !f.categoryIds.every((id) => m.categoryIds.includes(id)))
        return false;
      if (f.tags.length && !f.tags.every((t) => m.tags.includes(t))) return false;
      if (f.years.length) {
        const y = m.occurredAt ? parseCivil(m.occurredAt)?.year : null;
        if (!y || !f.years.includes(y)) return false;
      }
      if (f.from && (!m.occurredAt || m.occurredAt < f.from)) return false;
      if (f.to && (!m.occurredAt || m.occurredAt > f.to)) return false;
      if (terms.length) {
        const hay = buildHaystack(m, ctx);
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    })
    .sort(byOccurrenceDesc);
}

export function searchPeople(people: Person[], query: string): Person[] {
  const q = normalize(query);
  if (!q) return people;
  return people.filter((p) =>
    normalize(`${p.name} ${p.description} ${p.notes} ${p.tags.join(' ')}`).includes(q),
  );
}

export function snippet(text: string, max = 150): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}
