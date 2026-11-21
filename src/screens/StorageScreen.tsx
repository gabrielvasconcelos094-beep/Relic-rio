import { useEffect, useMemo, useState } from 'react';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { Icon } from '@/components/Icon';
import { TopBar } from '@/components/ui';
import { estimateStorage } from '@/db/idb';
import { formatBytes } from '@/utils/stats';
import { KIND_LABEL } from '@/components/Attachments';
import { loadDemoData } from '@/utils/demo';

export function StorageScreen() {
  const { memories, people, attachments, capsules, wipeArchive, removeDemoData, reload } =
    useArchive();
  const { toast, confirm } = useUi();
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void estimateStorage().then(setQuota);
    if (navigator.storage?.persisted) {
      void navigator.storage.persisted().then(setPersisted).catch(() => setPersisted(null));
    }
  }, []);

  const byKind = useMemo(() => {
    const map = new Map<string, { count: number; bytes: number }>();
    for (const a of attachments) {
      const cur = map.get(a.kind) ?? { count: 0, bytes: 0 };
      map.set(a.kind, { count: cur.count + 1, bytes: cur.bytes + a.size });
    }
    return [...map.entries()].sort((a, b) => b[1].bytes - a[1].bytes);
  }, [attachments]);

  const demoCount = useMemo(
    () =>
      memories.filter((m) => m.demo).length +
      people.filter((p) => p.demo).length +
      capsules.filter((c) => c.demo).length,
    [memories, people, capsules],
  );

  const totalBytes = attachments.reduce((s, a) => s + a.size, 0);

  const askPersist = async () => {
    if (!navigator.storage?.persist) return;
    const granted = await navigator.storage.persist();
    setPersisted(granted);
    toast(
      granted
        ? 'O sistema foi solicitado a preservar o arquivo deste aplicativo.'
        : 'O sistema não concedeu a persistência reforçada. Os dados continuam guardados normalmente.',
    );
  };

  const addDemo = async () => {
    const ok = await confirm({
      title: 'Carregar conjunto de demonstração',
      message:
        'Serão criadas 7 memórias, 3 pessoas e 1 cápsula de exemplo, marcadas como demonstração. Você pode removê-las depois sem afetar seus próprios registros.',
      confirmLabel: 'Carregar',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await loadDemoData();
      await reload();
      toast(`Demonstração carregada: ${result.memories} memórias e ${result.people} pessoas.`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível carregar.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const dropDemo = async () => {
    const ok = await confirm({
      title: 'Remover demonstração',
      message: 'Apenas os registros marcados como demonstração serão apagados.',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const n = await removeDemoData();
      toast(`${n} itens de demonstração removidos.`);
    } finally {
      setBusy(false);
    }
  };

  const wipe = async () => {
    const first = await confirm({
      title: 'Apagar todo o arquivo',
      message:
        'Todas as memórias, pessoas, anexos e cápsulas deste aparelho serão apagadas definitivamente. Gere um backup antes se tiver dúvida.',
      confirmLabel: 'Continuar',
      destructive: true,
    });
    if (!first) return;
    const second = await confirm({
      title: 'Tem certeza?',
      message: `Serão apagadas ${memories.length} memórias e ${attachments.length} anexos. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Apagar tudo',
      destructive: true,
    });
    if (!second) return;
    setBusy(true);
    try {
      await wipeArchive();
      toast('Arquivo apagado.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Armazenamento" />
      <div className="page stack-lg" style={{ paddingTop: 6 }}>
        <section className="stat-grid">
          <div className="stat-tile">
            <div className="value">{attachments.length}</div>
            <div className="label">Anexos guardados</div>
          </div>
          <div className="stat-tile">
            <div className="value">{formatBytes(totalBytes)}</div>
            <div className="label">Ocupado por anexos</div>
          </div>
        </section>

        {byKind.length > 0 && (
          <section className="card card-pad list-divided">
            {byKind.map(([kind, info]) => (
              <div key={kind} className="link-row" style={{ padding: '11px 2px' }}>
                <Icon name="file" />
                <span className="label">
                  <strong>{KIND_LABEL[kind] ?? kind}</strong>
                  <span>
                    {info.count} {info.count === 1 ? 'arquivo' : 'arquivos'}
                  </span>
                </span>
                <span className="small faint">{formatBytes(info.bytes)}</span>
              </div>
            ))}
          </section>
        )}

        {quota && (
          <section className="card card-pad">
            <strong className="small">Espaço do aplicativo neste aparelho</strong>
            <p className="tiny faint" style={{ marginTop: 4 }}>
              {formatBytes(quota.usage)} usados
              {quota.quota ? ` de aproximadamente ${formatBytes(quota.quota)} disponíveis` : ''}.
            </p>
            {persisted !== null && (
              <>
                <p className="tiny faint" style={{ marginTop: 6 }}>
                  {persisted
                    ? 'O sistema trata este armazenamento como persistente.'
                    : 'O sistema pode liberar este armazenamento se o aparelho ficar sem espaço.'}
                </p>
                {!persisted && typeof navigator.storage?.persist === 'function' && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() => void askPersist()}
                  >
                    Solicitar armazenamento persistente
                  </button>
                )}
              </>
            )}
          </section>
        )}

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Demonstração</h2>
          </div>
          <div className="card card-pad stack">
            <p className="small muted">
              Registros de demonstração ficam marcados e separados dos seus. Nada é criado
              automaticamente.
            </p>
            {demoCount > 0 ? (
              <button
                type="button"
                className="btn btn-block"
                disabled={busy}
                onClick={() => void dropDemo()}
              >
                <Icon name="trash" size={17} />
                Remover os {demoCount} itens de demonstração
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-block"
                disabled={busy}
                onClick={() => void addDemo()}
              >
                <Icon name="plus" size={17} />
                Carregar conjunto de demonstração
              </button>
            )}
          </div>
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Apagar</h2>
          </div>
          <button
            type="button"
            className="btn btn-danger btn-block"
            disabled={busy || memories.length + people.length + attachments.length === 0}
            onClick={() => void wipe()}
          >
            <Icon name="trash" size={17} />
            Apagar todo o arquivo
          </button>
          <p className="tiny faint" style={{ marginTop: 8 }}>
            Pede confirmação duas vezes. As categorias iniciais voltam ao estado original.
          </p>
        </section>
      </div>
    </>
  );
}
