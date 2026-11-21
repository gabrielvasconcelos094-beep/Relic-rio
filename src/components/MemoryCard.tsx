import { useNavigate } from 'react-router-dom';
import type { Attachment, Category, Memory, Person } from '@/db/types';
import { formatCivil } from '@/utils/date';
import { snippet } from '@/utils/search';
import { BlobImage } from './ui';
import { CATEGORY_ICON_MAP, Icon } from './Icon';

export function CategoryChip({ category }: { category: Category }) {
  return (
    <span className="chip">
      <span
        className="chip-dot"
        style={{ background: `var(--cat-${category.color}, var(--cat-tinta))` }}
      />
      {category.name}
    </span>
  );
}

export function CategoryGlyph({ category, size = 18 }: { category: Category; size?: number }) {
  return (
    <Icon
      name={CATEGORY_ICON_MAP[category.icon] ?? 'archive'}
      size={size}
      style={{ color: `var(--cat-${category.color}, var(--cat-tinta))` }}
    />
  );
}

export function Avatar({
  person,
  photo,
  large,
}: {
  person: Person;
  photo?: Attachment | null;
  large?: boolean;
}) {
  const cls = large ? 'avatar avatar-lg' : 'avatar';
  if (photo) return <BlobImage blob={photo.blob} alt={person.name} className={cls} />;
  const initials = person.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span className={cls} aria-hidden="true">
      {initials || '·'}
    </span>
  );
}

interface MemoryCardProps {
  memory: Memory;
  people: Person[];
  categories: Category[];
  attachments: Attachment[];
  onOpen?: (id: string) => void;
}

export function MemoryCard({ memory, people, categories, attachments, onOpen }: MemoryCardProps) {
  const navigate = useNavigate();
  const own = attachments.filter((a) => a.ownerId === memory.id);
  const thumb = own.find((a) => a.kind === 'image');
  const personNames = memory.personIds
    .map((id) => people.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);
  const cat = categories.find((c) => memory.categoryIds.includes(c.id));
  const excerpt = snippet(memory.text || memory.feeling || memory.context, 120);

  const kinds = new Set(own.map((a) => a.kind));

  return (
    <button
      type="button"
      className="pressable"
      onClick={() => (onOpen ? onOpen(memory.id) : navigate(`/memoria/${memory.id}`))}
    >
      <div className="memory-row">
        {thumb ? (
          <BlobImage blob={thumb.blob} alt="" className="memory-thumb" />
        ) : cat ? (
          <span
            className="memory-thumb"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <CategoryGlyph category={cat} size={21} />
          </span>
        ) : null}
        <div className="memory-body">
          <h3>{memory.title || 'Memória sem título'}</h3>
          <div className="meta-line">
            <span>{formatCivil(memory.occurredAt, memory.occurredPrecision, memory.occurredNote)}</span>
            {personNames.length > 0 && (
              <>
                <span className="sep">·</span>
                <span>
                  {personNames.slice(0, 2).join(', ')}
                  {personNames.length > 2 ? ` +${personNames.length - 2}` : ''}
                </span>
              </>
            )}
            {cat && (
              <>
                <span className="sep">·</span>
                <span>{cat.name}</span>
              </>
            )}
          </div>
          {excerpt && <div className="excerpt">{excerpt}</div>}
          {(kinds.size > 0 || memory.tags.length > 0) && (
            <div className="meta-line" style={{ marginTop: 6 }}>
              {[...kinds].map((k) => (
                <span key={k} title={k}>
                  <Icon
                    name={k === 'image' ? 'image' : k === 'audio' ? 'audio' : k === 'video' ? 'video' : k === 'pdf' ? 'pdf' : 'file'}
                    size={13}
                  />
                </span>
              ))}
              {memory.tags.slice(0, 2).map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="marks">
          {memory.favorite && <Icon name="star" size={15} className="fav" />}
          {memory.hardDay && <Icon name="shelter" size={15} className="hard" />}
        </div>
      </div>
    </button>
  );
}
