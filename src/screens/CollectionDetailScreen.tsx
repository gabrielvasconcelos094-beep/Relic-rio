import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { Icon } from '@/components/Icon';
import { TopBar, EmptyState, BlobImage, Sheet } from '@/components/ui';
import { MemoryCard } from '@/components/MemoryCard';
import { sortMemories } from '@/utils/search';
import { newId } from '@/utils/id';
import { todayCivil } from '@/utils/date';

export function CollectionDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, confirm } = useUi();
  const {
    collections,
    memories,
    people,
    categories,
    attachments,
    settings,
    saveMemory,
    deleteCollection,
    saveReminder,
  } = useArchive();
  const [menu, setMenu] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState('');

  const collection = collections.find((c) => c.id === id);

  const items = useMemo(
    () =>
      collection
        ? sortMemories(
            memories.filter((m) => m.collectionIds.includes(collection.id)),
            settings.defaultSort,
          )
        : [],
    [memories, collection, settings.defaultSort],
  );

  if (!collection) {
    return (
      <>
        <TopBar title="Coleção" />
        <div className="page">
          <p className="muted" style={{ marginTop: 24 }}>
            Esta coleção não está mais no arquivo.
          </p>
        </div>
      </>
    );
  }

  const cover = collection.coverId
    ? (attachments.find((a) => a.id === collection.coverId) ?? null)
    : null;

  const remove = async () => {
    const ok = await confirm({
      title: 'Excluir coleção',
      message: `“${collection.name}” será removida. As ${items.length} ${items.length === 1 ? 'memória continua' : 'memórias continuam'} no arquivo — só o agrupamento desaparece.`,
      confirmLabel: 'Excluir coleção',
      destructive: true,
    });
    if (!ok) return;
    await deleteCollection(collection.id);
    toast('Coleção excluída. As memórias continuam no arquivo.');
    navigate('/colecoes', { replace: true });
  };

  const removeFrom = async (memoryId: string) => {
    const m = memories.find((x) => x.id === memoryId);
    if (!m) return;
    await saveMemory({
      ...m,
      collectionIds: m.collectionIds.filter((c) => c !== collection.id),
    });
    toast('Removida da coleção. A memória continua no arquivo.');
  };

  const createReminder = async () => {
    if (!reminderDate) return;
    await saveReminder({
      id: newId('rem'),
      kind: 'collection',
      targetId: collection.id,
      title: `Revisitar “${collection.name}”`,
      at: reminderDate,
      time: settings.notifications.time,
      repeat: 'none',
      enabled: true,
      lastFiredAt: null,
      createdAt: new Date().toISOString(),
    });
    setReminderOpen(false);
    setReminderDate('');
    toast(
      settings.notifications.enabled
        ? 'Lembrete criado.'
        : 'Lembrete criado. Ative as notificações nas configurações para ser avisado.',
    );
  };

  return (
    <>
      <TopBar
        title={collection.name}
        actions={
          <>
            <button
              type="button"
              className="icon-btn"
              aria-label="Editar coleção"
              onClick={() => navigate(`/colecao/${collection.id}/editar`)}
            >
              <Icon name="edit" />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Mais ações"
              onClick={() => setMenu(true)}
            >
              <Icon name="dots" />
            </button>
          </>
        }
      />

      <div className="page stack-lg" style={{ paddingTop: 6 }}>
        <header className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
          {cover ? (
            <BlobImage
              blob={cover.blob}
              alt=""
              className="memory-thumb"
              style={{ width: 76, height: 76 }}
            />
          ) : (
            <span
              className="memory-thumb"
              style={{
                width: 76,
                height: 76,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name={collection.icon}
                size={26}
                style={{ color: `var(--cat-${collection.color}, var(--accent))` }}
              />
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="serif">{collection.name}</h1>
            {collection.description && (
              <p className="muted small" style={{ marginTop: 4 }}>
                {collection.description}
              </p>
            )}
            <div className="meta-line" style={{ marginTop: 6 }}>
              <span>
                {items.length} {items.length === 1 ? 'memória' : 'memórias'}
              </span>
            </div>
          </div>
        </header>

        {items.length === 0 ? (
          <EmptyState
            icon="book"
            title="Coleção vazia"
            description="Adicione memórias que já estão no arquivo — elas não são copiadas, apenas reunidas aqui."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate(`/colecao/${collection.id}/editar`)}
              >
                <Icon name="plus" size={18} />
                Escolher memórias
              </button>
            }
          />
        ) : (
          <div className="stack">
            {items.map((m) => (
              <div key={m.id} className="row" style={{ alignItems: 'stretch', gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <MemoryCard
                    memory={m}
                    people={people}
                    categories={categories}
                    attachments={attachments}
                  />
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remover ${m.title || 'memória'} da coleção`}
                  onClick={() => void removeFrom(m.id)}
                >
                  <Icon name="close" size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Ações">
        <div className="list-divided">
          <button
            type="button"
            className="link-row"
            onClick={() => {
              setMenu(false);
              navigate(`/colecao/${collection.id}/editar`);
            }}
          >
            <Icon name="edit" />
            <span className="label">
              <strong>Editar coleção</strong>
              <span>Nome, capa, cor e memórias incluídas</span>
            </span>
          </button>
          <button
            type="button"
            className="link-row"
            onClick={() => {
              setMenu(false);
              setReminderDate(todayCivil(new Date(Date.now() + 30 * 86400000)));
              setReminderOpen(true);
            }}
          >
            <Icon name="clock" />
            <span className="label">
              <strong>Lembrar de revisitar</strong>
              <span>Cria um lembrete local para uma data</span>
            </span>
          </button>
          <button
            type="button"
            className="link-row"
            style={{ color: 'var(--danger)' }}
            onClick={() => {
              setMenu(false);
              void remove();
            }}
          >
            <Icon name="trash" />
            <span className="label">
              <strong>Excluir coleção</strong>
              <span>As memórias permanecem no arquivo</span>
            </span>
          </button>
        </div>
      </Sheet>

      <Sheet
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        title="Lembrar de revisitar"
      >
        <div className="stack-lg">
          <div className="field">
            <label htmlFor="rem-data">Data</label>
            <input
              id="rem-data"
              type="date"
              className="input"
              min={todayCivil()}
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
            />
          </div>
          {!settings.notifications.enabled && (
            <p className="tiny faint">
              As notificações estão desligadas. O lembrete fica guardado e passa a avisar assim que
              você ligá-las em Configurações → Notificações.
            </p>
          )}
          <div className="row">
            <button type="button" className="btn btn-quiet" onClick={() => setReminderOpen(false)}>
              Cancelar
            </button>
            <div className="spacer" />
            <button
              type="button"
              className="btn btn-primary"
              disabled={!reminderDate}
              onClick={() => void createReminder()}
            >
              Criar lembrete
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
