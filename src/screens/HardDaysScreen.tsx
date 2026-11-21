import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { Icon } from '@/components/Icon';
import { MemoryCard } from '@/components/MemoryCard';
import { MemoryReader } from '@/components/MemoryReader';
import { EmptyState } from '@/components/ui';
import { pickRandom } from '@/utils/id';
import { sortedByOccurrence } from '@/utils/selectors';

export function HardDaysScreen() {
  const { memories, people, categories, attachments } = useArchive();
  const navigate = useNavigate();
  const [current, setCurrent] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);

  const kept = useMemo(
    () => sortedByOccurrence(memories.filter((m) => m.hardDay)),
    [memories],
  );
  const favorites = useMemo(() => memories.filter((m) => m.favorite), [memories]);

  const draw = () => {
    const chosen = pickRandom(kept, seen, (m) => m.id);
    if (!chosen) return;
    setCurrent(chosen.id);
    setSeen((s) => {
      const next = [...s, chosen.id];
      return next.length >= kept.length ? [chosen.id] : next;
    });
  };

  const shown = current ? kept.find((m) => m.id === current) ?? null : null;

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Abrigo</div>
        <h1 className="serif">Para os dias difíceis</h1>
        <p className="lede">
          O que alguém disse, fez ou lembrou — guardado aqui para quando você precisar ler de novo.
        </p>
      </div>

      <div className="page stack-lg">
        {kept.length === 0 ? (
          <EmptyState
            icon="shelter"
            title="Nada guardado aqui ainda"
            description="Ao abrir uma memória, use o ícone de abrigo para marcá-la como algo a reler nos dias difíceis."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/memoria/nova?abrigo=1')}
              >
                <Icon name="plus" size={18} />
                Guardar algo aqui
              </button>
            }
          />
        ) : (
          <>
            <section className="card card-pad stack">
              {shown ? (
                <>
                  <MemoryReader
                    memory={shown}
                    people={people}
                    categories={categories}
                    attachments={attachments}
                  />
                  <div className="row" style={{ marginTop: 4 }}>
                    <button type="button" className="btn" onClick={draw}>
                      <Icon name="shuffle" size={17} />
                      Outra memória
                    </button>
                    <div className="spacer" />
                    <button
                      type="button"
                      className="btn btn-quiet"
                      onClick={() => navigate(`/memoria/${shown.id}`)}
                    >
                      Abrir completa
                    </button>
                  </div>
                </>
              ) : (
                <div className="center stack" style={{ padding: '14px 4px' }}>
                  <p className="muted small" style={{ maxWidth: '36ch', margin: '0 auto' }}>
                    {kept.length} {kept.length === 1 ? 'memória está' : 'memórias estão'} guardadas
                    aqui. Se quiser, deixe o relicário escolher uma.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ alignSelf: 'center' }}
                    onClick={draw}
                  >
                    <Icon name="shelter" size={18} />
                    Abrir uma memória
                  </button>
                </div>
              )}
            </section>

            <section>
              <div className="section-title" style={{ marginTop: 0 }}>
                <h2>Todas as guardadas</h2>
                <span className="tiny faint">{kept.length}</span>
              </div>
              <div className="stack">
                {kept.map((m) => (
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
          </>
        )}

        <section>
          <div className="section-title">
            <h2>Favoritas</h2>
            <Link className="link" to="/memorias?favoritas=1">
              Ver todas
            </Link>
          </div>
          {favorites.length === 0 ? (
            <p className="muted small">
              Nenhuma memória marcada como favorita. A estrela, na memória aberta, serve para isso.
            </p>
          ) : (
            <div className="stack">
              {favorites.slice(0, 3).map((m) => (
                <MemoryCard
                  key={m.id}
                  memory={m}
                  people={people}
                  categories={categories}
                  attachments={attachments}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
