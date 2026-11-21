import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { Icon } from '@/components/Icon';
import { TopBar, EmptyState, BlobImage } from '@/components/ui';
import { formatTimestamp } from '@/utils/date';
import { daysLeftInTrash } from '@/utils/selectors';
import { snippet } from '@/utils/search';

export function TrashScreen() {
  const { trash, attachments, settings, restoreMemory, destroyMemory, emptyTrash } = useArchive();
  const { toast, confirm } = useUi();

  const destroy = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'Excluir definitivamente',
      message: `“${title}” e seus anexos serão apagados para sempre deste aparelho. Não há como desfazer.`,
      confirmLabel: 'Excluir para sempre',
      destructive: true,
    });
    if (!ok) return;
    await destroyMemory(id);
    toast('Registro excluído definitivamente.');
  };

  const clearAll = async () => {
    const ok = await confirm({
      title: 'Esvaziar a lixeira',
      message: `${trash.length} ${trash.length === 1 ? 'registro será apagado' : 'registros serão apagados'} definitivamente, com seus anexos. Não há como desfazer.`,
      confirmLabel: 'Esvaziar',
      destructive: true,
    });
    if (!ok) return;
    const n = await emptyTrash();
    toast(`${n} ${n === 1 ? 'registro apagado' : 'registros apagados'}.`);
  };

  return (
    <>
      <TopBar
        title="Lixeira"
        actions={
          trash.length > 0 ? (
            <button type="button" className="btn btn-sm btn-danger" onClick={() => void clearAll()}>
              Esvaziar
            </button>
          ) : undefined
        }
      />

      <div className="page stack" style={{ paddingTop: 6 }}>
        <p className="muted small">
          O que você exclui fica aqui por {settings.trashRetentionDays} dias antes de ser apagado
          definitivamente. Até lá, dá para restaurar com os anexos.
        </p>

        {trash.length === 0 ? (
          <EmptyState
            icon="trash"
            title="A lixeira está vazia"
            description="Nenhum registro aguardando exclusão definitiva."
          />
        ) : (
          <div className="stack">
            {trash.map((m) => {
              const left = daysLeftInTrash(m, settings.trashRetentionDays);
              const own = attachments.filter((a) => a.ownerId === m.id);
              const thumb = own.find((a) => a.kind === 'image');
              return (
                <div key={m.id} className="card card-pad stack" style={{ gap: 10 }}>
                  <div className="memory-row">
                    {thumb && <BlobImage blob={thumb.blob} alt="" className="memory-thumb" />}
                    <div className="memory-body">
                      <h3>{m.title || 'Memória sem título'}</h3>
                      <div className="meta-line">
                        <Icon name="trash" size={12} />
                        <span>Excluída em {formatTimestamp(m.deletedAt ?? m.updatedAt)}</span>
                      </div>
                      {m.text && <div className="excerpt">{snippet(m.text, 100)}</div>}
                      <div className="meta-line" style={{ marginTop: 5 }}>
                        <span style={{ color: left <= 3 ? 'var(--danger)' : undefined }}>
                          {left === 0
                            ? 'Será apagada na próxima abertura do aplicativo'
                            : `${left} ${left === 1 ? 'dia restante' : 'dias restantes'}`}
                        </span>
                        {own.length > 0 && (
                          <>
                            <span className="sep">·</span>
                            <span>
                              {own.length} {own.length === 1 ? 'anexo' : 'anexos'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={async () => {
                        await restoreMemory(m.id);
                        toast('Memória restaurada com seus anexos.');
                      }}
                    >
                      <Icon name="upload" size={16} />
                      Restaurar
                    </button>
                    <div className="spacer" />
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => void destroy(m.id, m.title || 'Memória sem título')}
                    >
                      Excluir para sempre
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
