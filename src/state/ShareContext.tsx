import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useArchive } from './ArchiveContext';
import { useUi } from './UiContext';
import type { PendingShare } from '@/db/types';
import { PACKAGE_TO_SOURCE } from '@/db/defaults';
import { clearShare, fetchSharedFile, getPendingShares, isNative, RelicarioNative } from '@/utils/native';
import { emptyMemory } from '@/db/archive';
import { todayCivil } from '@/utils/date';
import { extractText } from '@/utils/text-extract';
import { snippet } from '@/utils/search';

export interface ImportedShare {
  memoryId: string;
  files: number;
  skipped: number;
}

interface ShareApi {
  /** Compartilhamentos recebidos do Android e ainda não importados. */
  pending: PendingShare[];
  /** Importa um compartilhamento para a Entrada e devolve o id da memória criada. */
  importShare: (share: PendingShare) => Promise<ImportedShare>;
  importAll: () => Promise<number>;
  discard: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  busy: boolean;
  supported: boolean;
}

const ShareContext = createContext<ShareApi | null>(null);

export function ShareProvider({ children }: { children: ReactNode }) {
  const archive = useArchive();
  const { toast } = useUi();
  const [pending, setPending] = useState<PendingShare[]>([]);
  const [busy, setBusy] = useState(false);
  const importing = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    const shares = await getPendingShares();
    setPending(shares);
  }, []);

  useEffect(() => {
    if (!archive.ready) return undefined;
    void refresh();

    let remove: (() => void) | null = null;
    if (isNative()) {
      void RelicarioNative.addListener('shareReceived', () => {
        void refresh();
      }).then((handle) => {
        remove = () => void handle.remove();
      });
    }
    // Conteúdo pode chegar com o app em segundo plano.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      remove?.();
    };
  }, [archive.ready, refresh]);

  const api = useMemo<ShareApi>(() => {
    const importShare = async (share: PendingShare): Promise<ImportedShare> => {
      if (importing.current.has(share.id)) {
        throw new Error('Este conteúdo já está sendo guardado.');
      }
      importing.current.add(share.id);
      setBusy(true);
      try {
        const text = share.text?.trim() ?? '';
        const subject = share.subject?.trim() ?? '';
        // A origem só é preenchida quando o pacote de quem compartilhou é conhecido.
        const sourceId = share.sourcePackage
          ? (PACKAGE_TO_SOURCE[share.sourcePackage] ?? null)
          : null;

        const memory = {
          ...emptyMemory(),
          title: subject || (text ? snippet(text, 60) : ''),
          text,
          occurredAt: todayCivil(),
          occurredPrecision: 'day' as const,
          capturedAt: share.receivedAt || new Date().toISOString(),
          sourceId,
          inbox: true,
        };
        const saved = await archive.createMemory(memory);

        let files = 0;
        let skipped = 0;
        for (const item of share.items ?? []) {
          const blob = await fetchSharedFile(item.uri);
          if (!blob) {
            skipped += 1;
            continue;
          }
          const file = new File([blob], item.name || 'arquivo', {
            type: item.mime || blob.type || 'application/octet-stream',
          });
          const att = await archive.addAttachment(file, 'memory', saved.id, { sourceId });
          files += 1;
          // Indexa o texto do PDF/documento para a busca, sem sair do aparelho.
          if (archive.settings.extractPdfText) {
            const extracted = await extractText(att);
            if (extracted) await archive.updateAttachment({ ...att, textContent: extracted });
          }
        }

        // Só limpa os arquivos temporários depois de tudo guardado no banco.
        await clearShare(share.id);
        setPending((list) => list.filter((s) => s.id !== share.id));
        return { memoryId: saved.id, files, skipped };
      } finally {
        importing.current.delete(share.id);
        setBusy(false);
      }
    };

    return {
      pending,
      busy,
      supported: isNative(),
      refresh,
      importShare,
      async importAll() {
        let count = 0;
        for (const share of [...pending]) {
          try {
            await importShare(share);
            count += 1;
          } catch (err) {
            toast(
              err instanceof Error ? err.message : 'Um compartilhamento não pôde ser guardado.',
              'error',
            );
          }
        }
        return count;
      },
      async discard(id) {
        await clearShare(id);
        setPending((list) => list.filter((s) => s.id !== id));
      },
    };
  }, [pending, busy, refresh, archive, toast]);

  return <ShareContext.Provider value={api}>{children}</ShareContext.Provider>;
}

export function useShares(): ShareApi {
  const ctx = useContext(ShareContext);
  if (!ctx) throw new Error('useShares precisa estar dentro de <ShareProvider>.');
  return ctx;
}
