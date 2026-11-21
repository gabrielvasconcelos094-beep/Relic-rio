import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { emptyCollection } from '@/db/archive';
import type { Collection } from '@/db/types';
import { CATEGORY_COLORS, COLLECTION_ICONS } from '@/db/defaults';
import { Icon } from '@/components/Icon';
import { TopBar, BlobImage } from '@/components/ui';
import { normalize } from '@/utils/search';

export function CollectionEditorScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, confirm } = useUi();
  const {
    collections,
    memories,
    attachments,
    saveCollection,
    setCollectionMembership,
    addAttachment,
    deleteAttachment,
  } = useArchive();

  const existing = id ? collections.find((c) => c.id === id) : undefined;
  const isNew = !id;

  const [draft, setDraft] = useState<Collection>(() =>
    existing ? { ...existing } : emptyCollection(),
  );
  const [picked, setPicked] = useState<string[]>(() =>
    existing ? memories.filter((m) => m.collectionIds.includes(existing.id)).map((m) => m.id) : [],
  );
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const createdCover = useRef<string | null>(null);

  const cover = draft.coverId ? (attachments.find((a) => a.id === draft.coverId) ?? null) : null;

  const candidates = useMemo(() => {
    const q = normalize(query);
    const list = q
      ? memories.filter((m) => normalize(`${m.title} ${m.text}`).includes(q))
      : memories;
    return [...list]
      .sort((a, b) => {
        const ap = picked.includes(a.id) ? 0 : 1;
        const bp = picked.includes(b.id) ? 0 : 1;
        return ap - bp || b.createdAt.localeCompare(a.createdAt);
      })
      .slice(0, 60);
  }, [memories, query, picked]);

  const patch = (p: Partial<Collection>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  };

  const pickCover = async (file: File) => {
    try {
      if (draft.coverId) await deleteAttachment(draft.coverId);
      const att = await addAttachment(file, 'collection', draft.id);
      createdCover.current = att.id;
      patch({ coverId: att.id });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível guardar a capa.', 'error');
    }
  };

  const submit = async () => {
    if (!draft.name.trim()) {
      setError('Dê um nome à coleção.');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveCollection({ ...draft, name: draft.name.trim() });
      await setCollectionMembership(saved.id, picked);
      toast(isNew ? 'Coleção criada.' : 'Coleção atualizada.');
      navigate(`/colecao/${saved.id}`, { replace: true });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível guardar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (dirty) {
      const ok = await confirm({
        title: 'Descartar alterações?',
        message: 'A coleção não será guardada como está.',
        confirmLabel: 'Descartar',
        destructive: true,
      });
      if (!ok) return;
      if (isNew && createdCover.current) await deleteAttachment(createdCover.current);
    }
    navigate(-1);
  };

  return (
    <>
      <TopBar
        title={isNew ? 'Nova coleção' : 'Editar coleção'}
        onBack={() => void cancel()}
        actions={
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        }
      />

      <div className="page stack-lg" style={{ paddingTop: 12, paddingBottom: 48 }}>
        <div className="field">
          <label htmlFor="col-nome">Nome</label>
          <input
            id="col-nome"
            className={error ? 'input input-error' : 'input'}
            placeholder="Coisas bonitas que me disseram"
            value={draft.name}
            onChange={(e) => {
              setError('');
              patch({ name: e.target.value });
            }}
          />
          {error && <span className="error-text">{error}</span>}
        </div>

        <div className="field">
          <label htmlFor="col-desc">Descrição</label>
          <textarea
            id="col-desc"
            className="textarea"
            style={{ minHeight: 72 }}
            placeholder="Opcional. O que reúne estas memórias."
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Capa</label>
          <div className="row" style={{ gap: 12 }}>
            {cover ? (
              <BlobImage
                blob={cover.blob}
                alt=""
                className="memory-thumb"
                style={{ width: 72, height: 72 }}
              />
            ) : (
              <span
                className="memory-thumb"
                style={{
                  width: 72,
                  height: 72,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  name={draft.icon}
                  size={24}
                  style={{ color: `var(--cat-${draft.color}, var(--accent))` }}
                />
              </span>
            )}
            <div className="stack" style={{ gap: 6 }}>
              <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
                {cover ? 'Trocar imagem' : 'Escolher imagem'}
              </button>
              {cover && (
                <button
                  type="button"
                  className="btn btn-sm btn-quiet"
                  onClick={async () => {
                    await deleteAttachment(cover.id);
                    patch({ coverId: null });
                  }}
                >
                  Remover
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pickCover(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className="field">
          <label>Cor</label>
          <div className="row-wrap">
            {Object.entries(CATEGORY_COLORS).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                className="chip chip-toggle"
                aria-pressed={draft.color === key}
                onClick={() => patch({ color: key })}
              >
                <span className="chip-dot" style={{ background: `var(${meta.token})` }} />
                {meta.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Ícone</label>
          <div className="row-wrap">
            {COLLECTION_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                className="chip chip-toggle"
                aria-pressed={draft.icon === icon}
                aria-label={`Ícone ${icon}`}
                onClick={() => patch({ icon })}
              >
                <Icon name={icon} size={16} />
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Memórias nesta coleção</label>
          <span className="hint">
            {picked.length} {picked.length === 1 ? 'selecionada' : 'selecionadas'}. As memórias
            continuam no arquivo; a coleção só aponta para elas.
          </span>
          <input
            className="input"
            type="search"
            placeholder="Buscar memórias"
            aria-label="Buscar memórias para a coleção"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="stack" style={{ marginTop: 8 }}>
            {candidates.map((m) => {
              const on = picked.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  className="pressable"
                  style={on ? { borderColor: 'var(--accent)' } : undefined}
                  onClick={() => {
                    setDirty(true);
                    setPicked((p) => (on ? p.filter((x) => x !== m.id) : [...p, m.id]));
                  }}
                >
                  <div className="row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '0.92rem' }}>
                        {m.title || 'Memória sem título'}
                      </strong>
                    </div>
                    {on && <Icon name="check" size={17} style={{ color: 'var(--accent)' }} />}
                  </div>
                </button>
              );
            })}
            {candidates.length === 0 && <p className="muted small">Nenhuma memória encontrada.</p>}
          </div>
        </div>

        <div className="row">
          <button type="button" className="btn btn-quiet" onClick={() => void cancel()}>
            Cancelar
          </button>
          <div className="spacer" />
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void submit()}
          >
            <Icon name="check" size={18} />
            Guardar coleção
          </button>
        </div>
      </div>
    </>
  );
}
