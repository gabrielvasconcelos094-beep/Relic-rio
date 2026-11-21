import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface Toast {
  id: number;
  message: string;
  tone: 'neutral' | 'error';
}

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface UiApi {
  toast: (message: string, tone?: 'neutral' | 'error') => void;
  confirm: (request: ConfirmRequest) => Promise<boolean>;
}

const UiContext = createContext<UiApi | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<
    (ConfirmRequest & { resolve: (v: boolean) => void }) | null
  >(null);
  const counter = useRef(0);

  const toast = useCallback((message: string, tone: 'neutral' | 'error' = 'neutral') => {
    counter.current += 1;
    const id = counter.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3600);
  }, []);

  const confirm = useCallback(
    (request: ConfirmRequest) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...request, resolve });
      }),
    [],
  );

  const api = useMemo<UiApi>(() => ({ toast, confirm }), [toast, confirm]);

  const settle = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <UiContext.Provider value={api}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-area" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={t.tone === 'error' ? 'toast error' : 'toast'}>
              {t.message}
            </div>
          ))}
        </div>
      )}
      {pending && (
        <div
          className="dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={pending.title}
          onClick={(e) => {
            if (e.target === e.currentTarget) settle(false);
          }}
        >
          <div className="dialog">
            <h2 style={{ marginBottom: 8 }}>{pending.title}</h2>
            <p className="muted small">{pending.message}</p>
            <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-quiet" onClick={() => settle(false)}>
                {pending.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                type="button"
                className={pending.destructive ? 'btn btn-danger' : 'btn btn-primary'}
                onClick={() => settle(true)}
              >
                {pending.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </UiContext.Provider>
  );
}

export function useUi(): UiApi {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi precisa estar dentro de <UiProvider>.');
  return ctx;
}
