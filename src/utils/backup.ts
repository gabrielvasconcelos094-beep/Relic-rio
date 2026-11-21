/**
 * Backup, exportação e restauração.
 *
 * Formato v2 (.zip, opcionalmente cifrado):
 *   relicario.json   manifesto com todos os registros e a lista de anexos,
 *                    cada um com tamanho e SHA-256 do conteúdo;
 *   anexos/<id>.<ext>  os arquivos originais, byte a byte;
 *   LEIA-ME.txt      resumo legível.
 *
 * A restauração verifica o manifesto e os hashes ANTES de tocar no banco, e grava
 * tudo numa única transação do IndexedDB — se algo falhar, nada é alterado.
 */
import { unzip, zip, type Unzipped, type Zippable } from 'fflate';
import { CONTENT_STORES, STORES, transactWrite } from '@/db/idb';
import { normalizeAttachment, normalizeMemory } from '@/db/archive';
import type {
  Attachment,
  Capsule,
  Category,
  Collection,
  HistoryEntry,
  Memory,
  Person,
  Reminder,
  Settings,
  Source,
} from '@/db/types';
import { formatCivil, formatTimestamp } from './date';
import { sha256Blob, sha256Bytes } from './hash';
import { decryptBytes, encryptBytes, isEncrypted, readEncryptedHeader } from './crypto';

export const BACKUP_FORMAT = 'relicario-backup';
export const BACKUP_VERSION = 2;
const MANIFEST = 'relicario.json';
const FILES_DIR = 'anexos';

export interface AttachmentRecord extends Omit<Attachment, 'blob'> {
  file: string;
}

export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  version: number;
  app: string;
  exportedAt: string;
  counts: {
    memories: number;
    people: number;
    categories: number;
    collections: number;
    sources: number;
    attachments: number;
    capsules: number;
    history: number;
    reminders: number;
  };
  memories: Memory[];
  people: Person[];
  categories: Category[];
  collections: Collection[];
  sources: Source[];
  capsules: Capsule[];
  history: HistoryEntry[];
  reminders: Reminder[];
  attachments: AttachmentRecord[];
  /** Preferências que fazem sentido restaurar. Nunca o PIN nem a biometria. */
  settings: Partial<Settings>;
}

export interface ArchiveSnapshot {
  memories: Memory[];
  people: Person[];
  categories: Category[];
  collections: Collection[];
  sources: Source[];
  attachments: Attachment[];
  capsules: Capsule[];
  history: HistoryEntry[];
  reminders: Reminder[];
  settings: Settings;
}

function extensionFor(att: { name: string; mime: string }): string {
  const fromName = att.name.includes('.') ? (att.name.split('.').pop() ?? '') : '';
  if (fromName && fromName.length <= 5 && /^[a-z0-9]+$/i.test(fromName)) {
    return `.${fromName.toLowerCase()}`;
  }
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

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40);
}

export interface BackupResult {
  blob: Blob;
  filename: string;
  manifest: BackupManifest;
  encrypted: boolean;
  /** Conferência feita relendo o arquivo gerado. */
  verification: {
    ok: boolean;
    checkedFiles: number;
    expectedFiles: number;
    hashMismatches: number;
    message: string;
  };
}

export interface BackupOptions {
  label?: string;
  subset?: { memories: Memory[]; people: Person[]; capsules: Capsule[]; collections?: Collection[] };
  password?: string;
  /** Incluir memórias que estão na lixeira. Padrão: sim, para não perder nada. */
  includeTrashed?: boolean;
}

/** Gera o arquivo de backup e o confere relendo o resultado. */
export async function createBackup(
  snapshot: ArchiveSnapshot,
  options: BackupOptions = {},
): Promise<BackupResult> {
  const includeTrashed = options.includeTrashed !== false;
  const allMemories = options.subset?.memories ?? snapshot.memories;
  const memories = includeTrashed ? allMemories : allMemories.filter((m) => !m.deletedAt);
  const people = options.subset?.people ?? snapshot.people;
  const capsules = options.subset?.capsules ?? snapshot.capsules;
  const collections = options.subset?.collections ?? snapshot.collections;

  const memoryIds = new Set(memories.map((m) => m.id));
  const ownerIds = new Set<string>([
    ...memories.map((m) => m.id),
    ...people.map((p) => p.id),
    ...capsules.map((c) => c.id),
    ...collections.map((c) => c.id),
  ]);
  const attachments = snapshot.attachments.filter((a) => ownerIds.has(a.ownerId));
  const history = snapshot.history.filter((h) => memoryIds.has(h.memoryId));
  const reminders = options.subset ? [] : snapshot.reminders;

  const files: Zippable = {};
  const attachmentMeta: AttachmentRecord[] = [];

  for (const att of attachments) {
    const path = `${FILES_DIR}/${att.id}${extensionFor(att)}`;
    const bytes = new Uint8Array(await att.blob.arrayBuffer());
    files[path] = bytes;
    const { blob: _blob, ...meta } = att;
    void _blob;
    attachmentMeta.push({
      ...meta,
      // Garante o hash mesmo para anexos gravados antes da v2.
      sha256: att.sha256 ?? (await sha256Bytes(bytes)),
      file: path,
    });
  }

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: 'Relicário 2.0',
    exportedAt: new Date().toISOString(),
    counts: {
      memories: memories.length,
      people: people.length,
      categories: snapshot.categories.length,
      collections: collections.length,
      sources: snapshot.sources.length,
      attachments: attachmentMeta.length,
      capsules: capsules.length,
      history: history.length,
      reminders: reminders.length,
    },
    memories,
    people,
    categories: snapshot.categories,
    collections,
    sources: snapshot.sources,
    capsules,
    history,
    reminders,
    attachments: attachmentMeta,
    settings: {
      theme: snapshot.settings.theme,
      mode: snapshot.settings.mode,
      customLight: snapshot.settings.customLight,
      customDark: snapshot.settings.customDark,
      fontScale: snapshot.settings.fontScale,
      listDensity: snapshot.settings.listDensity,
      memoryViewStyle: snapshot.settings.memoryViewStyle,
      galleryColumns: snapshot.settings.galleryColumns,
      defaultSort: snapshot.settings.defaultSort,
      homeShowFeatured: snapshot.settings.homeShowFeatured,
      homeShowQuickTiles: snapshot.settings.homeShowQuickTiles,
      homeShowRecent: snapshot.settings.homeShowRecent,
      lockOnBackground: snapshot.settings.lockOnBackground,
      trashRetentionDays: snapshot.settings.trashRetentionDays,
      extractPdfText: snapshot.settings.extractPdfText,
      widgetShowContent: snapshot.settings.widgetShowContent,
      notifications: snapshot.settings.notifications,
    },
  };

  files[MANIFEST] = encoder.encode(JSON.stringify(manifest, null, 2));
  files['LEIA-ME.txt'] = encoder.encode(
    [
      'Relicário — arquivo de backup (formato 2)',
      '',
      `Gerado em: ${formatTimestamp(manifest.exportedAt)}`,
      `Memórias: ${manifest.counts.memories}`,
      `Pessoas: ${manifest.counts.people}`,
      `Coleções: ${manifest.counts.collections}`,
      `Anexos: ${manifest.counts.attachments}`,
      `Cápsulas: ${manifest.counts.capsules}`,
      `Histórico: ${manifest.counts.history} registros`,
      '',
      'relicario.json contém todos os registros em texto legível, e para cada anexo',
      'o tamanho e o SHA-256 do conteúdo. A pasta anexos/ contém os arquivos originais.',
      'O Relicário confere esses hashes antes de restaurar.',
      '',
      'O PIN e a configuração de biometria NÃO são incluídos no backup.',
      'Para restaurar: Configurações > Backup e exportação > Restaurar backup.',
      options.password
        ? '\nEste backup foi gerado criptografado (AES-256-GCM). Sem a senha não há como recuperá-lo.'
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );

  const zipped = await zipAsync(files);
  const encrypted = Boolean(options.password);
  const payload = encrypted ? await encryptBytes(zipped, options.password!) : zipped;

  // Conferência real: relê o que acabou de ser gerado, inclusive decifrando.
  let verification: BackupResult['verification'];
  try {
    const reread = encrypted ? await decryptBytes(payload, options.password!) : payload;
    const check = await unzipAsync(reread);
    const parsed = JSON.parse(decoder.decode(check[MANIFEST])) as BackupManifest;
    let present = 0;
    let mismatches = 0;
    for (const meta of parsed.attachments) {
      const data = check[meta.file];
      if (!data) continue;
      present += 1;
      if (meta.sha256) {
        const actual = await sha256Bytes(data);
        if (actual && actual !== meta.sha256) mismatches += 1;
      }
    }
    const expected = manifest.counts.attachments;
    const ok =
      parsed.counts.memories === manifest.counts.memories &&
      parsed.counts.people === manifest.counts.people &&
      present === expected &&
      mismatches === 0;
    verification = {
      ok,
      checkedFiles: present,
      expectedFiles: expected,
      hashMismatches: mismatches,
      message: ok
        ? `Backup conferido: ${parsed.counts.memories} memórias e ${present} de ${expected} anexos, todos com o hash correto.`
        : `Conferência falhou: ${present} de ${expected} anexos presentes, ${mismatches} com hash divergente.`,
    };
  } catch (err) {
    verification = {
      ok: false,
      checkedFiles: 0,
      expectedFiles: manifest.counts.attachments,
      hashMismatches: 0,
      message: `Não foi possível conferir o backup gerado: ${err instanceof Error ? err.message : 'erro desconhecido'}`,
    };
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const label = options.label ? `-${slug(options.label)}` : '';
  const ext = encrypted ? 'relicario' : 'zip';
  return {
    blob: new Blob([payload as BlobPart], {
      type: encrypted ? 'application/octet-stream' : 'application/zip',
    }),
    filename: `relicario${label}-${stamp}.${ext}`,
    manifest,
    encrypted,
    verification,
  };
}

/* ================================================================
   Inspeção e restauração
   ================================================================ */

export interface BackupInspection {
  encrypted: boolean;
  /** Preenchido só quando o conteúdo pôde ser lido (não cifrado, ou senha correta). */
  manifest: BackupManifest | null;
  createdAt: string | null;
  version: number | null;
  files: { present: number; expected: number; missing: string[]; mismatched: string[] };
  ok: boolean;
  problems: string[];
}

function sanitizeMemory(raw: unknown): Memory | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Partial<Memory>;
  if (typeof m.id !== 'string') return null;
  return normalizeMemory(m as Partial<Memory> & { id: string });
}

/** Lê o arquivo, verifica o manifesto e confere os hashes. Não grava nada. */
export async function inspectBackup(
  file: File | Blob,
  password?: string,
): Promise<BackupInspection> {
  const raw = new Uint8Array(await file.arrayBuffer());
  const problems: string[] = [];
  const encrypted = isEncrypted(raw);

  let plain = raw;
  if (encrypted) {
    const head = readEncryptedHeader(raw);
    if (!password) {
      return {
        encrypted: true,
        manifest: null,
        createdAt: head?.header.createdAt ?? null,
        version: null,
        files: { present: 0, expected: 0, missing: [], mismatched: [] },
        ok: false,
        problems: ['Backup criptografado: informe a senha para verificá-lo.'],
      };
    }
    plain = await decryptBytes(raw, password);
  }

  let entries: Unzipped;
  try {
    entries = await unzipAsync(plain);
  } catch {
    throw new Error('Este arquivo não é um backup válido do Relicário (não foi possível abri-lo).');
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
    throw new Error(
      `Este backup foi criado por uma versão mais nova do Relicário (formato ${manifest.version}).`,
    );
  }

  const missing: string[] = [];
  const mismatched: string[] = [];
  let present = 0;
  for (const meta of manifest.attachments ?? []) {
    const data = entries[meta.file];
    if (!data) {
      missing.push(meta.name || meta.file);
      continue;
    }
    present += 1;
    if (meta.sha256) {
      const actual = await sha256Bytes(data);
      if (actual && actual !== meta.sha256) mismatched.push(meta.name || meta.file);
    }
  }
  if (missing.length) problems.push(`${missing.length} anexos listados não estão no arquivo.`);
  if (mismatched.length) {
    problems.push(`${mismatched.length} anexos têm conteúdo diferente do registrado (corrompidos).`);
  }

  return {
    encrypted,
    manifest,
    createdAt: manifest.exportedAt ?? null,
    version: manifest.version,
    files: { present, expected: (manifest.attachments ?? []).length, missing, mismatched },
    ok: problems.length === 0,
    problems,
  };
}

export interface RestoreReport {
  memories: number;
  people: number;
  categories: number;
  collections: number;
  sources: number;
  attachments: number;
  capsules: number;
  history: number;
  reminders: number;
  skippedFiles: number;
  mode: 'replace' | 'merge';
  version: number;
}

export interface RestoreOptions {
  mode: 'replace' | 'merge';
  password?: string;
  /** Restaurar mesmo com anexos faltando ou corrompidos. */
  force?: boolean;
  /** Aplicar também as preferências guardadas no backup. */
  applySettings?: boolean;
}

/**
 * Restaura um backup. Toda a leitura, decifragem e verificação acontece antes de
 * abrir a transação; a gravação é atômica, então uma falha no meio não deixa o
 * arquivo do usuário num estado parcial.
 */
export async function restoreBackup(
  file: File | Blob,
  options: RestoreOptions,
): Promise<{ report: RestoreReport; settings: Partial<Settings> | null }> {
  const raw = new Uint8Array(await file.arrayBuffer());
  const plain = isEncrypted(raw)
    ? await decryptBytes(raw, options.password ?? '')
    : raw;

  const inspection = await inspectBackup(new Blob([plain as BlobPart]));
  if (!inspection.ok && !options.force) {
    throw new Error(
      `${inspection.problems.join(' ')} Use “restaurar mesmo assim” se quiser prosseguir com o que está íntegro.`,
    );
  }
  const manifest = inspection.manifest!;
  const entries = await unzipAsync(plain);

  const memories = (manifest.memories ?? []).map(sanitizeMemory).filter((m): m is Memory => !!m);
  const people = (manifest.people ?? []).filter((p) => p && typeof p.id === 'string');
  const categories = (manifest.categories ?? []).filter((c) => c && typeof c.id === 'string');
  const collections = (manifest.collections ?? []).filter((c) => c && typeof c.id === 'string');
  const sources = (manifest.sources ?? []).filter((s) => s && typeof s.id === 'string');
  const capsules = (manifest.capsules ?? []).filter((c) => c && typeof c.id === 'string');
  const history = (manifest.history ?? []).filter((h) => h && typeof h.id === 'string');
  const reminders = (manifest.reminders ?? []).filter((r) => r && typeof r.id === 'string');

  const attachments: Attachment[] = [];
  let skippedFiles = 0;
  for (const meta of manifest.attachments ?? []) {
    const data = entries[meta.file];
    if (!data) {
      skippedFiles += 1;
      continue;
    }
    if (inspection.files.mismatched.includes(meta.name || meta.file) && !options.force) {
      skippedFiles += 1;
      continue;
    }
    const copy = new Uint8Array(data.length);
    copy.set(data);
    attachments.push(
      normalizeAttachment({
        ...meta,
        blob: new Blob([copy as BlobPart], { type: meta.mime || 'application/octet-stream' }),
      } as Partial<Attachment> & { id: string; blob: Blob }),
    );
  }

  await transactWrite(CONTENT_STORES, async (get) => {
    if (options.mode === 'replace') for (const s of CONTENT_STORES) get(s).clear();
    for (const m of memories) get(STORES.memories).put(m);
    for (const p of people) get(STORES.people).put(p);
    for (const c of categories) get(STORES.categories).put(c);
    for (const c of collections) get(STORES.collections).put(c);
    for (const s of sources) get(STORES.sources).put(s);
    for (const c of capsules) get(STORES.capsules).put(c);
    for (const h of history) get(STORES.history).put(h);
    for (const r of reminders) get(STORES.reminders).put(r);
    for (const a of attachments) get(STORES.attachments).put(a);
  });

  return {
    report: {
      memories: memories.length,
      people: people.length,
      categories: categories.length,
      collections: collections.length,
      sources: sources.length,
      attachments: attachments.length,
      capsules: capsules.length,
      history: history.length,
      reminders: reminders.length,
      skippedFiles,
      mode: options.mode,
      version: manifest.version,
    },
    settings: options.applySettings ? (manifest.settings ?? null) : null,
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
    `Aconteceu em: ${formatCivil(memory.occurredAt, memory.occurredPrecision, memory.occurredNote)}`,
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
    const path = `${FILES_DIR}/${att.name || att.id}${att.name.includes('.') ? '' : extensionFor(att)}`;
    files[path] = new Uint8Array(await att.blob.arrayBuffer());
  }
  const bytes = await zipAsync(files);
  return {
    blob: new Blob([bytes as BlobPart], { type: 'application/zip' }),
    filename: `memoria-${slug(memory.title || memory.id)}.zip`,
  };
}

/** Salva/compartilha o arquivo gerado. Usa o compartilhamento do Android quando disponível. */
export async function deliverFile(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  const file = typeof File !== 'undefined' ? new File([blob], filename, { type: blob.type }) : null;
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

export { sha256Blob };
