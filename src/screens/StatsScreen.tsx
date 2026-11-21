import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { computeStats, formatBytes } from '@/utils/stats';

function BarList({
  items,
  total,
}: {
  items: { key: string; label: string; count: number; color?: string }[];
  total: number;
}) {
  if (!items.length) return <p className="muted small">Nada registrado ainda.</p>;
  return (
    <div>
      {items.map((item) => (
        <div key={item.key} className="bar-row">
          <div className="bar-head">
            <span>{item.label}</span>
            <span className="faint">{item.count}</span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${total ? Math.max(2, (item.count / total) * 100) : 0}%`,
                background: item.color ? `var(--cat-${item.color}, var(--accent))` : 'var(--accent)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsScreen() {
  const { memories, people, categories, attachments, capsules } = useArchive();
  const stats = useMemo(
    () => computeStats(memories, people, categories, attachments, capsules),
    [memories, people, categories, attachments, capsules],
  );

  const maxYear = Math.max(1, ...stats.byYear.map((y) => y.count));
  const usedCategories = stats.byCategory.filter((c) => c.count > 0);
  const activePeople = stats.byPerson.filter((p) => p.count > 0).slice(0, 8);

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Arquivo</div>
        <h1 className="serif">Estatísticas</h1>
        <p className="lede">
          Uma visão do que o seu relicário já guarda. Serve para explorar, não para comparar.
        </p>
      </div>

      <div className="page stack-lg">
        {memories.length === 0 ? (
          <EmptyState
            icon="chart"
            title="Nada a contar ainda"
            description="As estatísticas são calculadas a partir das memórias guardadas."
          />
        ) : (
          <>
            <section className="stat-grid">
              <div className="stat-tile">
                <div className="value">{stats.totalMemories}</div>
                <div className="label">Memórias</div>
              </div>
              <div className="stat-tile">
                <div className="value">{stats.totalPeople}</div>
                <div className="label">Pessoas</div>
              </div>
              <div className="stat-tile">
                <div className="value">{stats.photos}</div>
                <div className="label">Fotografias</div>
              </div>
              <div className="stat-tile">
                <div className="value">{stats.textMemories}</div>
                <div className="label">Mensagens em texto</div>
              </div>
              <div className="stat-tile">
                <div className="value">{stats.documents}</div>
                <div className="label">Documentos e PDFs</div>
              </div>
              <div className="stat-tile">
                <div className="value">{stats.audios}</div>
                <div className="label">Áudios</div>
              </div>
              <div className="stat-tile">
                <div className="value">{stats.videos}</div>
                <div className="label">Vídeos</div>
              </div>
              <div className="stat-tile">
                <div className="value">{stats.capsules}</div>
                <div className="label">Cápsulas</div>
              </div>
            </section>

            <section className="card card-pad">
              <div className="row">
                <Icon name="star" size={17} style={{ color: 'var(--terracotta)' }} />
                <span className="small" style={{ flex: 1 }}>
                  Favoritas
                </span>
                <strong>{stats.favorites}</strong>
              </div>
              <hr className="rule" style={{ margin: '12px 0' }} />
              <div className="row">
                <Icon name="shelter" size={17} style={{ color: 'var(--sage)' }} />
                <span className="small" style={{ flex: 1 }}>
                  Para os dias difíceis
                </span>
                <strong>{stats.hardDays}</strong>
              </div>
              <hr className="rule" style={{ margin: '12px 0' }} />
              <div className="row">
                <Icon name="file" size={17} />
                <span className="small" style={{ flex: 1 }}>
                  Anexos guardados
                </span>
                <strong>
                  {stats.totalAttachments} · {formatBytes(stats.bytes)}
                </strong>
              </div>
            </section>

            {stats.byYear.length > 0 && (
              <section>
                <div className="section-title" style={{ marginTop: 0 }}>
                  <h2>Memórias por ano</h2>
                  <span className="tiny faint">
                    {stats.firstYear} – {stats.lastYear}
                  </span>
                </div>
                <div className="year-chart" role="img" aria-label="Memórias por ano">
                  {stats.byYear.map((y) => (
                    <div key={y.year} className="year-col" title={`${y.year}: ${y.count}`}>
                      <span className="tick">{y.count}</span>
                      <div
                        className="col"
                        style={{ height: `${Math.max(3, (y.count / maxYear) * 86)}px` }}
                      />
                      <span className="tick">{String(y.year).slice(2)}</span>
                    </div>
                  ))}
                </div>
                {stats.withoutDate > 0 && (
                  <p className="tiny faint" style={{ marginTop: 8 }}>
                    {stats.withoutDate}{' '}
                    {stats.withoutDate === 1 ? 'registro sem data' : 'registros sem data'} não
                    aparecem neste gráfico.
                  </p>
                )}
              </section>
            )}

            <section>
              <div className="section-title" style={{ marginTop: 0 }}>
                <h2>Por categoria</h2>
                <Link className="link" to="/configuracoes/categorias">
                  Gerenciar
                </Link>
              </div>
              <BarList
                total={stats.totalMemories}
                items={usedCategories.map((c) => ({
                  key: c.id,
                  label: c.name,
                  count: c.count,
                  color: c.color,
                }))}
              />
            </section>

            <section>
              <div className="section-title" style={{ marginTop: 0 }}>
                <h2>Por pessoa</h2>
                <Link className="link" to="/pessoas">
                  Ver pessoas
                </Link>
              </div>
              <BarList
                total={stats.totalMemories}
                items={activePeople.map((p) => ({ key: p.id, label: p.name, count: p.count }))}
              />
              {stats.topPerson && (
                <p className="tiny faint" style={{ marginTop: 6 }}>
                  Mais registros associados: {stats.topPerson.name} ({stats.topPerson.count}).
                </p>
              )}
            </section>
          </>
        )}

        <section>
          <div className="section-title">
            <h2>Arquivo</h2>
          </div>
          <div className="card card-pad list-divided">
            <Link to="/capsulas" className="link-row">
              <Icon name="capsule" />
              <span className="label">
                <strong>Cartas para o futuro</strong>
                <span>Cápsulas de memórias com data de abertura</span>
              </span>
              <Icon name="forward" />
            </Link>
            <Link to="/configuracoes/backup" className="link-row">
              <Icon name="download" />
              <span className="label">
                <strong>Backup e exportação</strong>
                <span>Gerar, conferir e restaurar o arquivo</span>
              </span>
              <Icon name="forward" />
            </Link>
            <Link to="/configuracoes" className="link-row">
              <Icon name="settings" />
              <span className="label">
                <strong>Configurações</strong>
              </span>
              <Icon name="forward" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
