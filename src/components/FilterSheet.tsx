import type { Category, Person } from '@/db/types';
import { EMPTY_FILTERS, type Filters } from '@/utils/search';
import { Sheet } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (f: Filters) => void;
  people: Person[];
  categories: Category[];
  tags: string[];
  years: number[];
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterSheet({
  open,
  onClose,
  filters,
  onChange,
  people,
  categories,
  tags,
  years,
}: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <Sheet open={open} onClose={onClose} title="Filtros">
      <div className="stack-lg">
        <div className="field">
          <label>Categorias</label>
          <div className="row-wrap">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className="chip chip-toggle"
                aria-pressed={filters.categoryIds.includes(c.id)}
                onClick={() => set({ categoryIds: toggle(filters.categoryIds, c.id) })}
              >
                <span
                  className="chip-dot"
                  style={{ background: `var(--cat-${c.color}, var(--cat-tinta))` }}
                />
                {c.name}
              </button>
            ))}
            {categories.length === 0 && <span className="faint small">Nenhuma categoria.</span>}
          </div>
        </div>

        <div className="field">
          <label>Pessoas</label>
          <div className="row-wrap">
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip chip-toggle"
                aria-pressed={filters.personIds.includes(p.id)}
                onClick={() => set({ personIds: toggle(filters.personIds, p.id) })}
              >
                {p.name}
              </button>
            ))}
            {people.length === 0 && <span className="faint small">Nenhuma pessoa registrada.</span>}
          </div>
        </div>

        <div className="field">
          <label>Tags</label>
          <div className="row-wrap">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                className="chip chip-toggle tag-chip"
                aria-pressed={filters.tags.includes(t)}
                onClick={() => set({ tags: toggle(filters.tags, t) })}
              >
                {t}
              </button>
            ))}
            {tags.length === 0 && <span className="faint small">Nenhuma tag criada.</span>}
          </div>
        </div>

        {years.length > 0 && (
          <div className="field">
            <label>Anos</label>
            <div className="row-wrap">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  className="chip chip-toggle"
                  aria-pressed={filters.years.includes(y)}
                  onClick={() => set({ years: toggle(filters.years, y) })}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="filtro-de">De</label>
            <input
              id="filtro-de"
              type="date"
              className="input"
              value={filters.from}
              onChange={(e) => set({ from: e.target.value })}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="filtro-ate">Até</label>
            <input
              id="filtro-ate"
              type="date"
              className="input"
              value={filters.to}
              onChange={(e) => set({ to: e.target.value })}
            />
          </div>
        </div>

        <div className="row-wrap">
          <button
            type="button"
            className="chip chip-toggle"
            aria-pressed={filters.favoritesOnly}
            onClick={() => set({ favoritesOnly: !filters.favoritesOnly })}
          >
            Somente favoritas
          </button>
          <button
            type="button"
            className="chip chip-toggle"
            aria-pressed={filters.hardDayOnly}
            onClick={() => set({ hardDayOnly: !filters.hardDayOnly })}
          >
            Para os dias difíceis
          </button>
          <button
            type="button"
            className="chip chip-toggle"
            aria-pressed={filters.withImagesOnly}
            onClick={() => set({ withImagesOnly: !filters.withImagesOnly })}
          >
            Com imagens
          </button>
        </div>

        <div className="row">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => onChange({ ...EMPTY_FILTERS, query: filters.query })}
          >
            Limpar filtros
          </button>
          <div className="spacer" />
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Aplicar
          </button>
        </div>
      </div>
    </Sheet>
  );
}
