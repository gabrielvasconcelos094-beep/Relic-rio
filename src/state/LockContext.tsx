import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface LockApi {
  unlocked: boolean;
  /** Marca a sessão atual como desbloqueada (usado após acertar o PIN ou ao defini-lo). */
  unlock: () => void;
  lock: () => void;
}

const LockContext = createContext<LockApi | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const api = useMemo<LockApi>(
    () => ({ unlocked, unlock: () => setUnlocked(true), lock: () => setUnlocked(false) }),
    [unlocked],
  );
  return <LockContext.Provider value={api}>{children}</LockContext.Provider>;
}

export function useLock(): LockApi {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock precisa estar dentro de <LockProvider>.');
  return ctx;
}
