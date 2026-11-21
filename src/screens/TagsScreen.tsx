import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { Icon } from '@/components/Icon';
import { TopBar, EmptyState, Sheet } from '@/components/ui';

export function TagsScreen() {
  const { allTags, memories, people, renameTag, deleteTag } = useArchive();
  const { toast, confirm } = useUi();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const tag of allTags) {
      map.set(
        tag,
        memories.filter((m) => m.tags.includes(tag)).length +
          people.filter((p) => p.tags.includes(tag)).length,
      );
    }
    return map;
  }, [allTags, memories, people]);

  const commit = async () => {
    if (!editing) return;
    const next = draft.trim();
    if (!next || next === editing) {
      setEditing(null);
      return;
    }
    setBusy(true);
    try {
      await renameTag(editing, next);
      toast('Tag renomeada em todos os registros.');
      setEditing(null);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (tag: string) => {
    const count = counts.get(tag) ?? 0;
    const ok = await confirm({
      title: 'Apagar tag',
      message: `A tag “${tag}” será removida de ${count} ${count === 1 ? 'registro' : 'registros'}. O conteúdo não é afetado.`,
      confirmLabel: 'Apagar tag',
      destructive: true,
    });
    if (!ok) return;
    await deleteTag(tag);
    toast('Tag apagada.');
  };

  return (
    <>
      <TopBar title="Tags" />
      <div className="page stack" style={{ paddingTop: 6 }}>
        {allTags.length === 0 ? (
          <EmptyState
            icon="tag"
            title="Nenhuma tag criada"
            description="As tags são criadas livremente ao guardar uma memória, e ficam disponíveis para reutilizar."
          />
        ) : (
          <>
            <p className="muted small">
              {allTags.length} {allTags.length === 1 ? 'tag' : 'tags'} no arquivo. Renomear altera
              todos os registros que a usam.
            </p>
            <div className="card card-pad list-divided">
              {allTags.map((tag) => (
                <div key={tag} className="link-row">
                  <Icon name="tag" />
                  <button
                    type="button"
                    className="label"
                    style={{ background: 'none', border: 0, textAlign: 'left', color: 'inherit' }}
                    onClick={() => navigate(`/memorias?tag=${encodeURIComponent(tag)}`)}
                  >
                    <strong>{tag}</strong>
                    <span>
                      {counts.get(tag) ?? 0}{' '}
                      {(counts.get(tag) ?? 0) === 1 ? 'registro' : 'registros'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Renomear ${tag}`}
                    onClick={() => {
                      setEditing(tag);
                      setDraft(tag);
                    }}
                  >
                    <Icon name="edit" size={18} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Apagar ${tag}`}
                    onClick={() => void remove(tag)}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Renomear tag">
        <div className="stack-lg">
          <div className="field">
            <label htmlFor="tag-novo">Novo nome</label>
            <input
              id="tag-novo"
              className="input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
          <div className="row">
            <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>
              Cancelar
            </button>
            <div className="spacer" />
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void commit()}
            >
              {busy ? 'Aplicando…' : 'Renomear'}
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
