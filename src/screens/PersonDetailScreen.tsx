import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { Icon } from '@/components/Icon';
import { TopBar, EmptyState, Sheet } from '@/components/ui';
import { Avatar, MemoryCard } from '@/components/MemoryCard';
import { formatCivil } from '@/utils/date';
import { groupForTimeline } from '@/utils/selectors';
import { MONTHS_PT } from '@/utils/date';
import { createBackup, deliverFile } from '@/utils/backup';

type Lens = 'tudo' | 'mensagens' | 'fotos' | 'presentes' | 'momentos';

const LENSES: { key: Lens; label: string }[] = [
  { key: 'tudo', label: 'Tudo' },
  { key: 'mensagens', label: 'Mensagens' },
  { key: 'fotos', label: 'Fotografias' },
  { key: 'presentes', label: 'Presentes' },
  { key: 'momentos', label: 'Momentos' },
];

export function PersonDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, confirm } = useUi();
  const archive = useArchive();
  const { people, memories, categories, attachments, deletePerson } = archive;
  const [lens, setLens] = useState<Lens>('tudo');
  const [menu, setMenu] = useState(false);

  const person = people.find((p) => p.id === id);

  const related = useMemo(
    () => (person ? memories.filter((m) => m.personIds.includes(person.id)) : []),
    [memories, person],
  );

  const imageOwners = useMemo(
    () => new Set(attachments.filter((a) => a.kind === 'image').map((a) => a.ownerId)),
    [attachments],
  );

  const counts = useMemo(() => {
    const gift = categories.find((c) => c.name.toLowerCase() === 'presentes')?.id;
    const moment = categories.find((c) => c.name.toLowerCase() === 'momentos especiais')?.id;
    return {
      total: related.length,
      messages: related.filter((m) => m.text.trim().length > 0).length,
      photos: related.filter((m) => imageOwners.has(m.id)).length,
      gifts: gift ? related.filter((m) => m.categoryIds.includes(gift)).length : 0,
      moments: moment ? related.filter((m) => m.categoryIds.includes(moment)).length : 0,
      giftId: gift,
      momentId: moment,
    };
  }, [related, categories, imageOwners]);

  const visible = useMemo(() => {
    switch (lens) {
      case 'mensagens':
        return related.filter((m) => m.text.trim().length > 0);
      case 'fotos':
        return related.filter((m) => imageOwners.has(m.id));
      case 'presentes':
        return counts.giftId ? related.filter((m) => m.categoryIds.includes(counts.giftId!)) : [];
      case 'momentos':
        return counts.momentId
          ? related.filter((m) => m.categoryIds.includes(counts.momentId!))
          : [];
      default:
        return related;
    }
  }, [lens, related, imageOwners, counts.giftId, counts.momentId]);

  const timeline = useMemo(() => groupForTimeline(visible), [visible]);

  if (!person) {
    return (
      <>
        <TopBar title="Pessoa" />
        <div className="page">
          <p className="muted" style={{ marginTop: 24 }}>
            Este perfil não está mais no arquivo.
          </p>
        </div>
      </>
    );
  }

  const photo = person.photoId ? attachments.find((a) => a.id === person.photoId) ?? null : null;

  const remove = async () => {
    const ok = await confirm({
      title: 'Excluir pessoa',
      message: `O perfil de ${person.name} será apagado. As ${related.length} memórias associadas permanecem no arquivo, apenas sem o vínculo.`,
      confirmLabel: 'Excluir perfil',
      destructive: true,
    });
    if (!ok) return;
    await deletePerson(person.id);
    toast('Perfil excluído.');
    navigate('/pessoas', { replace: true });
  };

  const exportPerson = async () => {
    setMenu(false);
    try {
      const result = await createBackup(archive.snapshot(), {
        label: person.name,
        subset: { memories: related, people: [person], capsules: [], collections: [] },
      });
      const how = await deliverFile(result.blob, result.filename);
      toast(
        how === 'shared'
          ? 'Arquivo compartilhado.'
          : `${result.filename} — ${result.verification.message}`,
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast(err instanceof Error ? err.message : 'Não foi possível exportar.', 'error');
    }
  };

  return (
    <>
      <TopBar
        title={person.name}
        actions={
          <>
            <button
              type="button"
              className="icon-btn"
              aria-label="Editar perfil"
              onClick={() => navigate(`/pessoa/${person.id}/editar`)}
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
        <header className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
          <Avatar person={person} photo={photo} large />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="serif">{person.name}</h1>
            {person.description && <p className="muted small">{person.description}</p>}
            {person.metAt && (
              <div className="meta-line" style={{ marginTop: 4 }}>
                <Icon name="calendar" size={13} />
                <span>Conheci em {formatCivil(person.metAt)}</span>
              </div>
            )}
          </div>
        </header>

        {person.tags.length > 0 && (
          <div className="row-wrap">
            {person.tags.map((t) => (
              <span key={t} className="chip tag-chip">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="stat-grid">
          <div className="stat-tile">
            <div className="value">{counts.total}</div>
            <div className="label">Registros associados</div>
          </div>
          <div className="stat-tile">
            <div className="value">{counts.messages}</div>
            <div className="label">Mensagens e palavras</div>
          </div>
          <div className="stat-tile">
            <div className="value">{counts.photos}</div>
            <div className="label">Com fotografias</div>
          </div>
          <div className="stat-tile">
            <div className="value">{counts.gifts}</div>
            <div className="label">Presentes</div>
          </div>
        </div>

        {person.notes && (
          <section className="card card-pad">
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              Anotações pessoais
            </div>
            <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
              {person.notes}
            </p>
          </section>
        )}

        <div>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Linha do tempo</h2>
            <button
              type="button"
              className="link"
              onClick={() => navigate(`/memoria/nova?pessoa=${person.id}`)}
            >
              Guardar algo
            </button>
          </div>

          <div className="row-wrap" style={{ marginBottom: 12 }}>
            {LENSES.map((l) => (
              <button
                key={l.key}
                type="button"
                className="chip chip-toggle"
                aria-pressed={lens === l.key}
                onClick={() => setLens(l.key)}
              >
                {l.label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon="archive"
              title={related.length === 0 ? 'Nenhum registro ainda' : 'Nada nesta seleção'}
              description={
                related.length === 0
                  ? `Guarde a primeira palavra, foto ou gesto de ${person.name}.`
                  : undefined
              }
              action={
                related.length === 0 ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate(`/memoria/nova?pessoa=${person.id}`)}
                  >
                    <Icon name="plus" size={18} />
                    Guardar memória
                  </button>
                ) : undefined
              }
            />
          ) : (
            timeline.map((group) => (
              <section key={group.year ?? 'sem-data'}>
                <h2 className="timeline-year">{group.year ?? 'Sem data'}</h2>
                {group.months.map((m) => (
                  <div key={m.month ?? 'sem-mes'}>
                    <div className="timeline-month">
                      {m.month ? MONTHS_PT[m.month - 1] : 'Mês não informado'}
                    </div>
                    <div className="timeline-track">
                      {m.items.map((memory) => (
                        <div key={memory.id} className="timeline-item">
                          <MemoryCard
                            memory={memory}
                            people={people}
                            categories={categories}
                            attachments={attachments}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ))
          )}
        </div>
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Ações">
        <div className="list-divided">
          <button
            type="button"
            className="link-row"
            onClick={() => {
              setMenu(false);
              navigate(`/pessoa/${person.id}/editar`);
            }}
          >
            <Icon name="edit" />
            <span className="label">
              <strong>Editar perfil</strong>
            </span>
          </button>
          <button type="button" className="link-row" onClick={() => void exportPerson()}>
            <Icon name="download" />
            <span className="label">
              <strong>Exportar dados desta pessoa</strong>
              <span>Perfil, registros associados e anexos</span>
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
              <strong>Excluir perfil</strong>
              <span>As memórias associadas permanecem</span>
            </span>
          </button>
        </div>
      </Sheet>
    </>
  );
}
