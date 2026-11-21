import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { Icon } from '@/components/Icon';
import { TopBar, EmptyState } from '@/components/ui';
import { capsuleStatus } from '@/utils/selectors';
import { daysUntil, formatCivil } from '@/utils/date';

const STATUS_LABEL = {
  sealed: 'Lacrada',
  ready: 'Pode ser aberta',
  opened: 'Aberta',
} as const;

export function CapsulesScreen() {
  const { capsules } = useArchive();
  const navigate = useNavigate();

  const rows = useMemo(
    () =>
      [...capsules]
        .map((c) => ({ capsule: c, status: capsuleStatus(c) }))
        .sort((a, b) => {
          const order = { ready: 0, sealed: 1, opened: 2 };
          return order[a.status] - order[b.status] || a.capsule.openAt.localeCompare(b.capsule.openAt);
        }),
    [capsules],
  );

  return (
    <>
      <TopBar
        title="Cartas para o futuro"
        actions={
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => navigate('/capsula/nova')}
          >
            <Icon name="plus" size={16} />
            Nova
          </button>
        }
      />

      <div className="page stack-lg" style={{ paddingTop: 6 }}>
        <p className="muted small">
          Escreva para si mesmo, reúna memórias e defina uma data para reabrir. A cápsula fica neste
          aparelho até lá.
        </p>

        {rows.length === 0 ? (
          <EmptyState
            icon="capsule"
            title="Nenhuma cápsula criada"
            description="Uma carta para o seu eu futuro, com as memórias que você quiser levar junto."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/capsula/nova')}
              >
                <Icon name="plus" size={18} />
                Criar cápsula
              </button>
            }
          />
        ) : (
          <div className="stack">
            {rows.map(({ capsule, status }) => {
              const days = daysUntil(capsule.openAt);
              return (
                <button
                  key={capsule.id}
                  type="button"
                  className="pressable"
                  onClick={() => navigate(`/capsula/${capsule.id}`)}
                >
                  <div className="row">
                    <span
                      className="memory-thumb"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon
                        name={status === 'sealed' ? 'lock' : status === 'ready' ? 'unlock' : 'letter'}
                        style={{
                          color:
                            status === 'ready' ? 'var(--terracotta)' : 'var(--ink-faint)',
                        }}
                      />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '1rem' }}>{capsule.title || 'Cápsula sem título'}</h3>
                      <div className="meta-line">
                        <span>{STATUS_LABEL[status]}</span>
                        <span className="sep">·</span>
                        <span>
                          {status === 'sealed' && days !== null && days > 0
                            ? `abre em ${days} ${days === 1 ? 'dia' : 'dias'}`
                            : formatCivil(capsule.openAt)}
                        </span>
                        {capsule.memoryIds.length > 0 && (
                          <>
                            <span className="sep">·</span>
                            <span>
                              {capsule.memoryIds.length}{' '}
                              {capsule.memoryIds.length === 1 ? 'memória' : 'memórias'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Icon name="forward" size={16} style={{ color: 'var(--ink-faint)' }} />
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
