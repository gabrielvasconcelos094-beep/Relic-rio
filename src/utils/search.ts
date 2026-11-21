import type {
  Attachment,
  Category,
  Collection,
  DatePrecision,
  Memory,
  Person,
  Source,
} from '@/db/types';
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
  collectionIds: string[];
  sourceIds: string[];
  tags: string[];
  years: number[];
  precisions: DatePrecision[];
  favoritesOnly: boolean;
  hardDayOnly: boolean;
  withImagesOnly: boolean;
  withFilesOnly: boolean;
  from: string;
  to: string;
}

export const EMPTY_FILTERS: Filters = {
  query: '',
  personIds: [],
  categoryIds: [],
  collectionIds: [],
  sourceIds: [],
  tags: [],
  years: [],
  precisions: [],
  favoritesOnly: false,
  hardDayOnly: false,
  withImagesOnly: false,
  withFilesOnly: false,
  from: '',
  to: '',
};

export function filtersActive(f: Filters): number {
  return (
    (f.query.trim() ? 1 : 0) +
    f.personIds.length +
    f.categoryIds.length +
    f.collectionIds.length +
    f.sourceIds.length +
    f.tags.length +
    f.years.length +
    f.precisions.length +
    (f.favoritesOnly ? 1 : 0) +
    (f.hardDayOnly ? 1 : 0) +
    (f.withImagesOnly ? 1 : 0) +
    (f.withFilesOnly ? 1 : 0) +
    (f.from ? 1 : 0) +
    (f.to ? 1 : 0)
  );
}

export interface SearchContext {
  people: Person[];
  categories: Category[];
  collections: Collection[];
  sources: Source[];
  attachments: Attachment[];
}

/**
 * Índice de busca construído uma vez por conjunto de dados.
 * Evita recalcular o texto de cada memória a cada tecla digitada — o que mantém
 * a busca rápida mesmo com milhares de registros.
 */
export class SearchIndex {
  private haystacks = new Map<string, string>();

  constructor(memories: Memory[], ctx: SearchContext) {
    const personName = new Map(ctx.people.map((p) => [p.id, p.name]));
    const categoryName = new Map(ctx.categories.map((c) => [c.id, c.name]));
    const collectionName = new Map(ctx.collections.map((c) => [c.id, c.name]));
    const sourceName = new Map(ctx.sources.map((s) => [s.id, s.name]));

    const byOwner = new Map<string, Attachment[]>();
    for (const a of ctx.attachments) {
      const list = byOwner.get(a.ownerId) ?? [];
      list.push(a);
      byOwner.set(a.ownerId, list);
    }

    for (const m of memories) {
      const own = byOwner.get(m.id) ?? [];
      const parts = [
        m.title,
        m.text,
        m.feeling,
        m.context,
        m.occurredNote,
        m.tags.join(' '),
        m.personIds.map((id) => personName.get(id) ?? '').join(' '),
        m.categoryIds.map((id) => categoryName.get(id) ?? '').join(' '),
        m.collectionIds.map((id) => collectionName.get(id) ?? '').join(' '),
        m.sourceId ? (sourceName.get(m.sourceId) ?? '') : '',
        m.occurredAt ?? '',
        // Nome do arquivo, legenda e texto extraído localmente (PDF/texto).
        own.map((a) => `${a.name} ${a.caption} ${a.textContent}`).join(' '),
      ];
      this.haystacks.set(m.id, normalize(parts.join(' \u0001 ')));
    }
  }

  matches(memoryId: string, terms: string[]): boolean {
    if (!terms.length) return true;
    const hay = this.haystacks.get(memoryId);
    if (!hay) return false;
    return terms.every((t) => hay.includes(t));
  }
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

export type SortKey = 'occurred-desc' | 'occurred-asc' | 'created-desc' | 'title-asc';

export function sortMemories(memories: Memory[], sort: SortKey): Memory[] {
  const list = [...memories];
  switch (sort) {
    case 'occurred-asc':
      return list.sort((a, b) => -byOccurrenceDesc(a, b));
    case 'created-desc':
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'title-asc':
      return list.sort((a, b) =>
        (a.title || 'zzz').localeCompare(b.title || 'zzz', 'pt-BR', { sensitivity: 'base' }),
      );
    default:
      return list.sort(byOccurrenceDesc);
  }
}

export function applyFilters(
  memories: Memory[],
  f: Filters,
  ctx: SearchContext,
  index?: SearchIndex,
  sort: SortKey = 'occurred-desc',
): Memory[] {
  const terms = normalize(f.query).split(/\s+/).filter(Boolean);
  const idx = index ?? new SearchIndex(memories, ctx);
  const imageOwners = new Set(
    ctx.attachments.filter((a) => a.kind === 'image').map((a) => a.ownerId),
  );
  const fileOwners = new Set(ctx.attachments.map((a) => a.ownerId));

  const filtered = memories.filter((m) => {
    if (f.favoritesOnly && !m.favorite) return false;
    if (f.hardDayOnly && !m.hardDay) return false;
    if (f.withImagesOnly && !imageOwners.has(m.id)) return false;
    if (f.withFilesOnly && !fileOwners.has(m.id)) return false;
    if (f.personIds.length && !f.personIds.every((id) => m.personIds.includes(id))) return false;
    if (f.categoryIds.length && !f.categoryIds.every((id) => m.categoryIds.includes(id)))
      return false;
    if (f.collectionIds.length && !f.collectionIds.every((id) => m.collectionIds.includes(id)))
      return false;
    if (f.sourceIds.length && (!m.sourceId || !f.sourceIds.includes(m.sourceId))) return false;
    if (f.tags.length && !f.tags.every((t) => m.tags.includes(t))) return false;
    if (f.precisions.length && !f.precisions.includes(m.occurredPrecision)) return false;
    if (f.years.length) {
      const y = m.occurredAt ? parseCivil(m.occurredAt)?.year : null;
      if (!y || !f.years.includes(y)) return false;
    }
    if (f.from && (!m.occurredAt || m.occurredAt < f.from)) return false;
    if (f.to && (!m.occurredAt || m.occurredAt > f.to)) return false;
    if (terms.length && !idx.matches(m.id, terms)) return false;
    return true;
  });

  return sortMemories(filtered, sort);
}

export function searchPeople(people: Person[], query: string): Person[] {
  const q = normalize(query);
  if (!q) return people;
  return people.filter((p) =>
    normalize(`${p.name} ${p.description} ${p.notes} ${p.tags.join(' ')}`).includes(q),
  );
}

export function searchCollections(collections: Collection[], query: string): Collection[] {
  const q = normalize(query);
  if (!q) return collections;
  return collections.filter((c) => normalize(`${c.name} ${c.description}`).includes(q));
}

export function snippet(text: string, max = 150): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}
