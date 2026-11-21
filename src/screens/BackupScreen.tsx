import { useRef, useState } from 'react';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { Icon } from '@/components/Icon';
import { TopBar } from '@/components/ui';
import { createBackup, deliverFile, restoreBackup, type RestoreReport } from '@/utils/backup';
import { formatBytes } from '@/utils/stats';
import { formatTimestamp } from '@/utils/date';

export function BackupScreen() {
  const archive = useArchive();
  const { toast, confirm } = useUi();
  const { memories, people, categories, attachments, capsules, settings, updateSettings, reload } =
    archive;
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null);
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string; size: number } | null>(
    null,
  );
  const [report, setReport] = useState<RestoreReport | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingMode = useRef<'replace' | 'merge'>('merge');

  const totalBytes = attachments.reduce((s, a) => s + a.size, 0);

  const makeBackup = async () => {
    setBusy('backup');
    setLastResult(null);
    try {
      const result = await createBackup({
        memories,
        people,
        categories,
        attachments,
        capsules,
        settings,
      });
      const how = await deliverFile(result.blob, result.filename);
      await updateSettings({ lastBackupAt: new Date().toISOString() });
      setLastResult({
        ok: result.verification.ok,
        message: `${result.filename} · ${result.verification.message}`,
        size: result.blob.size,
      });
      toast(
        how === 'shared'
          ? 'Backup compartilhado.'
          : `Backup gerado: ${result.filename}`,
        result.verification.ok ? 'neutral' : 'error',
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setBusy(null);
        return;
      }
      toast(err instanceof Error ? err.message : 'Não foi possível gerar o backup.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const pickFile = (mode: 'replace' | 'merge') => {
    pendingMode.current = mode;
    fileRef.current?.click();
  };

  const doRestore = async (file: File) => {
    const mode = pendingMode.current;
    const ok = await confirm({
      title: mode === 'replace' ? 'Substituir o arquivo atual' : 'Mesclar com o arquivo atual',
      message:
        mode === 'replace'
          ? 'Todas as memórias, pessoas, categorias e anexos deste aparelho serão apagados e substituídos pelo conteúdo do backup. Não é possível desfazer.'
          : 'Os registros do backup serão adicionados. Registros com o mesmo identificador serão sobrescritos pela versão do backup.',
      confirmLabel: mode === 'replace' ? 'Substituir' : 'Mesclar',
      destructive: mode === 'replace',
    });
    if (!ok) return;

    setBusy('restore');
    setReport(null);
    try {
      const result = await restoreBackup(file, mode);
      await reload();
      setReport(result);
      toast(
        `Restauração concluída: ${result.memories} memórias, ${result.attachments} anexos.`,
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível restaurar.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <TopBar title="Backup e exportação" />
      <div className="page stack-lg" style={{ paddingTop: 6 }}>
        <p className="muted small">
          O backup é um arquivo .zip com todos os registros em texto legível e a pasta de anexos com
          os arquivos originais. Fica com você: nada é enviado para servidores.
        </p>

        <section className="card card-pad stack">
          <div className="row">
            <Icon name="archive" />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>Conteúdo atual</strong>
              <span className="tiny faint">
                {memories.length} memórias · {people.length} pessoas · {attachments.length} anexos ·{' '}
                {formatBytes(totalBytes)}
              </span>
            </div>
          </div>
          {settings.lastBackupAt && (
            <p className="tiny faint">
              Último backup gerado em {formatTimestamp(settings.lastBackupAt)}.
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={busy !== null || memories.length + people.length === 0}
            onClick={() => void makeBackup()}
          >
            <Icon name="download" size={18} />
            {busy === 'backup' ? 'Gerando backup…' : 'Criar backup completo'}
          </button>
          {memories.length + people.length === 0 && (
            <p className="tiny faint">Não há nada para incluir num backup ainda.</p>
          )}
          {lastResult && (
            <div
              className="card card-pad"
              style={{
                borderColor: lastResult.ok ? 'var(--sage)' : 'var(--danger)',
                background: 'var(--paper-sunken)',
              }}
            >
              <div className="row">
                <Icon
                  name={lastResult.ok ? 'check' : 'info'}
                  size={17}
                  style={{ color: lastResult.ok ? 'var(--sage)' : 'var(--danger)' }}
                />
                <strong className="small">
                  {lastResult.ok ? 'Backup conferido' : 'Conferência falhou'}
                </strong>
              </div>
              <p className="tiny" style={{ marginTop: 6 }}>
                {lastResult.message}
              </p>
              <p className="tiny faint">Tamanho do arquivo: {formatBytes(lastResult.size)}</p>
            </div>
          )}
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Restaurar</h2>
          </div>
          <div className="card card-pad list-divided">
            <button
              type="button"
              className="link-row"
              disabled={busy !== null}
              onClick={() => pickFile('merge')}
            >
              <Icon name="upload" />
              <span className="label">
                <strong>Mesclar um backup</strong>
                <span>Acrescenta os registros do arquivo ao que já existe</span>
              </span>
              <Icon name="forward" />
            </button>
            <button
              type="button"
              className="link-row"
              disabled={busy !== null}
              onClick={() => pickFile('replace')}
              style={{ color: 'var(--danger)' }}
            >
              <Icon name="upload" />
              <span className="label">
                <strong>Substituir pelo backup</strong>
                <span>Apaga o arquivo atual deste aparelho antes de restaurar</span>
              </span>
              <Icon name="forward" />
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doRestore(f);
              e.target.value = '';
            }}
          />
          {busy === 'restore' && <p className="small muted">Restaurando…</p>}
          {report && (
            <div className="card card-pad" style={{ marginTop: 12, borderColor: 'var(--sage)' }}>
              <strong className="small">Restauração concluída</strong>
              <p className="tiny" style={{ marginTop: 6 }}>
                {report.memories} memórias · {report.people} pessoas · {report.categories}{' '}
                categorias · {report.attachments} anexos · {report.capsules} cápsulas
                {report.skippedFiles > 0
                  ? ` · ${report.skippedFiles} anexos listados no backup não tinham arquivo e foram ignorados`
                  : ''}
                .
              </p>
            </div>
          )}
        </section>

        <section className="card card-pad">
          <p className="tiny faint">
            Exportações individuais ficam na própria memória (menu de ações) e no perfil de cada
            pessoa. O PIN e a configuração de biometria nunca entram no backup.
          </p>
        </section>
      </div>
    </>
  );
}
