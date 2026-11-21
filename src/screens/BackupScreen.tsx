import { useRef, useState } from 'react';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { Icon } from '@/components/Icon';
import { TopBar, Switch, Sheet } from '@/components/ui';
import {
  createBackup,
  deliverFile,
  inspectBackup,
  restoreBackup,
  type BackupInspection,
  type RestoreReport,
} from '@/utils/backup';
import { formatBytes } from '@/utils/stats';
import { formatTimestamp } from '@/utils/date';
import { cryptoAvailable } from '@/utils/crypto';

type Mode = 'replace' | 'merge';

export function BackupScreen() {
  const archive = useArchive();
  const { toast, confirm } = useUi();
  const { allMemories, people, attachments, collections, settings, updateSettings, reload } =
    archive;

  const [busy, setBusy] = useState<'backup' | 'inspect' | 'restore' | null>(null);
  const [encrypt, setEncrypt] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [lastResult, setLastResult] = useState<{
    ok: boolean;
    message: string;
    size: number;
    encrypted: boolean;
  } | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<BackupInspection | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreMode, setRestoreMode] = useState<Mode>('merge');
  const [applySettings, setApplySettings] = useState(true);
  const [report, setReport] = useState<RestoreReport | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalBytes = attachments.reduce((s, a) => s + a.size, 0);

  const makeBackup = async () => {
    if (encrypt) {
      if (password.length < 6) {
        toast('A senha do backup precisa de pelo menos 6 caracteres.', 'error');
        return;
      }
      if (password !== passwordAgain) {
        toast('As duas senhas não coincidem.', 'error');
        return;
      }
      const ok = await confirm({
        title: 'Guarde bem esta senha',
        message:
          'O backup é cifrado no seu aparelho com AES-256-GCM. Ninguém — nem o Relicário — consegue abrir o arquivo sem a senha. Se você perdê-la, o backup fica irrecuperável.',
        confirmLabel: 'Entendi, criar',
      });
      if (!ok) return;
    }

    setBusy('backup');
    setLastResult(null);
    try {
      const result = await createBackup(archive.snapshot(), {
        password: encrypt ? password : undefined,
      });
      const how = await deliverFile(result.blob, result.filename);
      await updateSettings({ lastBackupAt: new Date().toISOString() });
      setLastResult({
        ok: result.verification.ok,
        message: `${result.filename} · ${result.verification.message}`,
        size: result.blob.size,
        encrypted: result.encrypted,
      });
      setPassword('');
      setPasswordAgain('');
      toast(
        how === 'shared' ? 'Backup compartilhado.' : `Backup gerado: ${result.filename}`,
        result.verification.ok ? 'neutral' : 'error',
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast(err instanceof Error ? err.message : 'Não foi possível gerar o backup.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const openFile = async (picked: File) => {
    setFile(picked);
    setInspection(null);
    setReport(null);
    setRestorePassword('');
    setSheetOpen(true);
    setBusy('inspect');
    try {
      const result = await inspectBackup(picked);
      setInspection(result);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível ler o arquivo.', 'error');
      setSheetOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const unlock = async () => {
    if (!file) return;
    setBusy('inspect');
    try {
      const result = await inspectBackup(file, restorePassword);
      setInspection(result);
      toast('Backup aberto e verificado.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível abrir o backup.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const doRestore = async () => {
    if (!file || !inspection) return;
    const counts = inspection.manifest?.counts;
    const ok = await confirm({
      title: restoreMode === 'replace' ? 'Substituir o arquivo atual' : 'Mesclar com o arquivo atual',
      message:
        restoreMode === 'replace'
          ? `Tudo que está neste aparelho será apagado e substituído pelo backup (${counts?.memories ?? 0} memórias, ${counts?.attachments ?? 0} anexos). A gravação é feita de uma vez só: se algo falhar, nada é alterado.`
          : `Os registros do backup serão acrescentados. Registros com o mesmo identificador ficam com a versão do backup; os demais permanecem como estão.`,
      confirmLabel: restoreMode === 'replace' ? 'Substituir' : 'Mesclar',
      destructive: restoreMode === 'replace',
    });
    if (!ok) return;

    setBusy('restore');
    try {
      const result = await restoreBackup(file, {
        mode: restoreMode,
        password: restorePassword || undefined,
        force: !inspection.ok,
        applySettings,
      });
      if (result.settings) await updateSettings(result.settings);
      await reload();
      setReport(result.report);
      setSheetOpen(false);
      toast(
        `Restauração concluída: ${result.report.memories} memórias e ${result.report.attachments} anexos.`,
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
          O backup é um arquivo único com todos os registros em texto legível e a pasta de anexos
          com os arquivos originais. Cada anexo leva seu SHA-256, conferido na hora de restaurar.
        </p>

        <section className="card card-pad stack">
          <div className="row">
            <Icon name="archive" />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>Conteúdo atual</strong>
              <span className="tiny faint">
                {allMemories.length} memórias · {people.length} pessoas · {collections.length}{' '}
                coleções · {attachments.length} anexos · {formatBytes(totalBytes)}
              </span>
            </div>
          </div>
          {settings.lastBackupAt && (
            <p className="tiny faint">
              Último backup gerado em {formatTimestamp(settings.lastBackupAt)}.
            </p>
          )}

          <Switch
            label="Proteger com senha"
            description={
              cryptoAvailable()
                ? 'Cifra o backup inteiro com AES-256-GCM, com a chave derivada da senha (PBKDF2, 310 mil iterações).'
                : 'Este dispositivo não oferece a criptografia necessária.'
            }
            checked={encrypt}
            disabled={!cryptoAvailable()}
            onChange={setEncrypt}
          />

          {encrypt && (
            <>
              <div className="field">
                <label htmlFor="bkp-senha">Senha do backup</label>
                <input
                  id="bkp-senha"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="bkp-senha2">Repita a senha</label>
                <input
                  id="bkp-senha2"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={passwordAgain}
                  onChange={(e) => setPasswordAgain(e.target.value)}
                />
              </div>
              <p className="tiny" style={{ color: 'var(--danger)' }}>
                Perder esta senha significa perder o backup. Não há recuperação possível.
              </p>
            </>
          )}

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={busy !== null || allMemories.length + people.length === 0}
            onClick={() => void makeBackup()}
          >
            <Icon name="download" size={18} />
            {busy === 'backup' ? 'Gerando backup…' : 'Criar backup completo'}
          </button>
          {allMemories.length + people.length === 0 && (
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
              <p className="tiny faint">
                {formatBytes(lastResult.size)}
                {lastResult.encrypted ? ' · criptografado' : ''}
              </p>
            </div>
          )}
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Restaurar</h2>
          </div>
          <button
            type="button"
            className="btn btn-block"
            disabled={busy !== null}
            onClick={() => fileRef.current?.click()}
          >
            <Icon name="upload" size={18} />
            Escolher arquivo de backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,.relicario,application/zip,application/octet-stream"
            className="hidden-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void openFile(f);
              e.target.value = '';
            }}
          />
          <p className="tiny faint" style={{ marginTop: 8 }}>
            O arquivo é verificado antes de qualquer gravação: formato, contagens e o hash de cada
            anexo.
          </p>

          {report && (
            <div className="card card-pad" style={{ marginTop: 12, borderColor: 'var(--sage)' }}>
              <strong className="small">Restauração concluída</strong>
              <p className="tiny" style={{ marginTop: 6 }}>
                {report.memories} memórias · {report.people} pessoas · {report.collections}{' '}
                coleções · {report.attachments} anexos · {report.capsules} cápsulas ·{' '}
                {report.history} entradas de histórico
                {report.skippedFiles > 0
                  ? ` · ${report.skippedFiles} anexos não puderam ser recuperados`
                  : ''}
                . Formato {report.version}, modo{' '}
                {report.mode === 'replace' ? 'substituição' : 'mesclagem'}.
              </p>
            </div>
          )}
        </section>

        <section className="card card-pad">
          <p className="tiny faint">
            Exportações individuais ficam na própria memória (menu de ações) e no perfil de cada
            pessoa. O PIN e a biometria nunca entram no backup.
          </p>
        </section>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Restaurar backup">
        <div className="stack-lg">
          {busy === 'inspect' && <p className="muted small">Verificando o arquivo…</p>}

          {inspection?.encrypted && !inspection.manifest && (
            <div className="stack">
              <div className="row">
                <Icon name="lock" size={17} style={{ color: 'var(--accent)' }} />
                <strong className="small">Backup protegido por senha</strong>
              </div>
              {inspection.createdAt && (
                <p className="tiny faint">Criado em {formatTimestamp(inspection.createdAt)}.</p>
              )}
              <div className="field">
                <label htmlFor="rest-senha">Senha</label>
                <input
                  id="rest-senha"
                  className="input"
                  type="password"
                  autoComplete="off"
                  value={restorePassword}
                  onChange={(e) => setRestorePassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void unlock();
                  }}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={busy !== null || !restorePassword}
                onClick={() => void unlock()}
              >
                Abrir backup
              </button>
            </div>
          )}

          {inspection?.manifest && (
            <>
              <div className="card card-pad">
                <strong className="small">Conteúdo do backup</strong>
                <p className="tiny faint" style={{ marginTop: 6 }}>
                  Criado em {formatTimestamp(inspection.manifest.exportedAt)} · formato{' '}
                  {inspection.manifest.version}
                  {inspection.encrypted ? ' · criptografado' : ''}
                </p>
                <p className="tiny" style={{ marginTop: 6 }}>
                  {inspection.manifest.counts.memories} memórias ·{' '}
                  {inspection.manifest.counts.people} pessoas ·{' '}
                  {inspection.manifest.counts.collections} coleções ·{' '}
                  {inspection.manifest.counts.attachments} anexos ·{' '}
                  {inspection.manifest.counts.capsules} cápsulas
                </p>
                <div className="row" style={{ marginTop: 8 }}>
                  <Icon
                    name={inspection.ok ? 'check' : 'info'}
                    size={15}
                    style={{ color: inspection.ok ? 'var(--sage)' : 'var(--danger)' }}
                  />
                  <span className="tiny" style={{ flex: 1 }}>
                    {inspection.ok
                      ? `${inspection.files.present} de ${inspection.files.expected} anexos presentes, todos com o hash correto.`
                      : inspection.problems.join(' ')}
                  </span>
                </div>
              </div>

              <div className="field">
                <label>Como restaurar</label>
                <div className="segmented" role="group" aria-label="Modo de restauração">
                  <button
                    type="button"
                    aria-pressed={restoreMode === 'merge'}
                    onClick={() => setRestoreMode('merge')}
                  >
                    Mesclar
                  </button>
                  <button
                    type="button"
                    aria-pressed={restoreMode === 'replace'}
                    onClick={() => setRestoreMode('replace')}
                  >
                    Substituir
                  </button>
                </div>
                <span className="hint">
                  {restoreMode === 'merge'
                    ? 'Acrescenta o conteúdo do backup ao que já existe. Registros com o mesmo identificador são atualizados, e não duplicados.'
                    : 'Apaga o arquivo atual deste aparelho antes de restaurar.'}
                </span>
              </div>

              <Switch
                label="Restaurar também as preferências"
                description="Tema, tipografia, ordenação e opções de notificação guardados no backup."
                checked={applySettings}
                onChange={setApplySettings}
              />

              {!inspection.ok && (
                <p className="tiny" style={{ color: 'var(--danger)' }}>
                  O backup tem problemas. Se continuar, o que estiver íntegro será restaurado e o
                  restante será informado ao final.
                </p>
              )}

              <button
                type="button"
                className={restoreMode === 'replace' ? 'btn btn-danger btn-block' : 'btn btn-primary btn-block'}
                disabled={busy !== null}
                onClick={() => void doRestore()}
              >
                {busy === 'restore'
                  ? 'Restaurando…'
                  : restoreMode === 'replace'
                    ? 'Substituir tudo pelo backup'
                    : 'Mesclar com o arquivo atual'}
              </button>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
