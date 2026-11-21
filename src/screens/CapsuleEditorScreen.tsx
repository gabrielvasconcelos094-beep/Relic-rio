import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import type { Attachment, Capsule } from '@/db/types';
import { Icon } from '@/components/Icon';
import { TopBar } from '@/components/ui';
import { AttachmentEditor } from '@/components/Attachments';
import { isValidCivil, todayCivil } from '@/utils/date';
import { newId } from '@/utils/id';
import { normalize } from '@/utils/search';

function defaultOpenDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return todayCivil(d);
}

export function CapsuleEditorScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, confirm } = useUi();
  const {
    capsules,
    memories,
    attachments,
    saveCapsule,
    addAttachment,
    updateAttachment,
    deleteAttachment,
  } = useArchive();

  const existing = id ? capsules.find((c) => c.id === id) : undefined;
  const isNew = !id;

  const [draft, setDraft] = useState<Capsule>(() =>
    existing
      ? { ...existing }
      : {
          id: newId('cap'),
          title: '',
          letter: '',
          memoryIds: [],
          openAt: defaultOpenDate(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          openedAt: null,
        },
  );
  const [query, setQuery] = useState('');
  const [errors, setErrors] = useState<{ date?: string; content?: string }>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const created = useRef<string[]>([]);

  const own = useMemo(
    () => attachments.filter((a) => a.ownerId === draft.id),
    [attachments, draft.id],
  );

  const candidates = useMemo(() => {
    const q = normalize(query);
    const list = q
      ? memories.filter((m) => normalize(`${m.title} ${m.text}`).includes(q))
      : memories;
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40);
  }, [memories, query]);

  const patch = (p: Partial<Capsule>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  };

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const att = await addAttachment(file, 'capsule', draft.id);
        created.current.push(att.id);
      }
      setDirty(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível anexar.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (att: Attachment) => {
    const ok = await confirm({
      title: 'Remover anexo',
      message: `“${att.caption || att.name}” será apagado desta cápsula.`,
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;
    await deleteAttachment(att.id);
    created.current = created.current.filter((x) => x !== att.id);
  };

  const submit = async () => {
    const next: typeof errors = {};
    if (!isValidCivil(draft.openAt)) next.date = 'Informe a data de abertura.';
    if (!draft.letter.trim() && draft.memoryIds.length === 0 && own.length === 0) {
      next.content = 'Escreva uma carta, selecione memórias ou anexe arquivos.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const saved = await saveCapsule({ ...draft, title: draft.title.trim() });
      toast(isNew ? 'Cápsula criada.' : 'Cápsula atualizada.');
      navigate(`/capsula/${saved.id}`, { replace: true });
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
        message: 'A cápsula não será guardada como está.',
        confirmLabel: 'Descartar',
        destructive: true,
      });
      if (!ok) return;
      if (isNew) for (const attId of created.current) await deleteAttachment(attId);
    }
    navigate(-1);
  };

  return (
    <>
      <TopBar
        title={isNew ? 'Nova cápsula' : 'Editar cápsula'}
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
          <label htmlFor="cap-titulo">Título</label>
          <input
            id="cap-titulo"
            className="input"
            placeholder="Para abrir quando eu precisar lembrar"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="cap-data">Abrir em</label>
          <input
            id="cap-data"
            type="date"
            className={errors.date ? 'input input-error' : 'input'}
            min={todayCivil()}
            value={draft.openAt}
            onChange={(e) => patch({ openAt: e.target.value })}
          />
          {errors.date ? (
            <span className="error-text">{errors.date}</span>
          ) : (
            <span className="hint">
              A cápsula fica lacrada até essa data. O aplicativo não envia notificações: você pode
              baixar um lembrete de calendário depois de guardar.
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="cap-carta">Carta</label>
          <textarea
            id="cap-carta"
            className="textarea"
            style={{ minHeight: 180 }}
            placeholder="Escreva para quem você vai ser nessa data."
            value={draft.letter}
            onChange={(e) => patch({ letter: e.target.value })}
          />
        </div>

        {errors.content && <p className="error-text">{errors.content}</p>}

        <div className="field">
          <label>Memórias nesta cápsula</label>
          <span className="hint">
            {draft.memoryIds.length} {draft.memoryIds.length === 1 ? 'selecionada' : 'selecionadas'}
          </span>
          <input
            className="input"
            type="search"
            placeholder="Buscar memórias para incluir"
            aria-label="Buscar memórias"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="stack" style={{ marginTop: 8 }}>
            {candidates.map((m) => {
              const picked = draft.memoryIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  className="pressable"
                  style={picked ? { borderColor: 'var(--accent)' } : undefined}
                  onClick={() =>
                    patch({
                      memoryIds: picked
                        ? draft.memoryIds.filter((x) => x !== m.id)
                        : [...draft.memoryIds, m.id],
                    })
                  }
                >
                  <div className="row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '0.92rem' }}>
                        {m.title || 'Memória sem título'}
                      </strong>
                    </div>
                    {picked && <Icon name="check" size={17} style={{ color: 'var(--accent)' }} />}
                  </div>
                </button>
              );
            })}
            {candidates.length === 0 && (
              <p className="muted small">Nenhuma memória encontrada para incluir.</p>
            )}
          </div>
        </div>

        <div>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Anexos da cápsula</h2>
          </div>
          <AttachmentEditor
            attachments={own}
            busy={uploading}
            onAdd={(files) => void handleFiles(files)}
            onCaption={(att, caption) => void updateAttachment({ ...att, caption })}
            onRemove={(att) => void removeAttachment(att)}
          />
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
            Guardar cápsula
          </button>
        </div>
      </div>
    </>
  );
}
