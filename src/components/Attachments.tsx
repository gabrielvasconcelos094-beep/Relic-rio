import { useRef, useState } from 'react';
import type { Attachment } from '@/db/types';
import { Icon } from './Icon';
import { BlobImage, useBlobUrl } from './ui';
import { formatBytes } from '@/utils/stats';
import { deliverFile } from '@/utils/backup';

const KIND_ICON: Record<string, string> = {
  image: 'image',
  audio: 'audio',
  video: 'video',
  pdf: 'pdf',
  document: 'file',
  other: 'file',
};

export const KIND_LABEL: Record<string, string> = {
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
  pdf: 'PDF',
  document: 'Documento',
  other: 'Arquivo',
};

/** Exibição de um anexo dentro da memória aberta. */
export function AttachmentView({ attachment }: { attachment: Attachment }) {
  const url = useBlobUrl(
    attachment.kind === 'audio' || attachment.kind === 'video' ? attachment.blob : null,
  );

  if (attachment.kind === 'image') {
    return (
      <figure className="media-figure">
        <BlobImage blob={attachment.blob} alt={attachment.caption || attachment.name} />
        {attachment.caption && <figcaption>{attachment.caption}</figcaption>}
      </figure>
    );
  }

  if (attachment.kind === 'audio') {
    return (
      <figure className="media-figure">
        {url && <audio controls preload="metadata" src={url} />}
        <figcaption>{attachment.caption || attachment.name}</figcaption>
      </figure>
    );
  }

  if (attachment.kind === 'video') {
    return (
      <figure className="media-figure">
        {url && <video controls preload="metadata" src={url} playsInline />}
        {attachment.caption && <figcaption>{attachment.caption}</figcaption>}
      </figure>
    );
  }

  return <AttachmentFileRow attachment={attachment} />;
}

/** Linha de arquivo com ação de abrir/salvar — usada para PDFs e documentos. */
export function AttachmentFileRow({
  attachment,
  trailing,
}: {
  attachment: Attachment;
  trailing?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    try {
      const url = URL.createObjectURL(attachment.blob);
      const win = window.open(url, '_blank', 'noopener');
      if (!win) {
        await deliverFile(attachment.blob, attachment.name);
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="attachment-row">
      <span className="thumb">
        <Icon name={KIND_ICON[attachment.kind] ?? 'file'} />
      </span>
      <div className="info">
        <div className="name">{attachment.caption || attachment.name}</div>
        <div className="tiny faint">
          {KIND_LABEL[attachment.kind]} · {formatBytes(attachment.size)}
        </div>
      </div>
      {trailing ?? (
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void open()}>
          Abrir
        </button>
      )}
    </div>
  );
}

interface EditorProps {
  attachments: Attachment[];
  onAdd: (files: FileList) => void;
  onCaption: (attachment: Attachment, caption: string) => void;
  onRemove: (attachment: Attachment) => void;
  busy?: boolean;
}

/** Lista de anexos em modo de edição: legenda, remoção e substituição. */
export function AttachmentEditor({ attachments, onAdd, onCaption, onRemove, busy }: EditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="stack">
      {attachments.map((att) => (
        <div key={att.id} className="card card-pad stack" style={{ gap: 10 }}>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            {att.kind === 'image' ? (
              <BlobImage blob={att.blob} alt="" className="memory-thumb" />
            ) : (
              <span
                className="memory-thumb"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name={KIND_ICON[att.kind] ?? 'file'} />
              </span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="small" style={{ wordBreak: 'break-word' }}>
                {att.name}
              </div>
              <div className="tiny faint">
                {KIND_LABEL[att.kind]} · {formatBytes(att.size)}
              </div>
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remover ${att.name}`}
              onClick={() => onRemove(att)}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
          {editing === att.id ? (
            <input
              className="input"
              autoFocus
              placeholder="Legenda do arquivo"
              defaultValue={att.caption}
              aria-label="Legenda do arquivo"
              onBlur={(e) => {
                onCaption(att, e.target.value);
                setEditing(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-quiet"
              style={{ alignSelf: 'flex-start', paddingLeft: 0 }}
              onClick={() => setEditing(att.id)}
            >
              {att.caption ? `“${att.caption}”` : 'Adicionar legenda'}
            </button>
          )}
        </div>
      ))}

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden-input"
        onChange={(e) => {
          if (e.target.files?.length) onAdd(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className="btn btn-block"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Icon name="plus" size={18} />
        {busy ? 'Guardando arquivos…' : 'Anexar arquivos'}
      </button>
      <p className="tiny faint">
        Imagens, fotografias, capturas de tela, PDFs, áudios, vídeos e outros arquivos. Tudo fica
        guardado no próprio aparelho.
      </p>
    </div>
  );
}
