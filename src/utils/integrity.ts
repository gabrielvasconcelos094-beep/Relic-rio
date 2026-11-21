/**
 * Verificação de integridade do arquivo.
 *
 * Só inspeciona e relata. Nenhuma correção acontece sem o usuário pedir, e
 * nada é removido quando a associação de um arquivo é incerta.
 */
import type {
  Attachment,
  Capsule,
  Category,
  Collection,
  HistoryEntry,
  Memory,
  Person,
  Source,
} from '@/db/types';
import { sha256Blob } from './hash';

export type IssueSeverity = 'grave' | 'aviso' | 'informacao';

export type FixKind =
  | 'none'
  | 'drop-person-ref'
  | 'drop-category-ref'
  | 'drop-collection-ref'
  | 'drop-source-ref'
  | 'drop-capsule-ref'
  | 'delete-history'
  | 'adopt-orphan'
  | 'delete-orphan'
  | 'set-title';

export interface Issue {
  id: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  /** Ação de correção oferecida, sempre explícita e confirmada pelo usuário. */
  fix: FixKind;
  fixLabel?: string;
  /** Entidades envolvidas, para a correção. */
  targets: { kind: string; id: string; extra?: string }[];
}

export interface IntegrityReport {
  checkedAt: string;
  memories: number;
  attachments: number;
  bytesVerified: number;
  hashesChecked: number;
  issues: Issue[];
  ok: boolean;
}

export interface IntegrityInput {
  memories: Memory[];
  people: Person[];
  categories: Category[];
  collections: Collection[];
  sources: Source[];
  attachments: Attachment[];
  capsules: Capsule[];
  history: HistoryEntry[];
}

/**
 * @param deepHashCheck relê cada anexo e recalcula o SHA-256. É mais lento, mas
 *        detecta arquivos corrompidos no armazenamento.
 */
export async function checkIntegrity(
  data: IntegrityInput,
  deepHashCheck = false,
  onProgress?: (done: number, total: number) => void,
): Promise<IntegrityReport> {
  const issues: Issue[] = [];
  const memoryIds = new Set(data.memories.map((m) => m.id));
  const personIds = new Set(data.people.map((p) => p.id));
  const categoryIds = new Set(data.categories.map((c) => c.id));
  const collectionIds = new Set(data.collections.map((c) => c.id));
  const sourceIds = new Set(data.sources.map((s) => s.id));
  const capsuleIds = new Set(data.capsules.map((c) => c.id));
  const personName = (id: string) => data.people.find((p) => p.id === id)?.name ?? id;

  let n = 0;
  const issue = (i: Omit<Issue, 'id'>) => issues.push({ ...i, id: `iss_${(n += 1)}` });

  /* ---- registros sem dados mínimos ---- */
  const attachmentsByOwner = new Map<string, Attachment[]>();
  for (const a of data.attachments) {
    const list = attachmentsByOwner.get(a.ownerId) ?? [];
    list.push(a);
    attachmentsByOwner.set(a.ownerId, list);
  }

  for (const m of data.memories) {
    const own = attachmentsByOwner.get(m.id) ?? [];
    if (!m.title.trim() && !m.text.trim() && own.length === 0) {
      issue({
        severity: 'aviso',
        title: 'Memória sem conteúdo',
        detail: `Um registro de ${new Date(m.createdAt).toLocaleDateString('pt-BR')} não tem título, texto nem anexos.`,
        fix: 'set-title',
        fixLabel: 'Dar um título provisório',
        targets: [{ kind: 'memory', id: m.id }],
      });
    }

    for (const pid of m.personIds) {
      if (!personIds.has(pid)) {
        issue({
          severity: 'grave',
          title: 'Pessoa inexistente associada',
          detail: `“${m.title || 'Memória sem título'}” aponta para uma pessoa que não existe mais.`,
          fix: 'drop-person-ref',
          fixLabel: 'Remover o vínculo',
          targets: [{ kind: 'memory', id: m.id, extra: pid }],
        });
      }
    }
    for (const cid of m.categoryIds) {
      if (!categoryIds.has(cid)) {
        issue({
          severity: 'aviso',
          title: 'Categoria inexistente',
          detail: `“${m.title || 'Memória sem título'}” aponta para uma categoria removida.`,
          fix: 'drop-category-ref',
          fixLabel: 'Remover a referência',
          targets: [{ kind: 'memory', id: m.id, extra: cid }],
        });
      }
    }
    for (const cid of m.collectionIds) {
      if (!collectionIds.has(cid)) {
        issue({
          severity: 'aviso',
          title: 'Coleção inexistente',
          detail: `“${m.title || 'Memória sem título'}” aponta para uma coleção removida.`,
          fix: 'drop-collection-ref',
          fixLabel: 'Remover a referência',
          targets: [{ kind: 'memory', id: m.id, extra: cid }],
        });
      }
    }
    if (m.sourceId && !sourceIds.has(m.sourceId)) {
      issue({
        severity: 'informacao',
        title: 'Origem inexistente',
        detail: `“${m.title || 'Memória sem título'}” aponta para uma origem removida.`,
        fix: 'drop-source-ref',
        fixLabel: 'Limpar a origem',
        targets: [{ kind: 'memory', id: m.id }],
      });
    }
  }

  /* ---- cápsulas apontando para memórias que sumiram ---- */
  for (const c of data.capsules) {
    for (const mid of c.memoryIds) {
      if (!memoryIds.has(mid)) {
        issue({
          severity: 'aviso',
          title: 'Cápsula com memória ausente',
          detail: `A cápsula “${c.title || 'sem título'}” inclui um registro que não existe mais.`,
          fix: 'drop-capsule-ref',
          fixLabel: 'Remover da cápsula',
          targets: [{ kind: 'capsule', id: c.id, extra: mid }],
        });
      }
    }
  }

  /* ---- histórico órfão ---- */
  const orphanHistory = data.history.filter((h) => !memoryIds.has(h.memoryId));
  if (orphanHistory.length) {
    issue({
      severity: 'informacao',
      title: 'Histórico sem memória',
      detail: `${orphanHistory.length} entradas de histórico pertencem a registros que não existem mais.`,
      fix: 'delete-history',
      fixLabel: 'Apagar essas entradas',
      targets: orphanHistory.map((h) => ({ kind: 'history', id: h.id })),
    });
  }

  /* ---- anexos órfãos ---- */
  const validOwner = (a: Attachment) => {
    switch (a.ownerKind) {
      case 'memory':
        return memoryIds.has(a.ownerId);
      case 'person':
        return personIds.has(a.ownerId);
      case 'capsule':
        return capsuleIds.has(a.ownerId);
      case 'collection':
        return collectionIds.has(a.ownerId);
      default:
        return false;
    }
  };
  const orphans = data.attachments.filter((a) => !validOwner(a));
  for (const a of orphans) {
    issue({
      severity: 'aviso',
      title: 'Arquivo sem registro',
      detail: `“${a.name}” (${Math.round(a.size / 1024)} KB) não está associado a nenhuma memória, pessoa, coleção ou cápsula.`,
      fix: 'adopt-orphan',
      fixLabel: 'Criar uma memória para este arquivo',
      targets: [{ kind: 'attachment', id: a.id }],
    });
  }

  /* ---- anexos com metadados impossíveis ---- */
  for (const a of data.attachments) {
    if (a.personId && !personIds.has(a.personId)) {
      issue({
        severity: 'informacao',
        title: 'Anexo com pessoa inexistente',
        detail: `“${a.name}” indica ${personName(a.personId)}, que não está mais no arquivo.`,
        fix: 'none',
        targets: [{ kind: 'attachment', id: a.id }],
      });
    }
    if (a.size === 0 || a.blob.size === 0) {
      issue({
        severity: 'grave',
        title: 'Arquivo vazio',
        detail: `“${a.name}” está guardado com 0 bytes — o conteúdo provavelmente se perdeu.`,
        fix: 'none',
        targets: [{ kind: 'attachment', id: a.id }],
      });
    } else if (a.blob.size !== a.size) {
      issue({
        severity: 'aviso',
        title: 'Tamanho divergente',
        detail: `“${a.name}” foi registrado com ${a.size} bytes, mas o arquivo tem ${a.blob.size}.`,
        fix: 'none',
        targets: [{ kind: 'attachment', id: a.id }],
      });
    }
  }

  /* ---- conferência de hash (opcional, mais lenta) ---- */
  let bytesVerified = 0;
  let hashesChecked = 0;
  if (deepHashCheck) {
    const total = data.attachments.length;
    let done = 0;
    for (const a of data.attachments) {
      done += 1;
      onProgress?.(done, total);
      if (!a.sha256) continue;
      try {
        const actual = await sha256Blob(a.blob);
        hashesChecked += 1;
        bytesVerified += a.blob.size;
        if (actual && actual !== a.sha256) {
          issue({
            severity: 'grave',
            title: 'Arquivo corrompido',
            detail: `O conteúdo de “${a.name}” não corresponde mais ao hash registrado quando foi guardado.`,
            fix: 'none',
            targets: [{ kind: 'attachment', id: a.id }],
          });
        }
      } catch {
        issue({
          severity: 'grave',
          title: 'Arquivo ilegível',
          detail: `Não foi possível ler “${a.name}” do armazenamento local.`,
          fix: 'none',
          targets: [{ kind: 'attachment', id: a.id }],
        });
      }
    }
  }

  const order: Record<IssueSeverity, number> = { grave: 0, aviso: 1, informacao: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    checkedAt: new Date().toISOString(),
    memories: data.memories.length,
    attachments: data.attachments.length,
    bytesVerified,
    hashesChecked,
    issues,
    ok: issues.length === 0,
  };
}
