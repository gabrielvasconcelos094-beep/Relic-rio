/** Operações de alto nível sobre o arquivo (CRUD com integridade referencial). */
import {
  CONTENT_STORES,
  STORES,
  clearStores,
  getAll,
  getByIndex,
  getOne,
  put,
  putMany,
  remove,
  removeMany,
} from './idb';
import { BUILTIN_CATEGORIES, BUILTIN_SOURCES } from './defaults';
import {
  DEFAULT_NOTIFICATIONS,
  DEFAULT_SETTINGS,
  type Attachment,
  type AttachmentKind,
  type Capsule,
  type Category,
  type Collection,
  type HistoryEntry,
  type HistoryKind,
  type ID,
  type Memory,
  type Person,
  type Reminder,
  type Settings,
  type Source,
} from './types';
import { newId } from '@/utils/id';
import { sha256Blob } from '@/utils/hash';

const nowIso = () => new Date().toISOString();

/* ================================================================
   Normalização na leitura
   ----------------------------------------------------------------
   A migração do banco só acrescenta stores. Os campos novos da v2 são
   preenchidos aqui, ao ler. Assim um arquivo gravado pela v1 continua
   íntegro e utilizável, e nada precisa ser reescrito em massa.
   ================================================================ */

export function normalizeMemory(raw: Partial<Memory> & { id: ID }): Memory {
  const precision = raw.occurredPrecision;
  return {
    id: raw.id,
    title: raw.title ?? '',
    occurredAt: raw.occurredAt ?? null,
    occurredPrecision:
      precision === 'day' ||
      precision === 'month' ||
      precision === 'year' ||
      precision === 'approximate' ||
      precision === 'unknown'
        ? precision
        : raw.occurredAt
          ? 'day'
          : 'unknown',
    occurredNote: raw.occurredNote ?? '',
    createdAt: raw.createdAt ?? nowIso(),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? nowIso(),
    capturedAt: raw.capturedAt ?? null,
    categoryIds: raw.categoryIds ?? [],
    personIds: raw.personIds ?? [],
    collectionIds: raw.collectionIds ?? [],
    tags: raw.tags ?? [],
    text: raw.text ?? '',
    feeling: raw.feeling ?? '',
    context: raw.context ?? '',
    sourceId: raw.sourceId ?? null,
    favorite: Boolean(raw.favorite),
    hardDay: Boolean(raw.hardDay),
    inbox: Boolean(raw.inbox),
    deletedAt: raw.deletedAt ?? null,
    ...(raw.demo ? { demo: true as const } : {}),
  };
}

export function normalizeAttachment(raw: Partial<Attachment> & { id: ID; blob: Blob }): Attachment {
  return {
    id: raw.id,
    memoryId: raw.memoryId ?? null,
    ownerKind: raw.ownerKind ?? 'memory',
    ownerId: raw.ownerId ?? raw.memoryId ?? '',
    name: raw.name ?? 'arquivo',
    mime: raw.mime ?? raw.blob.type ?? 'application/octet-stream',
    size: raw.size ?? raw.blob.size,
    kind: raw.kind ?? kindFromMime(raw.mime ?? '', raw.name ?? ''),
    caption: raw.caption ?? '',
    createdAt: raw.createdAt ?? nowIso(),
    blob: raw.blob,
    sha256: raw.sha256 ?? null,
    textContent: raw.textContent ?? '',
    personId: raw.personId ?? null,
    occurredAt: raw.occurredAt ?? null,
    sourceId: raw.sourceId ?? null,
    ...(raw.demo ? { demo: true as const } : {}),
  };
}

/* ---------------------------------------------------------------- categorias */

export async function loadCategories(): Promise<Category[]> {
  let cats = await getAll<Category>(STORES.categories);
  if (!cats.length) {
    await putMany(STORES.categories, BUILTIN_CATEGORIES);
    cats = [...BUILTIN_CATEGORIES];
  }
  return cats.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'));
}

export async function saveCategory(cat: Category): Promise<void> {
  await put(STORES.categories, cat);
}

export async function deleteCategory(id: ID): Promise<void> {
  const memories = (await getAll<Memory>(STORES.memories)).map(normalizeMemory);
  const touched = memories
    .filter((m) => m.categoryIds.includes(id))
    .map((m) => ({ ...m, categoryIds: m.categoryIds.filter((c) => c !== id), updatedAt: nowIso() }));
  await putMany(STORES.memories, touched);
  await remove(STORES.categories, id);
}

/* ---------------------------------------------------------------- origens */

export async function loadSources(): Promise<Source[]> {
  let sources = await getAll<Source>(STORES.sources);
  if (!sources.length) {
    await putMany(STORES.sources, BUILTIN_SOURCES);
    sources = [...BUILTIN_SOURCES];
  }
  return sources.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'));
}

export async function saveSource(source: Source): Promise<void> {
  await put(STORES.sources, source);
}

export async function deleteSource(id: ID): Promise<void> {
  const memories = (await getAll<Memory>(STORES.memories)).map(normalizeMemory);
  const touched = memories
    .filter((m) => m.sourceId === id)
    .map((m) => ({ ...m, sourceId: null, updatedAt: nowIso() }));
  await putMany(STORES.memories, touched);
  await remove(STORES.sources, id);
}

/* ---------------------------------------------------------------- coleções */

export async function loadCollections(): Promise<Collection[]> {
  const list = await getAll<Collection>(STORES.collections);
  return list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function emptyCollection(): Collection {
  const ts = nowIso();
  return {
    id: newId('col'),
    name: '',
    description: '',
    color: 'salvia',
    icon: 'book',
    coverId: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

export async function saveCollection(collection: Collection): Promise<Collection> {
  const value = { ...collection, updatedAt: nowIso() };
  await put(STORES.collections, value);
  return value;
}

/** Remove a coleção. As memórias associadas permanecem intactas no arquivo. */
export async function deleteCollection(id: ID): Promise<void> {
  const memories = (await getAll<Memory>(STORES.memories)).map(normalizeMemory);
  const touched = memories
    .filter((m) => m.collectionIds.includes(id))
    .map((m) => ({
      ...m,
      collectionIds: m.collectionIds.filter((c) => c !== id),
      updatedAt: nowIso(),
    }));
  await putMany(STORES.memories, touched);
  const covers = await getByIndex<Attachment>(STORES.attachments, 'ownerId', id);
  await removeMany(STORES.attachments, covers.map((a) => a.id));
  await remove(STORES.collections, id);
}

/* ---------------------------------------------------------------- memórias */

export async function loadMemories(): Promise<Memory[]> {
  return (await getAll<Memory>(STORES.memories)).map(normalizeMemory);
}

export function emptyMemory(): Memory {
  const ts = nowIso();
  return {
    id: newId('mem'),
    title: '',
    occurredAt: null,
    occurredPrecision: 'day',
    occurredNote: '',
    createdAt: ts,
    updatedAt: ts,
    capturedAt: null,
    categoryIds: [],
    personIds: [],
    collectionIds: [],
    tags: [],
    text: '',
    feeling: '',
    context: '',
    sourceId: null,
    favorite: false,
    hardDay: false,
    inbox: false,
    deletedAt: null,
  };
}

export async function saveMemory(memory: Memory): Promise<Memory> {
  const value: Memory = { ...memory, updatedAt: nowIso() };
  await put(STORES.memories, value);
  return value;
}

/* ---------------------------------------------------------------- histórico */

export async function loadHistory(): Promise<HistoryEntry[]> {
  return getAll<HistoryEntry>(STORES.history);
}

export async function historyOf(memoryId: ID): Promise<HistoryEntry[]> {
  const rows = await getByIndex<HistoryEntry>(STORES.history, 'memoryId', memoryId);
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

export async function addHistory(
  memoryId: ID,
  kind: HistoryKind,
  summary: string,
  options: { before?: string | null; after?: string | null; field?: string | null } = {},
): Promise<HistoryEntry> {
  const entry: HistoryEntry = {
    id: newId('his'),
    memoryId,
    at: nowIso(),
    kind,
    summary,
    before: options.before ?? null,
    after: options.after ?? null,
    field: options.field ?? null,
  };
  await put(STORES.history, entry);
  return entry;
}

const LIST_FIELDS = new Set(['personIds', 'categoryIds', 'collectionIds', 'tags']);

/** Compara duas versões de uma memória e registra as diferenças no histórico. */
export async function recordChanges(
  before: Memory,
  after: Memory,
  names: {
    person: (id: ID) => string;
    category: (id: ID) => string;
    collection: (id: ID) => string;
    source: (id: ID) => string;
  },
): Promise<void> {
  const entries: Promise<unknown>[] = [];
  const log = (
    kind: HistoryKind,
    summary: string,
    opts: { before?: string | null; after?: string | null; field?: string | null } = {},
  ) => entries.push(addHistory(after.id, kind, summary, opts));

  if (before.title !== after.title) {
    log('title', after.title ? `Título alterado para “${after.title}”` : 'Título removido', {
      before: before.title,
      after: after.title,
      field: 'title',
    });
  }
  if (before.text !== after.text) {
    log('text', 'Texto da memória alterado', {
      before: before.text,
      after: after.text,
      field: 'text',
    });
  }
  if (before.feeling !== after.feeling) {
    log('feeling', 'Anotação “Como isso me fez sentir” alterada', {
      before: before.feeling,
      after: after.feeling,
      field: 'feeling',
    });
  }
  if (before.context !== after.context) {
    log('context', 'Contexto alterado', {
      before: before.context,
      after: after.context,
      field: 'context',
    });
  }
  if (
    before.occurredAt !== after.occurredAt ||
    before.occurredPrecision !== after.occurredPrecision ||
    before.occurredNote !== after.occurredNote
  ) {
    log('date', 'Data do acontecimento alterada', {
      before: JSON.stringify({
        occurredAt: before.occurredAt,
        occurredPrecision: before.occurredPrecision,
        occurredNote: before.occurredNote,
      }),
      after: JSON.stringify({
        occurredAt: after.occurredAt,
        occurredPrecision: after.occurredPrecision,
        occurredNote: after.occurredNote,
      }),
      field: 'date',
    });
  }
  if (before.sourceId !== after.sourceId) {
    log('source', after.sourceId ? `Origem: ${names.source(after.sourceId)}` : 'Origem removida', {
      before: before.sourceId,
      after: after.sourceId,
      field: 'sourceId',
    });
  }
  if (before.favorite !== after.favorite) {
    log('favorite', after.favorite ? 'Marcada como favorita' : 'Removida dos favoritos');
  }
  if (before.hardDay !== after.hardDay) {
    log(
      'hardDay',
      after.hardDay ? 'Guardada para os dias difíceis' : 'Removida dos dias difíceis',
    );
  }
  if (before.inbox !== after.inbox) {
    log('inbox', after.inbox ? 'Devolvida à Entrada' : 'Organizada e tirada da Entrada');
  }

  const listDiff = (
    field: 'personIds' | 'categoryIds' | 'collectionIds' | 'tags',
    kind: HistoryKind,
    label: string,
    nameOf: (id: string) => string,
  ) => {
    const a = before[field];
    const b = after[field];
    if (a.length === b.length && a.every((x, i) => x === b[i])) return;
    const added = b.filter((x) => !a.includes(x)).map(nameOf);
    const removed = a.filter((x) => !b.includes(x)).map(nameOf);
    const parts: string[] = [];
    if (added.length) parts.push(`+ ${added.join(', ')}`);
    if (removed.length) parts.push(`− ${removed.join(', ')}`);
    if (!parts.length) return;
    log(kind, `${label}: ${parts.join('  ')}`, {
      before: JSON.stringify(a),
      after: JSON.stringify(b),
      field,
    });
  };

  listDiff('personIds', 'people', 'Pessoas', names.person);
  listDiff('categoryIds', 'categories', 'Categorias', names.category);
  listDiff('collectionIds', 'collections', 'Coleções', names.collection);
  listDiff('tags', 'tags', 'Tags', (t) => t);

  await Promise.all(entries);
}

/** Restaura um campo ao valor anterior registrado no histórico. */
export async function restoreFromHistory(entry: HistoryEntry, memory: Memory): Promise<Memory> {
  if (!entry.field || entry.before === null) return memory;
  let next: Memory = { ...memory };
  if (entry.field === 'date') {
    const parsed = JSON.parse(entry.before) as Pick<
      Memory,
      'occurredAt' | 'occurredPrecision' | 'occurredNote'
    >;
    next = { ...next, ...parsed };
  } else if (LIST_FIELDS.has(entry.field)) {
    next = { ...next, [entry.field]: JSON.parse(entry.before) } as Memory;
  } else {
    next = { ...next, [entry.field]: entry.before } as Memory;
  }
  const saved = await saveMemory(next);
  await addHistory(memory.id, entry.kind, `Valor anterior restaurado (${entry.summary})`);
  return saved;
}

async function purgeHistory(memoryId: ID): Promise<void> {
  const rows = await getByIndex<HistoryEntry>(STORES.history, 'memoryId', memoryId);
  await removeMany(STORES.history, rows.map((r) => r.id));
}

/* ---------------------------------------------------------------- lixeira */

/** Move a memória para a lixeira. Os anexos continuam guardados junto dela. */
export async function trashMemory(id: ID): Promise<void> {
  const raw = await getOne<Memory>(STORES.memories, id);
  if (!raw) return;
  const memory = normalizeMemory(raw);
  await put(STORES.memories, { ...memory, deletedAt: nowIso(), updatedAt: nowIso() });
  await addHistory(id, 'trashed', 'Movida para a lixeira');
}

export async function restoreMemory(id: ID): Promise<void> {
  const raw = await getOne<Memory>(STORES.memories, id);
  if (!raw) return;
  const memory = normalizeMemory(raw);
  await put(STORES.memories, { ...memory, deletedAt: null, updatedAt: nowIso() });
  await addHistory(id, 'restored', 'Restaurada da lixeira');
}

/**
 * Exclusão definitiva. Remove os anexos que pertencem a esta memória e só a ela;
 * um arquivo ainda referenciado por outro registro nunca é apagado aqui.
 */
export async function destroyMemory(id: ID): Promise<void> {
  const own = await getByIndex<Attachment>(STORES.attachments, 'ownerId', id);
  await removeMany(STORES.attachments, own.map((a) => a.id));

  const capsules = await getAll<Capsule>(STORES.capsules);
  const touched = capsules
    .filter((c) => c.memoryIds.includes(id))
    .map((c) => ({ ...c, memoryIds: c.memoryIds.filter((m) => m !== id), updatedAt: nowIso() }));
  await putMany(STORES.capsules, touched);

  await purgeHistory(id);
  await remove(STORES.memories, id);
}

/** Apaga definitivamente tudo que já passou do prazo de retenção. */
export async function purgeExpiredTrash(retentionDays: number): Promise<number> {
  const memories = (await getAll<Memory>(STORES.memories)).map(normalizeMemory);
  const cutoff = Date.now() - retentionDays * 86400000;
  const expired = memories.filter(
    (m) => m.deletedAt !== null && new Date(m.deletedAt).getTime() < cutoff,
  );
  for (const m of expired) await destroyMemory(m.id);
  return expired.length;
}

export async function emptyTrash(): Promise<number> {
  const memories = (await getAll<Memory>(STORES.memories)).map(normalizeMemory);
  const trashed = memories.filter((m) => m.deletedAt !== null);
  for (const m of trashed) await destroyMemory(m.id);
  return trashed.length;
}

/* ---------------------------------------------------------------- pessoas */

export async function loadPeople(): Promise<Person[]> {
  return getAll<Person>(STORES.people);
}

export function emptyPerson(): Person {
  const ts = nowIso();
  return {
    id: newId('per'),
    name: '',
    photoId: null,
    metAt: null,
    description: '',
    notes: '',
    tags: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

export async function savePerson(person: Person): Promise<Person> {
  const value: Person = { ...person, updatedAt: nowIso() };
  await put(STORES.people, value);
  return value;
}

/** Remove a pessoa e a desassocia das memórias. Os registros em si permanecem. */
export async function deletePerson(id: ID): Promise<void> {
  const memories = (await getAll<Memory>(STORES.memories)).map(normalizeMemory);
  const touched = memories
    .filter((m) => m.personIds.includes(id))
    .map((m) => ({ ...m, personIds: m.personIds.filter((p) => p !== id), updatedAt: nowIso() }));
  await putMany(STORES.memories, touched);

  const attachments = (await getAll<Attachment>(STORES.attachments)).map(normalizeAttachment);
  const reassigned = attachments
    .filter((a) => a.personId === id)
    .map((a) => ({ ...a, personId: null }));
  await putMany(STORES.attachments, reassigned);

  const own = await getByIndex<Attachment>(STORES.attachments, 'ownerId', id);
  await removeMany(STORES.attachments, own.map((a) => a.id));
  await remove(STORES.people, id);
}

/* ---------------------------------------------------------------- anexos */

export function kindFromMime(mime: string, name: string): AttachmentKind {
  const lower = (mime || '').toLowerCase();
  if (lower.startsWith('image/')) return 'image';
  if (lower.startsWith('audio/')) return 'audio';
  if (lower.startsWith('video/')) return 'video';
  if (lower === 'application/pdf') return 'pdf';
  if (lower.startsWith('text/') || lower.includes('word') || lower.includes('document'))
    return 'document';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'heic'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'opus'].includes(ext)) return 'audio';
  if (['mp4', 'webm', 'mov', 'mkv', '3gp'].includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  if (['txt', 'md', 'doc', 'docx', 'rtf', 'odt'].includes(ext)) return 'document';
  return 'other';
}

export async function loadAttachments(): Promise<Attachment[]> {
  return (await getAll<Attachment>(STORES.attachments)).map(normalizeAttachment);
}

export async function addAttachment(
  file: File | { name: string; type: string; size: number; blob: Blob },
  ownerKind: Attachment['ownerKind'],
  ownerId: ID,
  options: { caption?: string; sourceId?: ID | null; personId?: ID | null } = {},
): Promise<Attachment> {
  const blob = file instanceof File ? file : file.blob;
  const att: Attachment = {
    id: newId('att'),
    memoryId: ownerKind === 'memory' ? ownerId : null,
    ownerKind,
    ownerId,
    name: file.name || 'arquivo',
    mime: file.type || blob.type || 'application/octet-stream',
    size: file.size || blob.size,
    kind: kindFromMime(file.type || blob.type, file.name || ''),
    caption: options.caption ?? '',
    createdAt: nowIso(),
    blob,
    sha256: await sha256Blob(blob),
    textContent: '',
    personId: options.personId ?? null,
    occurredAt: null,
    sourceId: options.sourceId ?? null,
  };
  await put(STORES.attachments, att);
  return att;
}

export async function updateAttachment(att: Attachment): Promise<void> {
  await put(STORES.attachments, att);
}

export async function deleteAttachment(id: ID): Promise<void> {
  const att = await getOne<Attachment>(STORES.attachments, id);
  await remove(STORES.attachments, id);
  if (att && att.ownerKind === 'person') {
    const person = await getOne<Person>(STORES.people, att.ownerId);
    if (person && person.photoId === id) {
      await put(STORES.people, { ...person, photoId: null, updatedAt: nowIso() });
    }
  }
  if (att && att.ownerKind === 'collection') {
    const collection = await getOne<Collection>(STORES.collections, att.ownerId);
    if (collection && collection.coverId === id) {
      await put(STORES.collections, { ...collection, coverId: null, updatedAt: nowIso() });
    }
  }
}

/* ---------------------------------------------------------------- cápsulas */

export async function loadCapsules(): Promise<Capsule[]> {
  return getAll<Capsule>(STORES.capsules);
}

export async function saveCapsule(capsule: Capsule): Promise<Capsule> {
  const value: Capsule = { ...capsule, updatedAt: nowIso() };
  await put(STORES.capsules, value);
  return value;
}

export async function deleteCapsule(id: ID): Promise<void> {
  const atts = await getByIndex<Attachment>(STORES.attachments, 'ownerId', id);
  await removeMany(STORES.attachments, atts.map((a) => a.id));
  await remove(STORES.capsules, id);
}

/* ---------------------------------------------------------------- lembretes */

export async function loadReminders(): Promise<Reminder[]> {
  return getAll<Reminder>(STORES.reminders);
}

export async function saveReminder(reminder: Reminder): Promise<Reminder> {
  await put(STORES.reminders, reminder);
  return reminder;
}

export async function deleteReminder(id: ID): Promise<void> {
  await remove(STORES.reminders, id);
}

/* ---------------------------------------------------------------- ajustes */

export async function loadSettings(): Promise<Settings> {
  const rows = await getAll<{ key: string; value: unknown }>(STORES.settings);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const out = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (map.has(key)) out[key] = map.get(key);
  }
  // A v1 guardava 'light' | 'dark' | 'system' em `theme`. Converte para o novo par
  // tema + modo sem perder a preferência do usuário.
  const legacyTheme = out.theme as string;
  if (legacyTheme === 'light' || legacyTheme === 'dark' || legacyTheme === 'system') {
    out.mode = map.has('mode') ? map.get('mode') : legacyTheme;
    out.theme = 'relicario';
  }
  out.notifications = { ...DEFAULT_NOTIFICATIONS, ...((out.notifications as object) ?? {}) };
  return out as unknown as Settings;
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await putMany(
    STORES.settings,
    Object.entries(patch).map(([key, value]) => ({ key, value })),
  );
}

/* ---------------------------------------------------------------- manutenção */

export async function wipeArchive(): Promise<void> {
  await clearStores(CONTENT_STORES);
  await putMany(STORES.categories, BUILTIN_CATEGORIES);
  await putMany(STORES.sources, BUILTIN_SOURCES);
}

/** Remove apenas o que foi marcado como demonstração, preservando os dados reais. */
export async function removeDemoData(): Promise<number> {
  const [memories, people, atts, capsules, collections] = await Promise.all([
    getAll<Memory>(STORES.memories),
    getAll<Person>(STORES.people),
    getAll<Attachment>(STORES.attachments),
    getAll<Capsule>(STORES.capsules),
    getAll<Collection>(STORES.collections),
  ]);
  const demoMem = memories.filter((m) => m.demo);
  const demoPeople = people.filter((p) => p.demo);
  const demoAtt = atts.filter((a) => a.demo);
  const demoCap = capsules.filter((c) => c.demo);
  const demoCol = collections.filter((c) => c.demo);
  for (const m of demoMem) await purgeHistory(m.id);
  await removeMany(STORES.attachments, demoAtt.map((a) => a.id));
  await removeMany(STORES.memories, demoMem.map((m) => m.id));
  await removeMany(STORES.people, demoPeople.map((p) => p.id));
  await removeMany(STORES.capsules, demoCap.map((c) => c.id));
  await removeMany(STORES.collections, demoCol.map((c) => c.id));
  return demoMem.length + demoPeople.length + demoAtt.length + demoCap.length + demoCol.length;
}
