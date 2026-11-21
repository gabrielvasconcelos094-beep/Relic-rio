import { useEffect, useState } from 'react';
import { useArchive } from '@/state/ArchiveContext';
import { Icon } from '@/components/Icon';
import { verifyBiometric, verifyPin } from '@/utils/lock';

const PIN_LENGTH_MIN = 4;

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { settings } = useArchive();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const tryBiometric = async () => {
    if (!settings.biometricEnabled || !settings.biometricCredentialId) return;
    try {
      const ok = await verifyBiometric(settings.biometricCredentialId);
      if (ok) onUnlock();
    } catch {
      setError('Não foi possível usar a biometria. Use o PIN.');
    }
  };

  useEffect(() => {
    void tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (value: string) => {
    if (!settings.pinHash || !settings.pinSalt) return;
    setChecking(true);
    try {
      const ok = await verifyPin(value, settings.pinHash, settings.pinSalt, settings.pinIterations);
      if (ok) onUnlock();
      else {
        setError('PIN incorreto.');
        setPin('');
      }
    } catch {
      setError('Não foi possível verificar o PIN neste dispositivo.');
    } finally {
      setChecking(false);
    }
  };

  const press = (digit: string) => {
    setError('');
    const next = `${pin}${digit}`.slice(0, 8);
    setPin(next);
  };

  return (
    <div className="lock-screen">
      <Icon name="lock" size={30} style={{ color: 'var(--accent)' }} />
      <div>
        <h1 className="serif">Relicário</h1>
        <p className="muted small" style={{ marginTop: 6 }}>
          Digite seu PIN para abrir o arquivo.
        </p>
      </div>

      <div className="pin-dots" aria-hidden="true">
        {Array.from({ length: Math.max(PIN_LENGTH_MIN, pin.length) }).map((_, i) => (
          <span key={i} className={i < pin.length ? 'pin-dot on' : 'pin-dot'} />
        ))}
      </div>

      <label className="tiny faint" htmlFor="pin-input" style={{ marginTop: -6 }}>
        PIN
      </label>
      <input
        id="pin-input"
        className="input"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        style={{ maxWidth: 220, textAlign: 'center', letterSpacing: '0.4em' }}
        onChange={(e) => {
          setError('');
          setPin(e.target.value.replace(/\D/g, '').slice(0, 8));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && pin.length >= PIN_LENGTH_MIN) void submit(pin);
        }}
      />

      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <button
          type="button"
          className="blank"
          aria-label="Apagar"
          onClick={() => setPin((p) => p.slice(0, -1))}
        >
          <Icon name="back" size={20} />
        </button>
        <button type="button" onClick={() => press('0')}>
          0
        </button>
        <button
          type="button"
          className="blank"
          aria-label="Confirmar"
          disabled={pin.length < PIN_LENGTH_MIN || checking}
          onClick={() => void submit(pin)}
        >
          <Icon name="check" size={22} />
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {settings.biometricEnabled && settings.biometricCredentialId && (
        <button type="button" className="btn btn-quiet" onClick={() => void tryBiometric()}>
          <Icon name="fingerprint" size={18} />
          Usar biometria
        </button>
      )}
    </div>
  );
}
