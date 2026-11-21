import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import type { HistoryEntry, Memory } from '@/db/types';
import { Icon } from './Icon';
import { Sheet } from './ui';
import { snippet } from '@/utils/search';

const KIND_ICON: Record<string, string> = {
  created: 'star',
  trashed: 'trash',
  restored: 'upload',
  'attachment-added': 'file',
  'attachment-removed': 'file',
  date: 'calendar',
  people: 'people',
  categories: 'tag',
  collections: 'book',
  tags: 'tag',
  source: 'letter',
};

function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(2)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Histórico de uma memória, com restauração de valores anteriores. */
export function MemoryHistory({
  memory,
  open,
  onClose,
}: {
  memory: Memory;
  open: boolean;
  onClose: () => void;
}) {
  const { historyOf, restoreFromHistory } = useArchive();
  const { toast, confirm } = useUi();
  const entries = historyOf(memory.id);

  const restore = async (entry: HistoryEntry) => {
    const preview = entry.before
      ? snippet(entry.before.startsWith('[') ? 'a seleção anterior' : entry.before, 90)
      : '';
    const ok = await confirm({
      title: 'Restaurar valor anterior',
      message: `${entry.summary}. O valor atual será substituído${preview ? ` por: “${preview}”` : ''}. A alteração também fica registrada no histórico.`,
      confirmLabel: 'Restaurar',
    });
    if (!ok) return;
    await restoreFromHistory(entry);
    // Fecha para o usuário ver a memória já restaurada, em vez de ficar na folha.
    onClose();
    toast('Valor anterior restaurado.');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Histórico">
      <div className="stack-lg">
        <p className="tiny faint">
          O conteúdo original de cada registro é preservado: o histórico mostra o que mudou e
          permite voltar atrás, sem reescrever o que foi guardado.
        </p>

        {entries.length === 0 ? (
          <p className="muted small">Nenhuma alteração registrada ainda.</p>
        ) : (
          <div>
            {entries.map((entry) => (
              <div key={entry.id} className="history-line">
                <span className="when">{when(entry.at)}</span>
                <div className="what">
                  <div className="row" style={{ gap: 6, alignItems: 'flex-start' }}>
                    <Icon
                      name={KIND_ICON[entry.kind] ?? 'edit'}
                      size={14}
                      style={{ color: 'var(--ink-faint)', marginTop: 3, flex: 'none' }}
                    />
                    <span style={{ flex: 1 }}>{entry.summary}</span>
                  </div>
                  {entry.field && entry.before !== null && entry.before !== '' && (
                    <button
                      type="button"
                      className="btn btn-sm btn-quiet"
                      style={{ paddingLeft: 0, marginTop: 2 }}
                      onClick={() => void restore(entry)}
                    >
                      Restaurar o que havia antes
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
