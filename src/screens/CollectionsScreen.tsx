import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { Icon } from '@/components/Icon';
import { EmptyState, BlobImage, TopBar } from '@/components/ui';
import { searchCollections } from '@/utils/search';

export function CollectionsScreen() {
  const { collections, memories, attachments } = useArchive();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const rows = useMemo(
    () =>
      searchCollections(collections, query).map((c) => ({
        collection: c,
        count: memories.filter((m) => m.collectionIds.includes(c.id)).length,
        cover: c.coverId ? (attachments.find((a) => a.id === c.coverId) ?? null) : null,
      })),
    [collections, memories, attachments, query],
  );

  return (
    <>
      <TopBar
        title="Coleções"
        actions={
          <button type="button" className="btn btn-sm" onClick={() => navigate('/colecao/nova')}>
            <Icon name="plus" size={16} />
            Nova
          </button>
        }
      />

      <div className="page stack" style={{ paddingTop: 6 }}>
        <p className="muted small">
          Categorias dizem o que uma memória é. Coleções reúnem memórias por um significado que é
          seu: um período, um tema, um conjunto que faz sentido junto.
        </p>

        {collections.length > 2 && (
          <input
            className="input"
            type="search"
            placeholder="Buscar coleção"
            aria-label="Buscar coleção"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}

        {collections.length === 0 ? (
          <EmptyState
            icon="book"
            title="Nenhuma coleção ainda"
            description="“Coisas bonitas que me disseram”, “meu período na universidade”, “cartas que recebi”. Você decide o recorte."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/colecao/nova')}
              >
                <Icon name="plus" size={18} />
                Criar coleção
              </button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState icon="search" title="Nenhuma coleção encontrada" />
        ) : (
          <div className="stack">
            {rows.map(({ collection, count, cover }) => (
              <button
                key={collection.id}
                type="button"
                className="collection-card"
                onClick={() => navigate(`/colecao/${collection.id}`)}
              >
                <div
                  className="collection-cover"
                  style={
                    cover
                      ? undefined
                      : {
                          background: `color-mix(in srgb, var(--cat-${collection.color}, var(--accent)) 16%, var(--paper-sunken))`,
                        }
                  }
                >
                  {cover ? (
                    <BlobImage blob={cover.blob} alt="" />
                  ) : (
                    <Icon
                      name={collection.icon}
                      size={26}
                      style={{ color: `var(--cat-${collection.color}, var(--accent))` }}
                    />
                  )}
                </div>
                <div className="collection-body">
                  <h3 style={{ fontSize: '1rem' }}>{collection.name}</h3>
                  {collection.description && (
                    <p className="small muted" style={{ marginTop: 2 }}>
                      {collection.description}
                    </p>
                  )}
                  <div className="meta-line" style={{ marginTop: 6 }}>
                    <span>
                      {count} {count === 1 ? 'memória' : 'memórias'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
