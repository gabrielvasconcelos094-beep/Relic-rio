export function newId(prefix = ''): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix ? `${prefix}_${rnd}` : rnd;
}

/** Inteiro aleatório criptograficamente seguro em [0, max). */
export function randomInt(max: number): number {
  if (max <= 0) return 0;
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const limit = Math.floor(0xffffffff / max) * max;
    const buf = new Uint32Array(1);
    let v = 0;
    do {
      crypto.getRandomValues(buf);
      v = buf[0];
    } while (v >= limit);
    return v % max;
  }
  return Math.floor(Math.random() * max);
}

/** Escolhe um item aleatório evitando repetir os recentes, quando houver alternativa. */
export function pickRandom<T>(items: T[], recentKeys: string[], keyOf: (item: T) => string): T | null {
  if (!items.length) return null;
  if (items.length === 1) return items[0];
  const recent = new Set(recentKeys);
  const fresh = items.filter((i) => !recent.has(keyOf(i)));
  const pool = fresh.length ? fresh : items;
  return pool[randomInt(pool.length)];
}
