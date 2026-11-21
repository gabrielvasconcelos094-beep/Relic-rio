import { useEffect, useState } from 'react';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { useLock } from '@/state/LockContext';
import { Icon } from '@/components/Icon';
import { TopBar, Switch } from '@/components/ui';
import {
  biometricsAvailable,
  cryptoAvailable,
  derivePin,
  registerBiometric,
  verifyPin,
} from '@/utils/lock';

export function SecurityScreen() {
  const { settings, updateSettings } = useArchive();
  const { toast, confirm } = useUi();
  const { unlock } = useLock();
  const [bioSupported, setBioSupported] = useState<boolean | null>(null);
  const [current, setCurrent] = useState('');
  const [pin, setPin] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void biometricsAvailable().then(setBioSupported);
  }, []);

  const hasPin = Boolean(settings.pinHash);

  const setNewPin = async () => {
    setError('');
    if (!cryptoAvailable()) {
      setError('Este dispositivo não oferece a criptografia necessária.');
      return;
    }
    if (!/^\d{4,8}$/.test(pin)) {
      setError('O PIN deve ter de 4 a 8 dígitos.');
      return;
    }
    if (pin !== again) {
      setError('Os dois PINs não coincidem.');
      return;
    }
    setBusy(true);
    try {
      if (hasPin) {
        const ok = await verifyPin(
          current,
          settings.pinHash!,
          settings.pinSalt!,
          settings.pinIterations,
        );
        if (!ok) {
          setError('O PIN atual está incorreto.');
          return;
        }
      }
      const derived = await derivePin(pin);
      // Quem acabou de definir o PIN continua com o arquivo aberto nesta sessão.
      unlock();
      await updateSettings({
        pinHash: derived.hash,
        pinSalt: derived.salt,
        pinIterations: derived.iterations,
      });
      setPin('');
      setAgain('');
      setCurrent('');
      toast(hasPin ? 'PIN alterado.' : 'PIN ativado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível definir o PIN.');
    } finally {
      setBusy(false);
    }
  };

  const removePin = async () => {
    setError('');
    setBusy(true);
    try {
      const ok = await verifyPin(
        current,
        settings.pinHash!,
        settings.pinSalt!,
        settings.pinIterations,
      );
      if (!ok) {
        setError('O PIN atual está incorreto.');
        return;
      }
      const confirmed = await confirm({
        title: 'Remover proteção',
        message: 'O arquivo passará a abrir sem PIN neste aparelho.',
        confirmLabel: 'Remover',
        destructive: true,
      });
      if (!confirmed) return;
      await updateSettings({
        pinHash: null,
        pinSalt: null,
        biometricEnabled: false,
        biometricCredentialId: null,
      });
      setCurrent('');
      toast('Proteção removida.');
    } finally {
      setBusy(false);
    }
  };

  const toggleBiometric = async (value: boolean) => {
    if (!value) {
      await updateSettings({ biometricEnabled: false, biometricCredentialId: null });
      return;
    }
    try {
      const credentialId = await registerBiometric();
      await updateSettings({ biometricEnabled: true, biometricCredentialId: credentialId });
      toast('Desbloqueio por biometria ativado.');
    } catch (err) {
      toast(
        err instanceof Error
          ? `Não foi possível ativar a biometria: ${err.message}`
          : 'Não foi possível ativar a biometria.',
        'error',
      );
    }
  };

  return (
    <>
      <TopBar title="Proteção do aplicativo" />
      <div className="page stack-lg" style={{ paddingTop: 6 }}>
        <p className="muted small">
          O PIN protege a abertura do arquivo neste aparelho. Os registros continuam guardados
          localmente e não são enviados a nenhum servidor.
        </p>

        <section className="card card-pad stack">
          <div className="row">
            <Icon name={hasPin ? 'lock' : 'unlock'} />
            <strong style={{ flex: 1 }}>{hasPin ? 'PIN ativo' : 'Sem PIN'}</strong>
          </div>

          {hasPin && (
            <div className="field">
              <label htmlFor="pin-atual">PIN atual</label>
              <input
                id="pin-atual"
                className="input"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={current}
                onChange={(e) => setCurrent(e.target.value.replace(/\D/g, '').slice(0, 8))}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="pin-novo">{hasPin ? 'Novo PIN' : 'PIN'}</label>
            <input
              id="pin-novo"
              className="input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="4 a 8 dígitos"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            />
          </div>

          <div className="field">
            <label htmlFor="pin-repete">Repita</label>
            <input
              id="pin-repete"
              className="input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={again}
              onChange={(e) => setAgain(e.target.value.replace(/\D/g, '').slice(0, 8))}
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={busy}
            onClick={() => void setNewPin()}
          >
            {hasPin ? 'Alterar PIN' : 'Ativar PIN'}
          </button>

          {hasPin && (
            <button
              type="button"
              className="btn btn-danger btn-block"
              disabled={busy}
              onClick={() => void removePin()}
            >
              Remover proteção
            </button>
          )}
        </section>

        <section className="card card-pad">
          <Switch
            label="Desbloquear com biometria"
            description={
              bioSupported === null
                ? 'Verificando o suporte do aparelho…'
                : bioSupported
                  ? 'Usa a digital ou o rosto cadastrados no próprio aparelho. O PIN continua como alternativa.'
                  : 'Este aparelho ou navegador não oferece biometria para aplicativos. Use o PIN.'
            }
            checked={settings.biometricEnabled}
            disabled={!hasPin || bioSupported !== true}
            onChange={(v) => void toggleBiometric(v)}
          />
          {!hasPin && (
            <p className="tiny faint" style={{ marginTop: 8 }}>
              Ative um PIN primeiro — ele é a alternativa caso a biometria falhe.
            </p>
          )}
        </section>

        <section className="card card-pad">
          <p className="small muted">
            Se você esquecer o PIN, não há como recuperá-lo: ele nunca é guardado em texto, apenas
            como uma derivação criptográfica. Mantenha um backup do arquivo em local seguro — o
            backup não inclui o PIN.
          </p>
        </section>
      </div>
    </>
  );
}
