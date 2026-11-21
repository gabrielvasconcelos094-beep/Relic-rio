import { useNavigate, useParams } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { Icon } from '@/components/Icon';
import { TopBar } from '@/components/ui';
import { MemoryCard } from '@/components/MemoryCard';
import { AttachmentView } from '@/components/Attachments';
import { capsuleStatus } from '@/utils/selectors';
import { daysUntil, formatCivil, formatTimestamp } from '@/utils/date';
import { capsuleReminder } from '@/utils/ics';
import { deliverFile } from '@/utils/backup';

export function CapsuleDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, confirm } = useUi();
  const { capsules, memories, people, categories, attachments, saveCapsule, deleteCapsule } =
    useArchive();

  const capsule = capsules.find((c) => c.id === id);

  if (!capsule) {
    return (
      <>
        <TopBar title="Cápsula" />
        <div className="page">
          <p className="muted" style={{ marginTop: 24 }}>
            Esta cápsula não está mais no arquivo.
          </p>
        </div>
      </>
    );
  }

  const status = capsuleStatus(capsule);
  const days = daysUntil(capsule.openAt);
  const own = attachments.filter((a) => a.ownerId === capsule.id);
  const included = capsule.memoryIds
    .map((mid) => memories.find((m) => m.id === mid))
    .filter((m): m is NonNullable<typeof m> => !!m);

  const open = async (early: boolean) => {
    if (early) {
      const ok = await confirm({
        title: 'Abrir antes da data?',
        message: `Esta cápsula estava guardada para ${formatCivil(capsule.openAt)}. Você pode abri-la agora, mas o lacre não volta.`,
        confirmLabel: 'Abrir agora',
      });
      if (!ok) return;
    }
    await saveCapsule({ ...capsule, openedAt: new Date().toISOString() });
    toast('Cápsula aberta.');
  };

  const reminder = async () => {
    const file = capsuleReminder(capsule);
    if (!file) {
      toast('Data de abertura inválida.', 'error');
      return;
    }
    try {
      const how = await deliverFile(file.blob, file.filename);
      toast(
        how === 'shared'
          ? 'Lembrete compartilhado — abra-o no seu calendário.'
          : 'Lembrete .ics gerado. Abra o arquivo para adicioná-lo ao calendário.',
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast('Não foi possível gerar o lembrete.', 'error');
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: 'Excluir cápsula',
      message:
        'A carta e os anexos desta cápsula serão apagados. As memórias incluídas permanecem no arquivo.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    await deleteCapsule(capsule.id);
    toast('Cápsula excluída.');
    navigate('/capsulas', { replace: true });
  };

  const sealed = status === 'sealed';

  return (
    <>
      <TopBar
        title={capsule.title || 'Cápsula'}
        actions={
          <button
            type="button"
            className="icon-btn"
            aria-label="Editar cápsula"
            onClick={() => navigate(`/capsula/${capsule.id}/editar`)}
          >
            <Icon name="edit" />
          </button>
        }
      />

      <div className="page stack-lg" style={{ paddingTop: 6 }}>
        <header>
          <div className="eyebrow">
            {status === 'opened' ? 'Aberta' : sealed ? 'Lacrada' : 'Pode ser aberta'}
          </div>
          <h1 className="serif">{capsule.title || 'Cápsula sem título'}</h1>
          <div className="meta-line" style={{ marginTop: 8 }}>
            <Icon name="calendar" size={14} />
            <span>Data de abertura: {formatCivil(capsule.openAt)}</span>
          </div>
          {capsule.openedAt && (
            <div className="meta-line" style={{ marginTop: 4 }}>
              <Icon name="unlock" size={14} />
              <span>Aberta em {formatTimestamp(capsule.openedAt)}</span>
            </div>
          )}
        </header>

        {sealed ? (
          <section className="feature-card center stack">
            <Icon name="lock" size={28} style={{ color: 'var(--accent)', margin: '0 auto' }} />
            <p className="muted small" style={{ maxWidth: '34ch', margin: '0 auto' }}>
              Esta cápsula abre em {days} {days === 1 ? 'dia' : 'dias'}. O conteúdo está guardado
              neste aparelho e fica assim até lá.
            </p>
            <div className="stack" style={{ marginTop: 6 }}>
              <button type="button" className="btn" onClick={() => void reminder()}>
                <Icon name="calendar" size={17} />
                Baixar lembrete de calendário
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => void open(true)}>
                Abrir antes da data
              </button>
            </div>
          </section>
        ) : (
          <>
            {status === 'ready' && !capsule.openedAt && (
              <button type="button" className="btn btn-primary btn-block" onClick={() => void open(false)}>
                <Icon name="unlock" size={18} />
                Marcar como aberta
              </button>
            )}

            {capsule.letter && (
              <section className="card card-pad">
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  Carta
                </div>
                <p
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.05rem',
                    lineHeight: 1.65,
                  }}
                >
                  {capsule.letter}
                </p>
              </section>
            )}

            {own.length > 0 && (
              <section>
                <div className="section-title" style={{ marginTop: 0 }}>
                  <h2>Anexos</h2>
                </div>
                {own.map((att) => (
                  <AttachmentView key={att.id} attachment={att} />
                ))}
              </section>
            )}

            {included.length > 0 && (
              <section>
                <div className="section-title" style={{ marginTop: 0 }}>
                  <h2>Memórias nesta cápsula</h2>
                  <span className="tiny faint">{included.length}</span>
                </div>
                <div className="stack">
                  {included.map((m) => (
                    <MemoryCard
                      key={m.id}
                      memory={m}
                      people={people}
                      categories={categories}
                      attachments={attachments}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <hr className="rule" />

        <button
          type="button"
          className="btn btn-danger btn-block"
          onClick={() => void remove()}
        >
          <Icon name="trash" size={17} />
          Excluir cápsula
        </button>
      </div>
    </>
  );
}
