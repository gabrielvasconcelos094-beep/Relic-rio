import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { Icon } from '@/components/Icon';
import { MemoryCard } from '@/components/MemoryCard';
import { EmptyState } from '@/components/ui';
import { formatCivil, greeting, longToday, todayCivil } from '@/utils/date';
import { onThisDay, recentlyAdded } from '@/utils/selectors';
import { snippet } from '@/utils/search';

/** Escolha estável ao longo do dia (muda à meia-noite). */
function memoryOfTheDay<T>(items: T[], seed: string): T | null {
  if (!items.length) return null;
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return items[h % items.length];
}

export function HomeScreen() {
  const { memories, people, categories, attachments } = useArchive();
  const navigate = useNavigate();

  const today = todayCivil();
  const past = useMemo(() => onThisDay(memories), [memories]);
  const recent = useMemo(() => recentlyAdded(memories, 4), [memories]);
  const hardDays = useMemo(() => memories.filter((m) => m.hardDay), [memories]);
  const featured = useMemo(() => memoryOfTheDay(memories, today), [memories, today]);

  const featuredPeople = featured
    ? featured.personIds.map((id) => people.find((p) => p.id === id)?.name).filter(Boolean)
    : [];

  return (
    <>
      <div className="page-head">
        <div className="row">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">Relicário</div>
            <h1 className="serif">{greeting()}</h1>
            <p className="lede">{longToday()}</p>
          </div>
          <Link to="/configuracoes" className="icon-btn" aria-label="Configurações">
            <Icon name="settings" />
          </Link>
        </div>
      </div>

      <div className="page stack-lg">
        {memories.length === 0 ? (
          <EmptyState
            icon="book"
            title="Seu relicário ainda está vazio"
            description="Guarde a primeira palavra, mensagem ou gesto que você não quer esquecer."
            action={
              <Link to="/memoria/nova" className="btn btn-primary">
                <Icon name="plus" size={18} />
                Guardar uma memória
              </Link>
            }
          />
        ) : (
          featured && (
            <section className="feature-card">
              <div className="kicker">Memória do dia</div>
              <h2 className="serif" style={{ marginBottom: 8 }}>
                {featured.title || 'Memória sem título'}
              </h2>
              {featured.text && <blockquote>{snippet(featured.text, 220)}</blockquote>}
              <div className="meta-line" style={{ marginTop: 12 }}>
                <span>{formatCivil(featured.occurredAt, featured.occurredPrecision)}</span>
                {featuredPeople.length > 0 && (
                  <>
                    <span className="sep">·</span>
                    <span>{featuredPeople.join(', ')}</span>
                  </>
                )}
              </div>
              <button
                type="button"
                className="btn btn-sm"
                style={{ marginTop: 14 }}
                onClick={() => navigate(`/memoria/${featured.id}`)}
              >
                Abrir memória
              </button>
            </section>
          )
        )}

        <section className="quick-grid">
          <Link to="/hoje-no-passado" className="quick-tile">
            <Icon name="clock" />
            <strong>Hoje, no passado</strong>
            <span>
              {past.length
                ? `${past.length} ${past.length === 1 ? 'registro' : 'registros'} nesta data`
                : 'Nada registrado nesta data'}
            </span>
          </Link>
          <Link to="/surpreenda" className="quick-tile">
            <Icon name="shuffle" />
            <strong>Surpreenda-me</strong>
            <span>Abrir um registro aleatório do arquivo</span>
          </Link>
          <Link to="/abrigo" className="quick-tile">
            <Icon name="shelter" />
            <strong>Para os dias difíceis</strong>
            <span>
              {hardDays.length
                ? `${hardDays.length} ${hardDays.length === 1 ? 'memória guardada' : 'memórias guardadas'}`
                : 'Nenhuma memória marcada ainda'}
            </span>
          </Link>
          <Link to="/capsulas" className="quick-tile">
            <Icon name="capsule" />
            <strong>Cartas para o futuro</strong>
            <span>Cápsulas para abrir mais adiante</span>
          </Link>
        </section>

        {recent.length > 0 && (
          <section>
            <div className="section-title">
              <h2>Guardado recentemente</h2>
              <Link className="link" to="/memorias">
                Ver tudo
              </Link>
            </div>
            <div className="stack">
              {recent.map((m) => (
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
      </div>

      <button
        type="button"
        className="fab"
        aria-label="Guardar uma memória"
        onClick={() => navigate('/memoria/nova')}
      >
        <Icon name="plus" size={24} />
      </button>
    </>
  );
}
