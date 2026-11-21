/** Operações de alto nível sobre o arquivo (CRUD com integridade referencial). */
import {
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
import { BUILTIN_CATEGORIES } from './defaults';
import { DEFAULT_SETTINGS, type Attachment, type AttachmentKind, type Capsule, type Category, type ID, type Memory, type Person, type Settings } from './types';
import { newId } from '@/utils/id';

const nowIso = () => new Date().toISOString();

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
  const memories = await getAll<Memory>(STORES.memories);
  const touched = memories
    .filter((m) => m.categoryIds.includes(id))
    .map((m) => ({ ...m, categoryIds: m.categoryIds.filter((c) => c !== id), updatedAt: nowIso() }));
  await putMany(STORES.memories, touched);
  await remove(STORES.categories, id);
}

/* ---------------------------------------------------------------- memórias */

export async function loadMemories(): Promise<Memory[]> {
  return getAll<Memory>(STORES.memories);
}

export function emptyMemory(): Memory {
  const ts = nowIso();
  return {
    id: newId('mem'),
    title: '',
    occurredAt: null,
    occurredPrecision: 'day',
    createdAt: ts,
    updatedAt: ts,
    categoryIds: [],
    personIds: [],
    tags: [],
    text: '',
    feeling: '',
    context: '',
    favorite: false,
    hardDay: false,
  };
}

export async function saveMemory(memory: Memory): Promise<Memory> {
  const value: Memory = { ...memory, updatedAt: nowIso() };
  await put(STORES.memories, value);
  return value;
}

export async function deleteMemory(id: ID): Promise<void> {
  const atts = await getByIndex<Attachment>(STORES.attachments, 'ownerId', id);
  await removeMany(STORES.attachments, atts.map((a) => a.id));
  const capsules = await getAll<Capsule>(STORES.capsules);
  const touched = capsules
    .filter((c) => c.memoryIds.includes(id))
    .map((c) => ({ ...c, memoryIds: c.memoryIds.filter((m) => m !== id), updatedAt: nowIso() }));
  await putMany(STORES.capsules, touched);
  await remove(STORES.memories, id);
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
  const memories = await getAll<Memory>(STORES.memories);
  const touched = memories
    .filter((m) => m.personIds.includes(id))
    .map((m) => ({ ...m, personIds: m.personIds.filter((p) => p !== id), updatedAt: nowIso() }));
  await putMany(STORES.memories, touched);
  const atts = await getByIndex<Attachment>(STORES.attachments, 'ownerId', id);
  await removeMany(STORES.attachments, atts.map((a) => a.id));
  await remove(STORES.people, id);
}

/* ---------------------------------------------------------------- anexos */

export function kindFromMime(mime: string, name: string): AttachmentKind {
  const lower = (mime || '').toLowerCase();
  if (lower.startsWith('image/')) return 'image';
  if (lower.startsWith('audio/')) return 'audio';
  if (lower.startsWith('video/')) return 'video';
  if (lower === 'application/pdf') return 'pdf';
  if (lower.startsWith('text/') || lower.includes('word') || lower.includes('document')) return 'document';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'heic'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'opus'].includes(ext)) return 'audio';
  if (['mp4', 'webm', 'mov', 'mkv', '3gp'].includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  if (['txt', 'md', 'doc', 'docx', 'rtf', 'odt'].includes(ext)) return 'document';
  return 'other';
}

export async function loadAttachments(): Promise<Attachment[]> {
  return getAll<Attachment>(STORES.attachments);
}

export async function addAttachment(
  file: File | { name: string; type: string; size: number; blob: Blob },
  ownerKind: Attachment['ownerKind'],
  ownerId: ID,
  caption = '',
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
    caption,
    createdAt: nowIso(),
    blob,
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

/* ---------------------------------------------------------------- ajustes */

export async function loadSettings(): Promise<Settings> {
  const rows = await getAll<{ key: string; value: unknown }>(STORES.settings);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const out = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (map.has(key)) out[key] = map.get(key);
  }
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
  await clearStores([
    STORES.memories,
    STORES.people,
    STORES.attachments,
    STORES.capsules,
    STORES.categories,
  ]);
  await putMany(STORES.categories, BUILTIN_CATEGORIES);
}

/** Remove apenas o que foi marcado como demonstração, preservando os dados reais. */
export async function removeDemoData(): Promise<number> {
  const [memories, people, atts, capsules] = await Promise.all([
    getAll<Memory>(STORES.memories),
    getAll<Person>(STORES.people),
    getAll<Attachment>(STORES.attachments),
    getAll<Capsule>(STORES.capsules),
  ]);
  const demoMem = memories.filter((m) => m.demo);
  const demoPeople = people.filter((p) => p.demo);
  const demoAtt = atts.filter((a) => a.demo);
  const demoCap = capsules.filter((c) => c.demo);
  await removeMany(STORES.attachments, demoAtt.map((a) => a.id));
  await removeMany(STORES.memories, demoMem.map((m) => m.id));
  await removeMany(STORES.people, demoPeople.map((p) => p.id));
  await removeMany(STORES.capsules, demoCap.map((c) => c.id));
  return demoMem.length + demoPeople.length + demoAtt.length + demoCap.length;
}
