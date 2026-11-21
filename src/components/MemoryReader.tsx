import { Link } from 'react-router-dom';
import type { Attachment, Category, Memory, Person } from '@/db/types';
import { formatCivil, formatTimestamp } from '@/utils/date';
import { AttachmentView } from './Attachments';
import { CategoryChip } from './MemoryCard';
import { Icon } from './Icon';

/**
 * Leitura tranquila de uma memória. O conteúdo original é exibido como foi guardado,
 * sem reescrita nem resumo.
 */
export function MemoryReader({
  memory,
  people,
  categories,
  attachments,
}: {
  memory: Memory;
  people: Person[];
  categories: Category[];
  attachments: Attachment[];
}) {
  const own = attachments.filter((a) => a.ownerId === memory.id);
  const linked = memory.personIds
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is Person => !!p);
  const cats = memory.categoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is Category => !!c);

  return (
    <article className="stack-lg">
      <header>
        <h2 className="serif" style={{ fontSize: '1.35rem' }}>
          {memory.title || 'Memória sem título'}
        </h2>
        <div className="meta-line" style={{ marginTop: 6 }}>
          <span>{formatCivil(memory.occurredAt, memory.occurredPrecision)}</span>
          {linked.length > 0 && (
            <>
              <span className="sep">·</span>
              <span>{linked.map((p) => p.name).join(', ')}</span>
            </>
          )}
        </div>
      </header>

      {memory.text && (
        <section className="card card-pad">
          <p
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              lineHeight: 1.65,
            }}
          >
            {memory.text}
          </p>
        </section>
      )}

      {own.length > 0 && (
        <section>
          {own.map((att) => (
            <AttachmentView key={att.id} attachment={att} />
          ))}
        </section>
      )}

      {memory.feeling && (
        <section>
          <div className="eyebrow">Como isso me fez sentir</div>
          <p className="muted small" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
            {memory.feeling}
          </p>
        </section>
      )}

      {memory.context && (
        <section>
          <div className="eyebrow">Contexto</div>
          <p className="muted small" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
            {memory.context}
          </p>
        </section>
      )}

      {(cats.length > 0 || linked.length > 0) && (
        <div className="row-wrap">
          {linked.map((p) => (
            <Link key={p.id} to={`/pessoa/${p.id}`} className="chip" style={{ textDecoration: 'none' }}>
              <Icon name="people" size={13} />
              {p.name}
            </Link>
          ))}
          {cats.map((c) => (
            <CategoryChip key={c.id} category={c} />
          ))}
        </div>
      )}

      <p className="tiny faint">Guardado em {formatTimestamp(memory.createdAt)}</p>
    </article>
  );
}
