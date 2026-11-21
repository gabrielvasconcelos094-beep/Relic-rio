import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { TopBar, EmptyState, BlobImage } from '@/components/ui';
import { describeYearsAgo, formatCivil, longToday, yearsAgo } from '@/utils/date';
import { onThisDay } from '@/utils/selectors';
import { snippet } from '@/utils/search';

export function OnThisDayScreen() {
  const { memories, people, attachments } = useArchive();
  const navigate = useNavigate();

  const items = useMemo(() => onThisDay(memories), [memories]);

  return (
    <>
      <TopBar title="Hoje, no passado" />
      <div className="page stack-lg" style={{ paddingTop: 6 }}>
        <p className="muted small">{longToday()}</p>

        {items.length === 0 ? (
          <EmptyState
            icon="clock"
            title="Nada registrado nesta data"
            description="Nenhuma memória do seu arquivo aconteceu neste dia em anos anteriores."
          />
        ) : (
          <div className="stack">
            {items.map((m) => {
              const years = m.occurredAt ? yearsAgo(m.occurredAt) : null;
              const names = m.personIds
                .map((id) => people.find((p) => p.id === id)?.name)
                .filter(Boolean) as string[];
              const thumb = attachments.find((a) => a.ownerId === m.id && a.kind === 'image');
              return (
                <button
                  key={m.id}
                  type="button"
                  className="pressable"
                  onClick={() => navigate(`/memoria/${m.id}`)}
                >
                  <div className="eyebrow" style={{ marginBottom: 6 }}>
                    {years !== null ? describeYearsAgo(years) : 'Em outro ano'}
                  </div>
                  <div className="memory-row">
                    {thumb && <BlobImage blob={thumb.blob} alt="" className="memory-thumb" />}
                    <div className="memory-body">
                      <h3>{m.title || 'Memória sem título'}</h3>
                      <div className="meta-line">
                        <span>{formatCivil(m.occurredAt, m.occurredPrecision)}</span>
                        {names.length > 0 && (
                          <>
                            <span className="sep">·</span>
                            <span>{names.join(', ')}</span>
                          </>
                        )}
                      </div>
                      {m.text && <div className="excerpt">{snippet(m.text, 140)}</div>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
