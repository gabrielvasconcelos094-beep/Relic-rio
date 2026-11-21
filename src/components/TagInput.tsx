import { useState } from 'react';
import { Icon } from './Icon';
import { normalize } from '@/utils/search';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  label?: string;
}

export function TagInput({ value, onChange, suggestions, label = 'Tags' }: Props) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const tag = raw.trim().replace(/^#/, '');
    if (!tag) return;
    if (!value.some((t) => normalize(t) === normalize(tag))) onChange([...value, tag]);
    setDraft('');
  };

  const filtered = suggestions
    .filter((s) => !value.some((t) => normalize(t) === normalize(s)))
    .filter((s) => (draft ? normalize(s).includes(normalize(draft)) : true))
    .slice(0, 8);

  return (
    <div className="field">
      <label htmlFor="tag-input">{label}</label>
      {value.length > 0 && (
        <div className="row-wrap" style={{ marginBottom: 2 }}>
          {value.map((t) => (
            <button
              key={t}
              type="button"
              className="chip tag-chip"
              aria-label={`Remover tag ${t}`}
              onClick={() => onChange(value.filter((x) => x !== t))}
            >
              {t}
              <Icon name="close" size={12} />
            </button>
          ))}
        </div>
      )}
      <div className="row">
        <input
          id="tag-input"
          className="input"
          placeholder="universidade, carta, reencontro…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
            }
            if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
        />
        <button type="button" className="btn btn-sm" disabled={!draft.trim()} onClick={() => add(draft)}>
          Adicionar
        </button>
      </div>
      {filtered.length > 0 && (
        <div className="row-wrap" style={{ marginTop: 4 }}>
          {filtered.map((s) => (
            <button key={s} type="button" className="chip tag-chip" onClick={() => add(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
