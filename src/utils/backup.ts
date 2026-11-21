/** Backup, exportação e restauração reais, em arquivo .zip com os anexos preservados. */
import { unzip, zip, type Unzipped, type Zippable } from 'fflate';
import { STORES, transactWrite } from '@/db/idb';
import type { Attachment, Capsule, Category, Memory, Person, Settings } from '@/db/types';
import { formatCivil, formatTimestamp } from './date';

export const BACKUP_FORMAT = 'relicario-backup';
export const BACKUP_VERSION = 1;
const MANIFEST = 'relicario.json';
const FILES_DIR = 'anexos';

export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  counts: {
    memories: number;
    people: number;
    categories: number;
    attachments: number;
    capsules: number;
  };
  memories: Memory[];
  people: Person[];
  categories: Category[];
  capsules: Capsule[];
  attachments: (Omit<Attachment, 'blob'> & { file: string })[];
  settings: Pick<Settings, 'theme' | 'lockOnBackground'>;
}

export interface ArchiveSnapshot {
  memories: Memory[];
  people: Person[];
  categories: Category[];
  attachments: Attachment[];
  capsules: Capsule[];
  settings: Settings;
}

function extensionFor(att: Attachment): string {
  const fromName = att.name.includes('.') ? att.name.split('.').pop() ?? '' : '';
  if (fromName && fromName.length <= 5) return `.${fromName.toLowerCase()}`;
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
    'audio/mpeg': '.mp3',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'text/plain': '.txt',
  };
  return map[att.mime] ?? '.bin';
}

function zipAsync(files: Zippable): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (err, data) => (err ? reject(err) : resolve(data)));
  });
}

function unzipAsync(data: Uint8Array): Promise<Unzipped> {
  return new Promise((resolve, reject) => {
    unzip(data, (err, out) => (err ? reject(err) : resolve(out)));
  });
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface BackupResult {
  blob: Blob;
  filename: string;
  manifest: BackupManifest;
  /** Conferência feita relendo o .zip gerado. */
  verification: { ok: boolean; entries: number; expected: number; message: string };
}

/** Gera o arquivo de backup e o confere relendo o resultado. */
export async function createBackup(
  snapshot: ArchiveSnapshot,
  options: { label?: string; subset?: { memories: Memory[]; people: Person[]; capsules: Capsule[] } } = {},
): Promise<BackupResult> {
  const memories = options.subset?.memories ?? snapshot.memories;
  const people = options.subset?.people ?? snapshot.people;
  const capsules = options.subset?.capsules ?? snapshot.capsules;
  const ownerIds = new Set<string>([
    ...memories.map((m) => m.id),
    ...people.map((p) => p.id),
    ...capsules.map((c) => c.id),
  ]);
  const attachments = snapshot.attachments.filter((a) => ownerIds.has(a.ownerId));

  const files: Zippable = {};
  const attachmentMeta: BackupManifest['attachments'] = [];

  for (const att of attachments) {
    const path = `${FILES_DIR}/${att.id}${extensionFor(att)}`;
    files[path] = await blobBytes(att.blob);
    const { blob: _blob, ...meta } = att;
    void _blob;
    attachmentMeta.push({ ...meta, file: path });
  }

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      memories: memories.length,
      people: people.length,
      categories: snapshot.categories.length,
      attachments: attachmentMeta.length,
      capsules: capsules.length,
    },
    memories,
    people,
    categories: snapshot.categories,
    capsules,
    attachments: attachmentMeta,
    settings: { theme: snapshot.settings.theme, lockOnBackground: snapshot.settings.lockOnBackground },
  };

  files[MANIFEST] = encoder.encode(JSON.stringify(manifest, null, 2));
  files['LEIA-ME.txt'] = encoder.encode(
    [
      'Relicário — arquivo de backup',
      '',
      `Gerado em: ${formatTimestamp(manifest.exportedAt)}`,
      `Memórias: ${manifest.counts.memories}`,
      `Pessoas: ${manifest.counts.people}`,
      `Anexos: ${manifest.counts.attachments}`,
      `Cápsulas: ${manifest.counts.capsules}`,
      '',
      'relicario.json contém todos os registros em texto legível.',
      'A pasta anexos/ contém os arquivos originais, com o mesmo nome do identificador',
      'usado no relicario.json.',
      '',
      'O PIN e a configuração de biometria NÃO são incluídos no backup.',
      'Para restaurar: Configurações > Backup e exportação > Restaurar backup.',
    ].join('\n'),
  );

  const bytes = await zipAsync(files);
  const blob = new Blob([bytes], { type: 'application/zip' });

  // Conferência real: relê o .zip recém-gerado.
  let verification: BackupResult['verification'];
  try {
    const check = await unzipAsync(bytes);
    const parsed = JSON.parse(decoder.decode(check[MANIFEST])) as BackupManifest;
    const expected = manifest.counts.attachments;
    const present = parsed.attachments.filter((a) => check[a.file] !== undefined).length;
    const ok =
      parsed.counts.memories === manifest.counts.memories &&
      parsed.counts.people === manifest.counts.people &&
      present === expected;
    verification = {
      ok,
      entries: present,
      expected,
      message: ok
        ? `Backup conferido: ${parsed.counts.memories} memórias e ${present} de ${expected} anexos verificados dentro do arquivo.`
        : `Conferência falhou: ${present} de ${expected} anexos encontrados no arquivo gerado.`,
    };
  } catch (err) {
    verification = {
      ok: false,
      entries: 0,
      expected: manifest.counts.attachments,
      message: `Não foi possível conferir o backup gerado: ${err instanceof Error ? err.message : 'erro desconhecido'}`,
    };
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const label = options.label ? `-${slug(options.label)}` : '';
  return { blob, filename: `relicario${label}-${stamp}.zip`, manifest, verification };
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40);
}

export interface RestoreReport {
  memories: number;
  people: number;
  categories: number;
  attachments: number;
  capsules: number;
  skippedFiles: number;
  mode: 'replace' | 'merge';
}

function sanitizeMemory(raw: unknown): Memory | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Partial<Memory>;
  if (typeof m.id !== 'string') return null;
  return {
    id: m.id,
    title: typeof m.title === 'string' ? m.title : '',
    occurredAt: typeof m.occurredAt === 'string' ? m.occurredAt : null,
    occurredPrecision:
      m.occurredPrecision === 'month' || m.occurredPrecision === 'year' || m.occurredPrecision === 'unknown'
        ? m.occurredPrecision
        : 'day',
    createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date().toISOString(),
    updatedAt: typeof m.updatedAt === 'string' ? m.updatedAt : new Date().toISOString(),
    categoryIds: Array.isArray(m.categoryIds) ? m.categoryIds.filter((x) => typeof x === 'string') : [],
    personIds: Array.isArray(m.personIds) ? m.personIds.filter((x) => typeof x === 'string') : [],
    tags: Array.isArray(m.tags) ? m.tags.filter((x) => typeof x === 'string') : [],
    text: typeof m.text === 'string' ? m.text : '',
    feeling: typeof m.feeling === 'string' ? m.feeling : '',
    context: typeof m.context === 'string' ? m.context : '',
    favorite: Boolean(m.favorite),
    hardDay: Boolean(m.hardDay),
    ...(m.demo ? { demo: true } : {}),
  };
}

/** Lê um .zip de backup e grava no banco local. */
export async function restoreBackup(
  file: File | Blob,
  mode: 'replace' | 'merge',
): Promise<RestoreReport> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let entries: Unzipped;
  try {
    entries = await unzipAsync(bytes);
  } catch {
    throw new Error('Este arquivo não parece ser um .zip válido de backup do Relicário.');
  }
  const manifestBytes = entries[MANIFEST];
  if (!manifestBytes) throw new Error('O arquivo não contém relicario.json — backup inválido.');

  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(decoder.decode(manifestBytes)) as BackupManifest;
  } catch {
    throw new Error('O relicario.json dentro do backup está corrompido.');
  }
  if (manifest.format !== BACKUP_FORMAT) {
    throw new Error('Formato não reconhecido. Selecione um backup gerado pelo Relicário.');
  }
  if (manifest.version > BACKUP_VERSION) {
    throw new Error('Este backup foi criado por uma versão mais nova do Relicário.');
  }

  const memories = (manifest.memories ?? []).map(sanitizeMemory).filter((m): m is Memory => !!m);
  const people = (manifest.people ?? []).filter((p) => p && typeof p.id === 'string');
  const categories = (manifest.categories ?? []).filter((c) => c && typeof c.id === 'string');
  const capsules = (manifest.capsules ?? []).filter((c) => c && typeof c.id === 'string');

  const attachments: Attachment[] = [];
  let skippedFiles = 0;
  for (const meta of manifest.attachments ?? []) {
    const data = entries[meta.file];
    if (!data) {
      skippedFiles += 1;
      continue;
    }
    const copy = new Uint8Array(data.length);
    copy.set(data);
    attachments.push({
      ...meta,
      blob: new Blob([copy], { type: meta.mime || 'application/octet-stream' }),
    } as Attachment);
  }

  const stores = [STORES.memories, STORES.people, STORES.categories, STORES.attachments, STORES.capsules];
  await transactWrite(stores, async (get) => {
    if (mode === 'replace') for (const s of stores) get(s).clear();
    for (const m of memories) get(STORES.memories).put(m);
    for (const p of people) get(STORES.people).put(p);
    for (const c of categories) get(STORES.categories).put(c);
    for (const c of capsules) get(STORES.capsules).put(c);
    for (const a of attachments) get(STORES.attachments).put(a);
  });

  return {
    memories: memories.length,
    people: people.length,
    categories: categories.length,
    attachments: attachments.length,
    capsules: capsules.length,
    skippedFiles,
    mode,
  };
}

/** Exporta uma única memória como .zip legível (texto + anexos). */
export async function exportMemoryBundle(
  memory: Memory,
  people: Person[],
  categories: Category[],
  attachments: Attachment[],
): Promise<{ blob: Blob; filename: string }> {
  const names = memory.personIds
    .map((id) => people.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(', ');
  const cats = memory.categoryIds
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean)
    .join(', ');
  const lines = [
    memory.title || 'Memória sem título',
    '='.repeat(Math.max(3, (memory.title || 'Memória sem título').length)),
    '',
    `Aconteceu em: ${formatCivil(memory.occurredAt, memory.occurredPrecision)}`,
    `Guardado em: ${formatTimestamp(memory.createdAt)}`,
    names ? `Pessoas: ${names}` : '',
    cats ? `Categorias: ${cats}` : '',
    memory.tags.length ? `Tags: ${memory.tags.join(', ')}` : '',
    memory.favorite ? 'Favorita: sim' : '',
    memory.hardDay ? 'Guardada para os dias difíceis: sim' : '',
    '',
    memory.text ? `${memory.text}\n` : '',
    memory.feeling ? `Como isso me fez sentir?\n${memory.feeling}\n` : '',
    memory.context ? `Contexto\n${memory.context}\n` : '',
  ].filter((l) => l !== '');

  const files: Zippable = { 'memoria.txt': encoder.encode(lines.join('\n')) };
  const own = attachments.filter((a) => a.ownerId === memory.id);
  for (const att of own) {
    files[`${FILES_DIR}/${att.name || att.id}${att.name.includes('.') ? '' : extensionFor(att)}`] =
      await blobBytes(att.blob);
  }
  const bytes = await zipAsync(files);
  return {
    blob: new Blob([bytes], { type: 'application/zip' }),
    filename: `memoria-${slug(memory.title || memory.id)}.zip`,
  };
}

/** Salva/compartilha o arquivo gerado. Usa o compartilhamento do Android quando disponível. */
export async function deliverFile(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  const file =
    typeof File !== 'undefined' ? new File([blob], filename, { type: blob.type }) : null;
  if (
    file &&
    typeof navigator !== 'undefined' &&
    navigator.canShare?.({ files: [file] }) &&
    navigator.share
  ) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      // cai para o download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'downloaded';
}
