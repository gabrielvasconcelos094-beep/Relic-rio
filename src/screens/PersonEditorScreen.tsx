import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { emptyPerson } from '@/db/archive';
import type { Person } from '@/db/types';
import { Icon } from '@/components/Icon';
import { TopBar } from '@/components/ui';
import { Avatar } from '@/components/MemoryCard';
import { TagInput } from '@/components/TagInput';
import { isValidCivil } from '@/utils/date';

export function PersonEditorScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, confirm } = useUi();
  const { people, attachments, allTags, savePerson, addAttachment, deleteAttachment } = useArchive();
  const existing = id ? people.find((p) => p.id === id) : undefined;
  const isNew = !id;

  const [draft, setDraft] = useState<Person>(() => (existing ? { ...existing } : emptyPerson()));
  const [error, setError] = useState<{ name?: string; date?: string }>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const photo = draft.photoId ? attachments.find((a) => a.id === draft.photoId) ?? null : null;

  const patch = (p: Partial<Person>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  };

  const pickPhoto = async (file: File) => {
    try {
      if (draft.photoId) await deleteAttachment(draft.photoId);
      const att = await addAttachment(file, 'person', draft.id);
      patch({ photoId: att.id });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível guardar a foto.', 'error');
    }
  };

  const submit = async () => {
    const next: typeof error = {};
    if (!draft.name.trim()) next.name = 'Informe um nome.';
    if (draft.metAt && !isValidCivil(draft.metAt)) next.date = 'Data inválida.';
    setError(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const saved = await savePerson({ ...draft, name: draft.name.trim() });
      toast(isNew ? 'Pessoa adicionada.' : 'Perfil atualizado.');
      navigate(`/pessoa/${saved.id}`, { replace: true });
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
        message: 'As alterações feitas neste perfil não serão guardadas.',
        confirmLabel: 'Descartar',
        destructive: true,
      });
      if (!ok) return;
      if (isNew && draft.photoId) await deleteAttachment(draft.photoId);
    }
    navigate(-1);
  };

  return (
    <>
      <TopBar
        title={isNew ? 'Nova pessoa' : 'Editar pessoa'}
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
        <div className="row" style={{ gap: 16 }}>
          <Avatar person={draft} photo={photo} large />
          <div className="stack" style={{ gap: 6 }}>
            <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
              {photo ? 'Trocar fotografia' : 'Adicionar fotografia'}
            </button>
            {photo && (
              <button
                type="button"
                className="btn btn-sm btn-quiet"
                onClick={async () => {
                  await deleteAttachment(photo.id);
                  patch({ photoId: null });
                }}
              >
                Remover
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pickPhoto(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="nome">Nome</label>
          <input
            id="nome"
            className={error.name ? 'input input-error' : 'input'}
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
          {error.name && <span className="error-text">{error.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="conheci">Conheci em</label>
          <input
            id="conheci"
            type="date"
            className={error.date ? 'input input-error' : 'input'}
            value={draft.metAt ?? ''}
            onChange={(e) => patch({ metAt: e.target.value || null })}
          />
          <span className="hint">Opcional.</span>
        </div>

        <div className="field">
          <label htmlFor="descricao">Descrição</label>
          <input
            id="descricao"
            className="input"
            placeholder="Amiga da faculdade, irmão mais novo…"
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="anotacoes">Anotações pessoais</label>
          <textarea
            id="anotacoes"
            className="textarea"
            placeholder="Opcional. Só você lê isto."
            value={draft.notes}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </div>

        <TagInput value={draft.tags} onChange={(tags) => patch({ tags })} suggestions={allTags} />

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
            Guardar
          </button>
        </div>
      </div>
    </>
  );
}
