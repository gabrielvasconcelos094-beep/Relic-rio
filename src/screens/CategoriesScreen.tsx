import { useMemo, useState } from 'react';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { Icon, CATEGORY_ICON_MAP } from '@/components/Icon';
import { TopBar, Sheet } from '@/components/ui';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/db/defaults';
import type { Category } from '@/db/types';
import { newId } from '@/utils/id';

export function CategoriesScreen() {
  const { categories, memories, saveCategory, deleteCategory } = useArchive();
  const { toast, confirm } = useUi();
  const [editing, setEditing] = useState<Category | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categories) {
      map.set(c.id, memories.filter((m) => m.categoryIds.includes(c.id)).length);
    }
    return map;
  }, [categories, memories]);

  const startNew = () =>
    setEditing({
      id: newId('cat'),
      name: '',
      color: 'salvia',
      icon: 'folha',
      builtin: false,
      order: categories.length,
    });

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast('Dê um nome à categoria.', 'error');
      return;
    }
    await saveCategory({ ...editing, name: editing.name.trim() });
    setEditing(null);
    toast('Categoria guardada.');
  };

  const remove = async (category: Category) => {
    const count = counts.get(category.id) ?? 0;
    const ok = await confirm({
      title: 'Remover categoria',
      message: count
        ? `“${category.name}” será removida de ${count} ${count === 1 ? 'registro' : 'registros'}. As memórias permanecem no arquivo.`
        : `“${category.name}” será removida.`,
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;
    await deleteCategory(category.id);
    toast('Categoria removida.');
  };

  return (
    <>
      <TopBar
        title="Categorias"
        actions={
          <button type="button" className="btn btn-sm" onClick={startNew}>
            <Icon name="plus" size={16} />
            Nova
          </button>
        }
      />

      <div className="page stack" style={{ paddingTop: 6 }}>
        <p className="muted small">
          As categorias organizam o arquivo. Uma memória pode pertencer a mais de uma.
        </p>

        <div className="card card-pad list-divided">
          {categories.map((c) => (
            <div key={c.id} className="link-row">
              <Icon
                name={CATEGORY_ICON_MAP[c.icon] ?? 'archive'}
                style={{ color: `var(--cat-${c.color}, var(--cat-tinta))` }}
              />
              <span className="label">
                <strong>{c.name}</strong>
                <span>
                  {counts.get(c.id) ?? 0} {(counts.get(c.id) ?? 0) === 1 ? 'registro' : 'registros'}
                  {c.builtin ? ' · categoria inicial' : ''}
                </span>
              </span>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Editar ${c.name}`}
                onClick={() => setEditing({ ...c })}
              >
                <Icon name="edit" size={18} />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remover ${c.name}`}
                onClick={() => void remove(c)}
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.name ? 'Editar categoria' : 'Nova categoria'}
      >
        {editing && (
          <div className="stack-lg">
            <div className="field">
              <label htmlFor="cat-nome">Nome</label>
              <input
                id="cat-nome"
                className="input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Cor</label>
              <div className="row-wrap">
                {Object.entries(CATEGORY_COLORS).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    className="chip chip-toggle"
                    aria-pressed={editing.color === key}
                    onClick={() => setEditing({ ...editing, color: key })}
                  >
                    <span className="chip-dot" style={{ background: `var(${meta.token})` }} />
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Ícone</label>
              <div className="row-wrap">
                {CATEGORY_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className="chip chip-toggle"
                    aria-pressed={editing.icon === icon}
                    aria-label={`Ícone ${icon}`}
                    onClick={() => setEditing({ ...editing, icon })}
                  >
                    <Icon name={CATEGORY_ICON_MAP[icon] ?? 'archive'} size={16} />
                  </button>
                ))}
              </div>
            </div>

            <div className="row">
              <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <div className="spacer" />
              <button type="button" className="btn btn-primary" onClick={() => void save()}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
