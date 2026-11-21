import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { emptyMemory } from '@/db/archive';
import type { Attachment, Memory } from '@/db/types';
import { Icon } from '@/components/Icon';
import { TopBar } from '@/components/ui';
import { AttachmentEditor } from '@/components/Attachments';
import { TagInput } from '@/components/TagInput';
import { isValidCivil, todayCivil } from '@/utils/date';

export function MemoryEditorScreen() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast, confirm } = useUi();
  const {
    memories,
    people,
    categories,
    attachments,
    allTags,
    saveMemory,
    savePerson,
    addAttachment,
    updateAttachment,
    deleteAttachment,
  } = useArchive();

  const existing = id ? memories.find((m) => m.id === id) : undefined;
  const isNew = !id;

  const [draft, setDraft] = useState<Memory>(() => {
    if (existing) return { ...existing };
    const base = emptyMemory();
    const personId = params.get('pessoa');
    return {
      ...base,
      occurredAt: todayCivil(),
      personIds: personId ? [personId] : [],
      hardDay: params.get('abrigo') === '1',
    };
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ date?: string; content?: string }>({});
  const [newPersonName, setNewPersonName] = useState('');
  const createdAttachments = useRef<string[]>([]);
  const savedRef = useRef(false);

  useEffect(() => {
    if (id && existing) setDraft((d) => (d.id === existing.id ? d : { ...existing }));
  }, [id, existing]);

  const own = useMemo(
    () => attachments.filter((a) => a.ownerId === draft.id),
    [attachments, draft.id],
  );

  const patch = (p: Partial<Memory>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  };

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const att = await addAttachment(file, 'memory', draft.id);
        createdAttachments.current.push(att.id);
      }
      setDirty(true);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Não foi possível guardar o arquivo.',
        'error',
      );
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (att: Attachment) => {
    const ok = await confirm({
      title: 'Remover anexo',
      message: `“${att.caption || att.name}” será apagado deste registro. Não é possível desfazer.`,
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;
    await deleteAttachment(att.id);
    createdAttachments.current = createdAttachments.current.filter((x) => x !== att.id);
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (draft.occurredAt && !isValidCivil(draft.occurredAt)) {
      next.date = 'Informe uma data válida ou deixe o campo vazio.';
    }
    if (!draft.title.trim() && !draft.text.trim() && own.length === 0) {
      next.content = 'Dê um título, escreva algo ou anexe um arquivo para guardar este registro.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = await saveMemory({
        ...draft,
        title: draft.title.trim(),
        occurredAt: draft.occurredAt || null,
        occurredPrecision: draft.occurredAt ? draft.occurredPrecision : 'unknown',
      });
      savedRef.current = true;
      toast(isNew ? 'Memória guardada.' : 'Memória atualizada.');
      navigate(`/memoria/${saved.id}`, { replace: true });
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
        message: isNew
          ? 'Este registro ainda não foi guardado. Os arquivos anexados agora serão descartados.'
          : 'As alterações feitas não serão guardadas.',
        confirmLabel: 'Descartar',
        destructive: true,
      });
      if (!ok) return;
      if (isNew) {
        for (const attId of createdAttachments.current) await deleteAttachment(attId);
      }
    }
    navigate(-1);
  };

  const addPerson = async () => {
    const name = newPersonName.trim();
    if (!name) return;
    const found = people.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (found) {
      patch({ personIds: toggleIn(draft.personIds, found.id) });
      setNewPersonName('');
      return;
    }
    const ts = new Date().toISOString();
    const person = await savePerson({
      id: `per_${crypto.randomUUID?.() ?? Date.now().toString(36)}`,
      name,
      photoId: null,
      metAt: null,
      description: '',
      notes: '',
      tags: [],
      createdAt: ts,
      updatedAt: ts,
    });
    patch({ personIds: [...draft.personIds, person.id] });
    setNewPersonName('');
  };

  if (id && !existing) {
    return (
      <>
        <TopBar title="Memória" />
        <div className="page">
          <p className="muted">Este registro não existe mais.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title={isNew ? 'Guardar memória' : 'Editar memória'}
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
          <label htmlFor="titulo">Título</label>
          <input
            id="titulo"
            className="input"
            placeholder="O que você quer guardar?"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="texto">Texto, mensagem ou descrição</label>
          <textarea
            id="texto"
            className="textarea"
            style={{ minHeight: 140 }}
            placeholder="Transcreva a mensagem recebida ou descreva o que aconteceu. O conteúdo original fica como você escreveu."
            value={draft.text}
            onChange={(e) => patch({ text: e.target.value })}
          />
        </div>

        {errors.content && <p className="error-text">{errors.content}</p>}

        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div className="field" style={{ flex: 1.3 }}>
            <label htmlFor="ocorrido">Aconteceu em</label>
            <input
              id="ocorrido"
              type="date"
              className={errors.date ? 'input input-error' : 'input'}
              value={draft.occurredAt ?? ''}
              onChange={(e) => patch({ occurredAt: e.target.value || null })}
            />
            <span className="hint">Pode ser de muitos anos atrás.</span>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="precisao">Precisão</label>
            <select
              id="precisao"
              className="input"
              value={draft.occurredPrecision}
              onChange={(e) =>
                patch({ occurredPrecision: e.target.value as Memory['occurredPrecision'] })
              }
            >
              <option value="day">Dia exato</option>
              <option value="month">Mês</option>
              <option value="year">Ano</option>
            </select>
          </div>
        </div>
        {errors.date && <p className="error-text">{errors.date}</p>}
        <p className="tiny faint" style={{ marginTop: -14 }}>
          A data em que o registro entra no relicário é guardada separadamente.
        </p>

        <div className="field">
          <label>Pessoas</label>
          <div className="row-wrap">
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip chip-toggle"
                aria-pressed={draft.personIds.includes(p.id)}
                onClick={() => patch({ personIds: toggleIn(draft.personIds, p.id) })}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <input
              className="input"
              placeholder="Nova pessoa"
              aria-label="Nome de uma nova pessoa"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void addPerson();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-sm"
              disabled={!newPersonName.trim()}
              onClick={() => void addPerson()}
            >
              Criar
            </button>
          </div>
          <span className="hint">Opcional — um registro pode não envolver ninguém.</span>
        </div>

        <div className="field">
          <label>Categorias</label>
          <div className="row-wrap">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className="chip chip-toggle"
                aria-pressed={draft.categoryIds.includes(c.id)}
                onClick={() => patch({ categoryIds: toggleIn(draft.categoryIds, c.id) })}
              >
                <span
                  className="chip-dot"
                  style={{ background: `var(--cat-${c.color}, var(--cat-tinta))` }}
                />
                {c.name}
              </button>
            ))}
          </div>
          <span className="hint">Uma memória pode pertencer a mais de uma categoria.</span>
        </div>

        <TagInput
          value={draft.tags}
          onChange={(tags) => patch({ tags })}
          suggestions={allTags}
        />

        <div>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Anexos</h2>
          </div>
          <AttachmentEditor
            attachments={own}
            busy={uploading}
            onAdd={(files) => void handleFiles(files)}
            onCaption={(att, caption) => void updateAttachment({ ...att, caption })}
            onRemove={(att) => void removeAttachment(att)}
          />
        </div>

        <div className="field">
          <label htmlFor="sentir">Como isso me fez sentir?</label>
          <textarea
            id="sentir"
            className="textarea"
            placeholder="Opcional. O que esse momento significou para você."
            value={draft.feeling}
            onChange={(e) => patch({ feeling: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="contexto">Contexto ou história por trás desse momento</label>
          <textarea
            id="contexto"
            className="textarea"
            placeholder="Opcional. O que estava acontecendo na época, por que isso importou."
            value={draft.context}
            onChange={(e) => patch({ context: e.target.value })}
          />
        </div>

        <div className="card card-pad">
          <div className="switch-row">
            <div className="switch-text">
              <strong>Favorita</strong>
              <span className="tiny faint">Para encontrar com facilidade depois.</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.favorite}
              aria-label="Favorita"
              className="switch"
              onClick={() => patch({ favorite: !draft.favorite })}
            />
          </div>
          <div className="switch-row">
            <div className="switch-text">
              <strong>Guardar para os dias difíceis</strong>
              <span className="tiny faint">Aparece na seção de abrigo do arquivo.</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.hardDay}
              aria-label="Guardar para os dias difíceis"
              className="switch"
              onClick={() => patch({ hardDay: !draft.hardDay })}
            />
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
            {saving ? 'Guardando…' : 'Guardar memória'}
          </button>
        </div>
      </div>
    </>
  );
}
