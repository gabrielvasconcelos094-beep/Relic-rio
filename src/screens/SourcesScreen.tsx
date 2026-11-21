import { useMemo, useState } from 'react';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { Icon } from '@/components/Icon';
import { TopBar, Sheet } from '@/components/ui';
import type { Source } from '@/db/types';
import { newId } from '@/utils/id';

const ICONS = ['chat', 'letter', 'image', 'hands', 'box', 'archive', 'book', 'audio'];

export function SourcesScreen() {
  const { sources, allMemories, saveSource, deleteSource } = useArchive();
  const { toast, confirm } = useUi();
  const [editing, setEditing] = useState<Source | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sources) {
      map.set(s.id, allMemories.filter((m) => m.sourceId === s.id).length);
    }
    return map;
  }, [sources, allMemories]);

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast('Dê um nome à origem.', 'error');
      return;
    }
    await saveSource({ ...editing, name: editing.name.trim() });
    setEditing(null);
    toast('Origem guardada.');
  };

  const remove = async (source: Source) => {
    const count = counts.get(source.id) ?? 0;
    const ok = await confirm({
      title: 'Remover origem',
      message: count
        ? `“${source.name}” será removida de ${count} ${count === 1 ? 'registro' : 'registros'}. As memórias permanecem.`
        : `“${source.name}” será removida.`,
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;
    await deleteSource(source.id);
    toast('Origem removida.');
  };

  return (
    <>
      <TopBar
        title="Origens"
        actions={
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              setEditing({
                id: newId('src'),
                name: '',
                icon: 'archive',
                builtin: false,
                order: sources.length,
              })
            }
          >
            <Icon name="plus" size={16} />
            Nova
          </button>
        }
      />

      <div className="page stack" style={{ paddingTop: 6 }}>
        <p className="muted small">
          De onde uma memória veio. Quando o conteúdo chega por compartilhamento de um aplicativo
          reconhecido, a origem é preenchida sozinha — nos outros casos fica em branco, sem
          adivinhação.
        </p>

        <div className="card card-pad list-divided">
          {sources.map((s) => (
            <div key={s.id} className="link-row">
              <Icon name={s.icon} />
              <span className="label">
                <strong>{s.name}</strong>
                <span>
                  {counts.get(s.id) ?? 0}{' '}
                  {(counts.get(s.id) ?? 0) === 1 ? 'registro' : 'registros'}
                  {s.builtin ? ' · origem inicial' : ''}
                </span>
              </span>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Editar ${s.name}`}
                onClick={() => setEditing({ ...s })}
              >
                <Icon name="edit" size={18} />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remover ${s.name}`}
                onClick={() => void remove(s)}
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.name ? 'Editar origem' : 'Nova origem'}
      >
        {editing && (
          <div className="stack-lg">
            <div className="field">
              <label htmlFor="src-nome">Nome</label>
              <input
                id="src-nome"
                className="input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Ícone</label>
              <div className="row-wrap">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className="chip chip-toggle"
                    aria-pressed={editing.icon === icon}
                    aria-label={`Ícone ${icon}`}
                    onClick={() => setEditing({ ...editing, icon })}
                  >
                    <Icon name={icon} size={16} />
                  </button>
                ))}
              </div>
            </div>
            <div className="row">
              <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <div className="spacer" />
              <button type="button" className="btn btn-primary" onClick={() => void save()}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
