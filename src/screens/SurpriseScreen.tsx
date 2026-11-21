import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { Icon } from '@/components/Icon';
import { TopBar, EmptyState } from '@/components/ui';
import { MemoryReader } from '@/components/MemoryReader';
import { pickRandom } from '@/utils/id';

type Scope =
  | 'qualquer'
  | 'mensagens'
  | 'fotografias'
  | 'momentos'
  | 'favoritas'
  | 'abrigo'
  | 'pessoa'
  | 'categoria'
  | 'colecao';

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'qualquer', label: 'Qualquer memória' },
  { key: 'mensagens', label: 'Apenas mensagens' },
  { key: 'fotografias', label: 'Apenas fotografias' },
  { key: 'momentos', label: 'Momentos especiais' },
  { key: 'favoritas', label: 'Apenas favoritas' },
  { key: 'abrigo', label: 'Para os dias difíceis' },
  { key: 'pessoa', label: 'De uma pessoa' },
  { key: 'categoria', label: 'De uma categoria' },
  { key: 'colecao', label: 'De uma coleção' },
];

export function SurpriseScreen() {
  const { memories, people, categories, collections, attachments } = useArchive();
  const navigate = useNavigate();
  const [scope, setScope] = useState<Scope>('qualquer');
  const [personId, setPersonId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [current, setCurrent] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);

  const imageOwners = useMemo(
    () => new Set(attachments.filter((a) => a.kind === 'image').map((a) => a.ownerId)),
    [attachments],
  );

  const eligible = useMemo(() => {
    const momentsId = categories.find((c) => c.name.toLowerCase() === 'momentos especiais')?.id;
    switch (scope) {
      case 'mensagens':
        return memories.filter((m) => m.text.trim().length > 0);
      case 'fotografias':
        return memories.filter((m) => imageOwners.has(m.id));
      case 'momentos':
        return momentsId ? memories.filter((m) => m.categoryIds.includes(momentsId)) : [];
      case 'favoritas':
        return memories.filter((m) => m.favorite);
      case 'abrigo':
        return memories.filter((m) => m.hardDay);
      case 'pessoa':
        return personId ? memories.filter((m) => m.personIds.includes(personId)) : [];
      case 'categoria':
        return categoryId ? memories.filter((m) => m.categoryIds.includes(categoryId)) : [];
      case 'colecao':
        return collectionId ? memories.filter((m) => m.collectionIds.includes(collectionId)) : [];
      default:
        return memories;
    }
  }, [scope, memories, imageOwners, categories, personId, categoryId, collectionId]);

  const draw = () => {
    const chosen = pickRandom(eligible, seen, (m) => m.id);
    if (!chosen) {
      setCurrent(null);
      return;
    }
    setCurrent(chosen.id);
    setSeen((s) => {
      const next = [...s, chosen.id];
      return next.length >= eligible.length ? [chosen.id] : next;
    });
  };

  const changeScope = (next: Scope) => {
    setScope(next);
    setCurrent(null);
    setSeen([]);
  };

  const shown = current ? eligible.find((m) => m.id === current) ?? null : null;

  return (
    <>
      <TopBar title="Surpreenda-me" />
      <div className="page stack-lg" style={{ paddingTop: 6 }}>
        <p className="muted small">
          Uma volta pelo arquivo, sem procurar nada em especial. Escolha o que pode aparecer.
        </p>

        <div className="row-wrap">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              type="button"
              className="chip chip-toggle"
              aria-pressed={scope === s.key}
              onClick={() => changeScope(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {scope === 'pessoa' && (
          <div className="field">
            <label htmlFor="escolha-pessoa">Pessoa</label>
            <select
              id="escolha-pessoa"
              className="input"
              value={personId}
              onChange={(e) => {
                setPersonId(e.target.value);
                setCurrent(null);
                setSeen([]);
              }}
            >
              <option value="">Selecione…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {scope === 'categoria' && (
          <div className="field">
            <label htmlFor="escolha-categoria">Categoria</label>
            <select
              id="escolha-categoria"
              className="input"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setCurrent(null);
                setSeen([]);
              }}
            >
              <option value="">Selecione…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {scope === 'colecao' && (
          <div className="field">
            <label htmlFor="escolha-colecao">Coleção</label>
            <select
              id="escolha-colecao"
              className="input"
              value={collectionId}
              onChange={(e) => {
                setCollectionId(e.target.value);
                setCurrent(null);
                setSeen([]);
              }}
            >
              <option value="">Selecione…</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="row">
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={eligible.length === 0}
            onClick={draw}
          >
            <Icon name="shuffle" size={18} />
            {shown ? 'Mostrar outra' : 'Abrir uma memória'}
          </button>
        </div>
        <p className="tiny faint" style={{ marginTop: -14 }}>
          {eligible.length} {eligible.length === 1 ? 'registro elegível' : 'registros elegíveis'}
        </p>

        {eligible.length === 0 ? (
          <EmptyState
            icon="shuffle"
            title="Nenhum registro nesta seleção"
            description="Escolha outra opção acima ou guarde novas memórias no arquivo."
          />
        ) : shown ? (
          <section className="card card-pad stack">
            <MemoryReader
              memory={shown}
              people={people}
              categories={categories}
              attachments={attachments}
            />
            <div className="row">
              <button type="button" className="btn" onClick={draw}>
                <Icon name="shuffle" size={17} />
                Outra
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
          </section>
        ) : null}
      </div>
    </>
  );
}
