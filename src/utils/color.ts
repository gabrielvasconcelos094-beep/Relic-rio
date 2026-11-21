/** Utilidades de cor: validação, contraste WCAG e derivação de tokens. */

export function isHex(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function normalizeHex(value: string): string {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return v;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const v = normalizeHex(hex);
  if (!/^#[0-9a-f]{6}$/.test(v)) return null;
  return {
    r: parseInt(v.slice(1, 3), 16),
    g: parseInt(v.slice(3, 5), 16),
    b: parseInt(v.slice(5, 7), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function channelLuminance(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  );
}

/** Razão de contraste WCAG entre duas cores (1 a 21). */
export function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

export type ContrastLevel = 'AAA' | 'AA' | 'AA-grande' | 'insuficiente';

export function contrastLevel(ratio: number, largeText = false): ContrastLevel {
  if (largeText) {
    if (ratio >= 4.5) return 'AAA';
    if (ratio >= 3) return 'AA';
    return 'insuficiente';
  }
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-grande';
  return 'insuficiente';
}

/** Escurece ou clareia uma cor em direção ao preto/branco. */
export function mix(hex: string, towards: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(towards);
  if (!a || !b) return hex;
  return rgbToHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount,
  );
}

/**
 * Sugere a cor de texto (preto ou branco) com melhor contraste sobre o fundo.
 * Usada para o texto dentro de botões com a cor de destaque.
 */
export function readableOn(background: string): string {
  const onWhite = contrastRatio(background, '#ffffff') ?? 1;
  const onBlack = contrastRatio(background, '#111111') ?? 1;
  return onWhite >= onBlack ? '#ffffff' : '#111111';
}

/** Procura a variação mais próxima da cor que alcance o contraste mínimo pedido. */
export function suggestAccessible(
  color: string,
  background: string,
  minRatio = 4.5,
): string | null {
  const current = contrastRatio(color, background);
  if (current === null) return null;
  if (current >= minRatio) return null;
  const bgLum = relativeLuminance(background) ?? 0;
  const towards = bgLum > 0.5 ? '#000000' : '#ffffff';
  for (let step = 0.05; step <= 1; step += 0.05) {
    const candidate = mix(color, towards, step);
    const ratio = contrastRatio(candidate, background);
    if (ratio !== null && ratio >= minRatio) return candidate;
  }
  return towards;
}
