import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { Icon } from '@/components/Icon';
import { MemoryCard } from '@/components/MemoryCard';
import { EmptyState, BlobImage } from '@/components/ui';
import { FilterSheet } from '@/components/FilterSheet';
import { Lightbox } from '@/components/Lightbox';
import { EMPTY_FILTERS, applyFilters, filtersActive, type Filters } from '@/utils/search';
import { galleryEntries, groupForTimeline } from '@/utils/selectors';
import { MONTHS_PT, parseCivil } from '@/utils/date';

type View = 'lista' | 'linha' | 'galeria';

export function MemoriesScreen() {
  const { memories, people, categories, attachments, allTags } = useArchive();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const initialView = (params.get('ver') as View) || 'lista';
  const [view, setView] = useState<View>(
    ['lista', 'linha', 'galeria'].includes(initialView) ? initialView : 'lista',
  );
  const [filters, setFilters] = useState<Filters>(() => ({
    ...EMPTY_FILTERS,
    categoryIds: params.get('categoria') ? [params.get('categoria')!] : [],
    tags: params.get('tag') ? [params.get('tag')!] : [],
    personIds: params.get('pessoa') ? [params.get('pessoa')!] : [],
    favoritesOnly: params.get('favoritas') === '1',
  }));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const m of memories) {
      const p = m.occurredAt ? parseCivil(m.occurredAt) : null;
      if (p) set.add(p.year);
    }
    return [...set].sort((a, b) => b - a);
  }, [memories]);

  const results = useMemo(
    () => applyFilters(memories, filters, { people, categories, attachments }),
    [memories, filters, people, categories, attachments],
  );

  const timeline = useMemo(() => groupForTimeline(results), [results]);
  const gallery = useMemo(() => galleryEntries(results, attachments), [results, attachments]);
  const active = filtersActive(filters);

  const changeView = (next: View) => {
    setView(next);
    const p = new URLSearchParams(params);
    p.set('ver', next);
    setParams(p, { replace: true });
  };

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Arquivo</div>
        <h1 className="serif">Memórias</h1>
        <p className="lede">
          {results.length} {results.length === 1 ? 'registro' : 'registros'}
          {active > 0 ? ` · ${active} ${active === 1 ? 'filtro' : 'filtros'}` : ''}
        </p>
      </div>

      <div className="page stack">
        <div className="row">
          <div style={{ flex: 1, position: 'relative' }}>
            <Icon
              name="search"
              size={17}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-faint)',
                pointerEvents: 'none',
              }}
            />
            <input
              className="input"
              type="search"
              placeholder="Buscar por palavra, pessoa, tag…"
              aria-label="Buscar memórias"
              value={filters.query}
              style={{ paddingLeft: 38 }}
              onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            />
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Filtros"
            onClick={() => setSheetOpen(true)}
            style={active ? { color: 'var(--accent)' } : undefined}
          >
            <Icon name="filter" />
          </button>
        </div>

        <div className="segmented" role="group" aria-label="Modo de visualização">
          <button type="button" aria-pressed={view === 'lista'} onClick={() => changeView('lista')}>
            Lista
          </button>
          <button type="button" aria-pressed={view === 'linha'} onClick={() => changeView('linha')}>
            Linha do tempo
          </button>
          <button
            type="button"
            aria-pressed={view === 'galeria'}
            onClick={() => changeView('galeria')}
          >
            Galeria
          </button>
        </div>

        {active > 0 && (
          <div className="row-wrap">
            {filters.categoryIds.map((id) => (
              <span key={id} className="chip">
                {categories.find((c) => c.id === id)?.name ?? 'Categoria'}
              </span>
            ))}
            {filters.personIds.map((id) => (
              <span key={id} className="chip">
                {people.find((p) => p.id === id)?.name ?? 'Pessoa'}
              </span>
            ))}
            {filters.tags.map((t) => (
              <span key={t} className="chip tag-chip">
                {t}
              </span>
            ))}
            {filters.years.map((y) => (
              <span key={y} className="chip">
                {y}
              </span>
            ))}
            {filters.favoritesOnly && <span className="chip">Favoritas</span>}
            {filters.hardDayOnly && <span className="chip">Dias difíceis</span>}
            {filters.withImagesOnly && <span className="chip">Com imagens</span>}
            <button
              type="button"
              className="chip"
              onClick={() => setFilters({ ...EMPTY_FILTERS })}
              style={{ color: 'var(--accent)' }}
            >
              Limpar
            </button>
          </div>
        )}

        {results.length === 0 ? (
          <EmptyState
            icon={memories.length ? 'search' : 'archive'}
            title={memories.length ? 'Nenhum registro encontrado' : 'Nenhuma memória guardada'}
            description={
              memories.length
                ? 'Ajuste a busca ou limpe os filtros para ver outros registros.'
                : 'Comece guardando uma mensagem, uma foto ou um gesto que você quer preservar.'
            }
            action={
              memories.length ? undefined : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate('/memoria/nova')}
                >
                  <Icon name="plus" size={18} />
                  Guardar uma memória
                </button>
              )
            }
          />
        ) : view === 'lista' ? (
          <div className="stack" style={{ marginTop: 4 }}>
            {results.map((m) => (
              <MemoryCard
                key={m.id}
                memory={m}
                people={people}
                categories={categories}
                attachments={attachments}
              />
            ))}
          </div>
        ) : view === 'linha' ? (
          <div>
            {timeline.map((group) => (
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
            ))}
          </div>
        ) : gallery.length === 0 ? (
          <EmptyState
            icon="image"
            title="Nenhuma imagem"
            description="As fotografias e capturas de tela anexadas às memórias aparecem aqui."
          />
        ) : (
          <div className="gallery-grid" style={{ marginTop: 4 }}>
            {gallery.map((entry, i) => (
              <button
                key={entry.attachment.id}
                type="button"
                className="gallery-cell"
                aria-label={entry.memory.title || 'Imagem'}
                onClick={() => setLightbox(i)}
              >
                <BlobImage blob={entry.attachment.blob} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={setFilters}
        people={people}
        categories={categories}
        tags={allTags}
        years={years}
      />

      {lightbox !== null && (
        <Lightbox
          entries={gallery}
          index={lightbox}
          onIndexChange={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}

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
