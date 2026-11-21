import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/MemoryCard';
import { EmptyState } from '@/components/ui';
import { searchPeople } from '@/utils/search';

export function PeopleScreen() {
  const { people, memories, attachments } = useArchive();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    return searchPeople(people, query)
      .map((p) => ({
        person: p,
        count: memories.filter((m) => m.personIds.includes(p.id)).length,
        photo: p.photoId ? attachments.find((a) => a.id === p.photoId) ?? null : null,
      }))
      .sort((a, b) => a.person.name.localeCompare(b.person.name, 'pt-BR'));
  }, [people, memories, attachments, query]);

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Arquivo</div>
        <h1 className="serif">Pessoas</h1>
        <p className="lede">
          {people.length} {people.length === 1 ? 'pessoa registrada' : 'pessoas registradas'}
        </p>
      </div>

      <div className="page stack">
        {people.length > 0 && (
          <input
            className="input"
            type="search"
            placeholder="Buscar pessoa"
            aria-label="Buscar pessoa"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}

        {people.length === 0 ? (
          <EmptyState
            icon="people"
            title="Nenhuma pessoa registrada"
            description="Crie um perfil para quem deixou palavras, gestos e momentos no seu arquivo."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/pessoa/nova')}
              >
                <Icon name="plus" size={18} />
                Adicionar pessoa
              </button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState icon="search" title="Nenhuma pessoa encontrada" />
        ) : (
          <div className="stack">
            {rows.map(({ person, count, photo }) => (
              <button
                key={person.id}
                type="button"
                className="pressable"
                onClick={() => navigate(`/pessoa/${person.id}`)}
              >
                <div className="row">
                  <Avatar person={person} photo={photo} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '1rem' }}>{person.name}</h3>
                    <div className="meta-line">
                      <span>
                        {count} {count === 1 ? 'registro' : 'registros'}
                      </span>
                      {person.description && (
                        <>
                          <span className="sep">·</span>
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {person.description}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Icon name="forward" size={16} style={{ color: 'var(--ink-faint)' }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className="fab"
        aria-label="Adicionar pessoa"
        onClick={() => navigate('/pessoa/nova')}
      >
        <Icon name="plus" size={24} />
      </button>
    </>
  );
}
