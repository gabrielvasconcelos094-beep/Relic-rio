import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { useShares } from '@/state/ShareContext';
import { useUi } from '@/state/UiContext';
import { Icon } from '@/components/Icon';
import { EmptyState, BlobImage, Sheet } from '@/components/ui';
import { formatTimestamp } from '@/utils/date';
import { snippet } from '@/utils/search';
import { isNative } from '@/utils/native';

export function InboxScreen() {
  const { inbox, attachments, categories, people, saveMemory, trashMemory } = useArchive();
  const { pending, importShare, importAll, discard, busy, supported } = useShares();
  const { toast, confirm } = useUi();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [quick, setQuick] = useState<string | null>(null);

  const quickMemory = quick ? inbox.find((m) => m.id === quick) : null;

  const attachmentsByOwner = useMemo(() => {
    const map = new Map<string, typeof attachments>();
    for (const a of attachments) {
      const list = map.get(a.ownerId) ?? [];
      list.push(a);
      map.set(a.ownerId, list);
    }
    return map;
  }, [attachments]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const fileSelected = async () => {
    for (const id of selected) {
      const m = inbox.find((x) => x.id === id);
      if (m) await saveMemory({ ...m, inbox: false });
    }
    toast(`${selected.length} ${selected.length === 1 ? 'registro organizado' : 'registros organizados'}.`);
    setSelected([]);
  };

  const trashSelected = async () => {
    const ok = await confirm({
      title: 'Mover para a lixeira',
      message: `${selected.length} ${selected.length === 1 ? 'registro vai' : 'registros vão'} para a lixeira. Dá para restaurar depois.`,
      confirmLabel: 'Mover',
      destructive: true,
    });
    if (!ok) return;
    for (const id of selected) await trashMemory(id);
    toast('Movido para a lixeira.');
    setSelected([]);
  };

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Arquivo</div>
        <h1 className="serif">Entrada</h1>
        <p className="lede">
          O que chegou e ainda não foi organizado. Pode ficar aqui o tempo que for preciso — nada é
          apagado sozinho.
        </p>
      </div>

      <div className="page stack-lg">
        {pending.length > 0 && (
          <section className="feature-card stack">
            <div className="kicker">Compartilhado com o Relicário</div>
            <p className="small">
              {pending.length}{' '}
              {pending.length === 1 ? 'conteúdo chegou' : 'conteúdos chegaram'} de outro aplicativo
              e aguarda para ser guardado.
            </p>
            <div className="stack">
              {pending.map((share) => (
                <div key={share.id} className="card card-pad stack" style={{ gap: 8 }}>
                  <div className="tiny faint">{formatTimestamp(share.receivedAt)}</div>
                  {share.subject && <strong className="small">{share.subject}</strong>}
                  {share.text && <p className="small">{snippet(share.text, 180)}</p>}
                  {share.items?.length > 0 && (
                    <div className="meta-line">
                      <Icon name="file" size={13} />
                      <span>
                        {share.items.length}{' '}
                        {share.items.length === 1 ? 'arquivo' : 'arquivos'}:{' '}
                        {share.items.map((i) => i.name).slice(0, 3).join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="row">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={busy}
                      onClick={async () => {
                        try {
                          const result = await importShare(share);
                          toast(
                            `Guardado na Entrada${result.files ? ` com ${result.files} ${result.files === 1 ? 'arquivo' : 'arquivos'}` : ''}.`,
                          );
                          navigate(`/memoria/${result.memoryId}/editar`);
                        } catch (err) {
                          toast(
                            err instanceof Error ? err.message : 'Não foi possível guardar.',
                            'error',
                          );
                        }
                      }}
                    >
                      Guardar e organizar
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={async () => {
                        try {
                          await importShare(share);
                          toast('Guardado na Entrada.');
                        } catch (err) {
                          toast(
                            err instanceof Error ? err.message : 'Não foi possível guardar.',
                            'error',
                          );
                        }
                      }}
                    >
                      Só guardar
                    </button>
                    <div className="spacer" />
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Descartar este compartilhamento"
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'Descartar conteúdo recebido',
                          message:
                            'O conteúdo compartilhado será apagado sem entrar no arquivo.',
                          confirmLabel: 'Descartar',
                          destructive: true,
                        });
                        if (ok) await discard(share.id);
                      }}
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {pending.length > 1 && (
              <button
                type="button"
                className="btn btn-block"
                disabled={busy}
                onClick={async () => {
                  const n = await importAll();
                  if (n) toast(`${n} conteúdos guardados na Entrada.`);
                }}
              >
                Guardar todos na Entrada
              </button>
            )}
          </section>
        )}

        {inbox.length === 0 && pending.length === 0 ? (
          <EmptyState
            icon="archive"
            title="A Entrada está vazia"
            description={
              supported
                ? 'Compartilhe uma mensagem, foto ou arquivo com o Relicário a partir de outro aplicativo, ou guarde algo aqui para organizar depois.'
                : 'Guarde algo rapidamente aqui e organize depois. No aplicativo Android instalado, o que você compartilhar de outros apps também cai nesta tela.'
            }
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/memoria/nova?entrada=1')}
              >
                <Icon name="plus" size={18} />
                Guardar rapidamente
              </button>
            }
          />
        ) : (
          inbox.length > 0 && (
            <section>
              <div className="section-title" style={{ marginTop: 0 }}>
                <h2>Aguardando organização</h2>
                <span className="tiny faint">{inbox.length}</span>
              </div>
              <div className="stack">
                {inbox.map((m) => {
                  const own = attachmentsByOwner.get(m.id) ?? [];
                  const thumb = own.find((a) => a.kind === 'image');
                  const isSelected = selected.includes(m.id);
                  const missing: string[] = [];
                  if (!m.title.trim()) missing.push('título');
                  if (!m.personIds.length) missing.push('pessoa');
                  if (!m.categoryIds.length) missing.push('categoria');
                  return (
                    <div key={m.id} className="inbox-item">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        aria-label={`Selecionar ${m.title || 'registro sem título'}`}
                        className="select-box"
                        onClick={() => toggle(m.id)}
                      >
                        {isSelected && <Icon name="check" size={14} />}
                      </button>
                      <button
                        type="button"
                        className="pressable"
                        style={{ flex: 1, minWidth: 0 }}
                        onClick={() => setQuick(m.id)}
                      >
                        <div className="memory-row">
                          {thumb && <BlobImage blob={thumb.blob} alt="" className="memory-thumb" />}
                          <div className="memory-body">
                            <h3>{m.title || 'Sem título'}</h3>
                            <div className="meta-line">
                              <Icon name="clock" size={12} />
                              <span>Recebido em {formatTimestamp(m.capturedAt ?? m.createdAt)}</span>
                            </div>
                            {m.text && <div className="excerpt">{snippet(m.text, 110)}</div>}
                            {missing.length > 0 && (
                              <div className="meta-line" style={{ marginTop: 5 }}>
                                <span>Falta: {missing.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )
        )}

        {!supported && !isNative() && (
          <p className="tiny faint">
            O recebimento por compartilhamento do Android funciona no aplicativo instalado. Nesta
            visualização pelo navegador a Entrada continua funcionando para registros rápidos.
          </p>
        )}
      </div>

      {selected.length > 0 && (
        <div className="bulk-bar">
          <span className="small">
            {selected.length} {selected.length === 1 ? 'selecionado' : 'selecionados'}
          </span>
          <div className="spacer" />
          <button type="button" className="btn btn-sm btn-quiet" onClick={() => setSelected([])}>
            Limpar
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => void trashSelected()}>
            Lixeira
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => void fileSelected()}>
            Organizar
          </button>
        </div>
      )}

      <Sheet open={!!quickMemory} onClose={() => setQuick(null)} title="Registro pendente">
        {quickMemory && (
          <div className="stack-lg">
            <div>
              <h3 className="serif" style={{ fontSize: '1.1rem' }}>
                {quickMemory.title || 'Sem título'}
              </h3>
              <p className="tiny faint" style={{ marginTop: 4 }}>
                Recebido em {formatTimestamp(quickMemory.capturedAt ?? quickMemory.createdAt)}
              </p>
            </div>
            {quickMemory.text && <p className="small">{snippet(quickMemory.text, 400)}</p>}
            {(attachmentsByOwner.get(quickMemory.id) ?? []).map((a) => (
              <div key={a.id} className="meta-line">
                <Icon name="file" size={13} />
                <span>{a.name}</span>
              </div>
            ))}
            <div className="row-wrap">
              {quickMemory.personIds.map((id) => (
                <span key={id} className="chip">
                  {people.find((p) => p.id === id)?.name ?? 'pessoa'}
                </span>
              ))}
              {quickMemory.categoryIds.map((id) => (
                <span key={id} className="chip">
                  {categories.find((c) => c.id === id)?.name ?? 'categoria'}
                </span>
              ))}
            </div>
            <div className="stack">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => {
                  setQuick(null);
                  navigate(`/memoria/${quickMemory.id}/editar`);
                }}
              >
                <Icon name="edit" size={17} />
                Completar informações
              </button>
              <button
                type="button"
                className="btn btn-block"
                onClick={async () => {
                  await saveMemory({ ...quickMemory, inbox: false });
                  setQuick(null);
                  toast('Registro organizado e movido para o arquivo.');
                }}
              >
                <Icon name="check" size={17} />
                Guardar como está
              </button>
              <button
                type="button"
                className="btn btn-quiet btn-block"
                onClick={() => {
                  setQuick(null);
                  navigate(`/memoria/${quickMemory.id}`);
                }}
              >
                Abrir memória
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
