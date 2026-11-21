import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

/* ------------------------------------------------------------- barra superior */

export function TopBar({
  title,
  onBack,
  actions,
  bordered = true,
}: {
  title?: ReactNode;
  onBack?: () => void;
  actions?: ReactNode;
  bordered?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <header className={bordered ? 'topbar bordered' : 'topbar'}>
      <button
        type="button"
        className="icon-btn"
        aria-label="Voltar"
        onClick={() => (onBack ? onBack() : navigate(-1))}
      >
        <Icon name="back" />
      </button>
      <h2 style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </h2>
      {actions}
    </header>
  );
}

/* ------------------------------------------------------------- estados vazios */

export function EmptyState({
  icon = 'archive',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon name={icon} size={34} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------- interruptor */

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="switch-row">
      <div className="switch-text">
        <strong>{label}</strong>
        {description && <span className="tiny faint">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="switch"
        disabled={disabled}
        style={disabled ? { opacity: 0.45 } : undefined}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

/* ------------------------------------------------------------- folha inferior */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet">
        <div className="sheet-handle" />
        {title && (
          <div className="row" style={{ marginBottom: 14 }}>
            <h2 style={{ flex: 1 }}>{title}</h2>
            <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- blobs */

/** URL temporária para um Blob, liberada ao desmontar. */
export function useBlobUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return undefined;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

export function BlobImage({
  blob,
  alt,
  className,
  style,
}: {
  blob: Blob | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const url = useBlobUrl(blob);
  if (!url) return <div className={className} style={style} aria-hidden="true" />;
  return <img src={url} alt={alt} className={className} style={style} loading="lazy" />;
}
