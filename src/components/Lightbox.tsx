import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { useBlobUrl } from './ui';
import type { GalleryEntry } from '@/utils/selectors';
import { formatCivil } from '@/utils/date';

interface Props {
  entries: GalleryEntry[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

export function Lightbox({ entries, index, onIndexChange, onClose }: Props) {
  const navigate = useNavigate();
  const entry = entries[index];
  const url = useBlobUrl(entry?.attachment.blob ?? null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < entries.length - 1) onIndexChange(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, entries.length, onClose, onIndexChange]);

  if (!entry) return null;

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Imagem">
      <div className="lightbox-bar">
        <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
          <Icon name="close" />
        </button>
        <span className="spacer" />
        <span className="tiny" style={{ color: '#cbbfae' }}>
          {index + 1} / {entries.length}
        </span>
      </div>
      <div className="lightbox-stage">
        {url && <img src={url} alt={entry.attachment.caption || entry.attachment.name} />}
      </div>
      <div className="lightbox-info">
        <div className="row">
          <button
            type="button"
            className="icon-btn"
            aria-label="Imagem anterior"
            disabled={index === 0}
            style={index === 0 ? { opacity: 0.3 } : undefined}
            onClick={() => onIndexChange(index - 1)}
          >
            <Icon name="back" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: '0.92rem' }}>
              {entry.memory.title || 'Memória sem título'}
            </strong>
            <span className="tiny">
              {formatCivil(entry.memory.occurredAt, entry.memory.occurredPrecision, entry.memory.occurredNote)}
              {entry.attachment.caption ? ` · ${entry.attachment.caption}` : ''}
            </span>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Próxima imagem"
            disabled={index === entries.length - 1}
            style={index === entries.length - 1 ? { opacity: 0.3 } : undefined}
            onClick={() => onIndexChange(index + 1)}
          >
            <Icon name="forward" />
          </button>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          style={{ marginTop: 10 }}
          onClick={() => {
            onClose();
            navigate(`/memoria/${entry.memory.id}`);
          }}
        >
          Abrir memória
        </button>
      </div>
    </div>
  );
}
