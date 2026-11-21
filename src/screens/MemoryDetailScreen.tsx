import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { Icon } from '@/components/Icon';
import { TopBar, Sheet } from '@/components/ui';
import { CategoryChip } from '@/components/MemoryCard';
import { AttachmentView } from '@/components/Attachments';
import { formatCivil, formatTimestamp } from '@/utils/date';
import { deliverFile, exportMemoryBundle } from '@/utils/backup';

export function MemoryDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, confirm } = useUi();
  const {
    memories,
    people,
    categories,
    attachments,
    toggleFavorite,
    toggleHardDay,
    deleteMemory,
  } = useArchive();
  const [menu, setMenu] = useState(false);

  const memory = memories.find((m) => m.id === id);

  if (!memory) {
    return (
      <>
        <TopBar title="Memória" />
        <div className="page">
          <p className="muted" style={{ marginTop: 24 }}>
            Esta memória não está mais no arquivo.
          </p>
        </div>
      </>
    );
  }

  const own = attachments.filter((a) => a.ownerId === memory.id);
  const linkedPeople = memory.personIds
    .map((pid) => people.find((p) => p.id === pid))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const cats = memory.categoryIds
    .map((cid) => categories.find((c) => c.id === cid))
    .filter((c): c is NonNullable<typeof c> => !!c);

  const remove = async () => {
    const ok = await confirm({
      title: 'Excluir memória',
      message:
        'Este registro e seus anexos serão apagados definitivamente deste aparelho. Não é possível desfazer.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    await deleteMemory(memory.id);
    toast('Memória excluída.');
    navigate('/memorias', { replace: true });
  };

  const exportOne = async () => {
    try {
      const { blob, filename } = await exportMemoryBundle(memory, people, categories, attachments);
      const how = await deliverFile(blob, filename);
      toast(how === 'shared' ? 'Memória compartilhada.' : `Arquivo gerado: ${filename}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast(err instanceof Error ? err.message : 'Não foi possível exportar.', 'error');
    } finally {
      setMenu(false);
    }
  };

  return (
    <>
      <TopBar
        title=""
        bordered={false}
        actions={
          <>
            <button
              type="button"
              className={memory.favorite ? 'icon-btn active' : 'icon-btn'}
              aria-label={memory.favorite ? 'Remover dos favoritos' : 'Marcar como favorita'}
              aria-pressed={memory.favorite}
              onClick={() => void toggleFavorite(memory.id)}
            >
              <Icon name="star" />
            </button>
            <button
              type="button"
              className={memory.hardDay ? 'icon-btn active' : 'icon-btn'}
              aria-label={
                memory.hardDay
                  ? 'Remover de Para os dias difíceis'
                  : 'Guardar para os dias difíceis'
              }
              aria-pressed={memory.hardDay}
              onClick={() => void toggleHardDay(memory.id)}
            >
              <Icon name="shelter" />
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

      <article className="page stack-lg" style={{ paddingTop: 6 }}>
        <header>
          <h1 className="serif">{memory.title || 'Memória sem título'}</h1>
          <div className="meta-line" style={{ marginTop: 8 }}>
            <Icon name="calendar" size={14} />
            <span>{formatCivil(memory.occurredAt, memory.occurredPrecision)}</span>
          </div>
          <div className="meta-line" style={{ marginTop: 4 }}>
            <Icon name="archive" size={14} />
            <span>Guardado em {formatTimestamp(memory.createdAt)}</span>
          </div>
        </header>

        {(linkedPeople.length > 0 || cats.length > 0 || memory.tags.length > 0) && (
          <div className="row-wrap">
            {linkedPeople.map((p) => (
              <Link key={p.id} to={`/pessoa/${p.id}`} className="chip" style={{ textDecoration: 'none' }}>
                <Icon name="people" size={13} />
                {p.name}
              </Link>
            ))}
            {cats.map((c) => (
              <CategoryChip key={c.id} category={c} />
            ))}
            {memory.tags.map((t) => (
              <Link
                key={t}
                to={`/memorias?tag=${encodeURIComponent(t)}`}
                className="chip tag-chip"
                style={{ textDecoration: 'none' }}
              >
                {t}
              </Link>
            ))}
          </div>
        )}

        {memory.text && (
          <section className="card card-pad">
            <p style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-display)', fontSize: '1.05rem', lineHeight: 1.62 }}>
              {memory.text}
            </p>
          </section>
        )}

        {own.length > 0 && (
          <section>
            <div className="section-title" style={{ marginTop: 0 }}>
              <h2>Anexos</h2>
              <span className="tiny faint">{own.length}</span>
            </div>
            {own.map((att) => (
              <AttachmentView key={att.id} attachment={att} />
            ))}
          </section>
        )}

        {memory.feeling && (
          <section>
            <div className="section-title" style={{ marginTop: 0 }}>
              <h2>Como isso me fez sentir</h2>
            </div>
            <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
              {memory.feeling}
            </p>
          </section>
        )}

        {memory.context && (
          <section>
            <div className="section-title" style={{ marginTop: 0 }}>
              <h2>Contexto</h2>
            </div>
            <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
              {memory.context}
            </p>
          </section>
        )}

        <div className="row">
          <button
            type="button"
            className="btn btn-block"
            onClick={() => navigate(`/memoria/${memory.id}/editar`)}
          >
            <Icon name="edit" size={18} />
            Editar
          </button>
        </div>
      </article>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Ações">
        <div className="list-divided">
          <button
            type="button"
            className="link-row"
            onClick={() => {
              setMenu(false);
              navigate(`/memoria/${memory.id}/editar`);
            }}
          >
            <Icon name="edit" />
            <span className="label">
              <strong>Editar memória</strong>
            </span>
          </button>
          <button type="button" className="link-row" onClick={() => void exportOne()}>
            <Icon name="download" />
            <span className="label">
              <strong>Exportar esta memória</strong>
              <span>Arquivo .zip com o texto e os anexos</span>
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
              <strong>Excluir memória</strong>
            </span>
          </button>
        </div>
      </Sheet>
    </>
  );
}
