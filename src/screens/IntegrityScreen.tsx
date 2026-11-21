import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { Icon } from '@/components/Icon';
import { TopBar, Switch } from '@/components/ui';
import { checkIntegrity, type IntegrityReport, type Issue } from '@/utils/integrity';
import { emptyMemory } from '@/db/archive';
import { formatBytes } from '@/utils/stats';

export function IntegrityScreen() {
  const archive = useArchive();
  const { toast, confirm } = useUi();
  const navigate = useNavigate();
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [running, setRunning] = useState(false);
  const [deep, setDeep] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [fixing, setFixing] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setReport(null);
    setProgress(null);
    try {
      const result = await checkIntegrity(
        {
          memories: archive.allMemories,
          people: archive.people,
          categories: archive.categories,
          collections: archive.collections,
          sources: archive.sources,
          attachments: archive.attachments,
          capsules: archive.capsules,
          history: archive.history,
        },
        deep,
        (done, total) => setProgress({ done, total }),
      );
      setReport(result);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'A verificação não pôde ser concluída.', 'error');
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  /** Toda correção é explícita e confirmada; nada é removido automaticamente. */
  const applyFix = async (issue: Issue) => {
    const ok = await confirm({
      title: issue.fixLabel ?? 'Corrigir',
      message: `${issue.detail}\n\nEsta correção altera apenas o que foi descrito.`,
      confirmLabel: issue.fixLabel ?? 'Corrigir',
    });
    if (!ok) return;

    setFixing(issue.id);
    try {
      switch (issue.fix) {
        case 'drop-person-ref':
        case 'drop-category-ref':
        case 'drop-collection-ref': {
          const target = issue.targets[0];
          const memory = archive.allMemories.find((m) => m.id === target.id);
          if (!memory || !target.extra) break;
          const field =
            issue.fix === 'drop-person-ref'
              ? 'personIds'
              : issue.fix === 'drop-category-ref'
                ? 'categoryIds'
                : 'collectionIds';
          await archive.saveMemory({
            ...memory,
            [field]: memory[field].filter((x) => x !== target.extra),
          });
          break;
        }
        case 'drop-source-ref': {
          const memory = archive.allMemories.find((m) => m.id === issue.targets[0].id);
          if (memory) await archive.saveMemory({ ...memory, sourceId: null });
          break;
        }
        case 'drop-capsule-ref': {
          const target = issue.targets[0];
          const capsule = archive.capsules.find((c) => c.id === target.id);
          if (capsule && target.extra) {
            await archive.saveCapsule({
              ...capsule,
              memoryIds: capsule.memoryIds.filter((m) => m !== target.extra),
            });
          }
          break;
        }
        case 'set-title': {
          const memory = archive.allMemories.find((m) => m.id === issue.targets[0].id);
          if (memory) await archive.saveMemory({ ...memory, title: 'Registro sem conteúdo' });
          break;
        }
        case 'adopt-orphan': {
          // Cria uma memória na Entrada para o arquivo órfão, em vez de apagá-lo.
          const att = archive.attachments.find((a) => a.id === issue.targets[0].id);
          if (!att) break;
          const memory = await archive.createMemory({
            ...emptyMemory(),
            title: att.name,
            text: '',
            inbox: true,
            occurredPrecision: 'unknown',
            occurredAt: null,
          });
          await archive.updateAttachment({
            ...att,
            ownerKind: 'memory',
            ownerId: memory.id,
            memoryId: memory.id,
          });
          break;
        }
        default:
          break;
      }
      toast('Correção aplicada. Rode a verificação de novo para conferir.');
      await archive.reload();
      setReport(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'A correção falhou.', 'error');
    } finally {
      setFixing(null);
    }
  };

  const severityLabel = { grave: 'Grave', aviso: 'Aviso', informacao: 'Observação' } as const;

  return (
    <>
      <TopBar title="Verificar integridade" />
      <div className="page stack-lg" style={{ paddingTop: 6 }}>
        <p className="muted small">
          Procura registros incompletos, anexos ausentes, arquivos órfãos e referências quebradas.
          A verificação apenas inspeciona: nada é removido sem você pedir.
        </p>

        <section className="card card-pad stack">
          <Switch
            label="Conferir o conteúdo dos arquivos"
            description="Relê cada anexo e recalcula o hash para detectar corrupção. Mais demorado."
            checked={deep}
            onChange={setDeep}
          />
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={running}
            onClick={() => void run()}
          >
            <Icon name="check" size={18} />
            {running ? 'Verificando…' : 'Verificar agora'}
          </button>
          {progress && progress.total > 0 && (
            <div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
              <p className="tiny faint" style={{ marginTop: 6 }}>
                Conferindo {progress.done} de {progress.total} arquivos…
              </p>
            </div>
          )}
        </section>

        {report && (
          <section className="stack">
            <div className="card card-pad">
              <div className="row">
                <Icon
                  name={report.ok ? 'check' : 'info'}
                  size={18}
                  style={{ color: report.ok ? 'var(--sage)' : 'var(--terracotta)' }}
                />
                <strong style={{ flex: 1 }}>
                  {report.ok
                    ? 'Nenhum problema encontrado'
                    : `${report.issues.length} ${report.issues.length === 1 ? 'ponto a observar' : 'pontos a observar'}`}
                </strong>
              </div>
              <p className="tiny faint" style={{ marginTop: 8 }}>
                {report.memories} memórias e {report.attachments} anexos verificados
                {report.hashesChecked > 0
                  ? ` · ${report.hashesChecked} arquivos conferidos byte a byte (${formatBytes(report.bytesVerified)})`
                  : ''}
                .
              </p>
            </div>

            {report.issues.map((issue) => (
              <div key={issue.id} className={`issue-card ${issue.severity}`}>
                <div className="row">
                  <span className="tiny faint" style={{ flex: 1 }}>
                    {severityLabel[issue.severity]}
                  </span>
                </div>
                <strong className="small" style={{ display: 'block', marginTop: 2 }}>
                  {issue.title}
                </strong>
                <p className="tiny" style={{ marginTop: 4, color: 'var(--ink-soft)' }}>
                  {issue.detail}
                </p>
                {issue.fix !== 'none' && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ marginTop: 8 }}
                    disabled={fixing === issue.id}
                    onClick={() => void applyFix(issue)}
                  >
                    {issue.fixLabel}
                  </button>
                )}
                {issue.fix === 'none' && (
                  <p className="tiny faint" style={{ marginTop: 6 }}>
                    Sem correção automática segura — o conteúdo original é preservado como está.
                  </p>
                )}
              </div>
            ))}

            {!report.ok && (
              <button
                type="button"
                className="btn btn-block"
                onClick={() => navigate('/configuracoes/backup')}
              >
                <Icon name="download" size={17} />
                Gerar um backup antes de mexer
              </button>
            )}
          </section>
        )}
      </div>
    </>
  );
}
