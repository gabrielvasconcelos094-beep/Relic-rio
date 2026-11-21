import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useArchive } from './ArchiveContext';
import type { FontScale, Palette, ThemeId, ThemeMode } from '@/db/types';
import { mix, readableOn } from '@/utils/color';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  /** Amostras para o seletor: fundo, superfície, destaque. */
  swatch: { light: [string, string, string]; dark: [string, string, string] };
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'relicario',
    name: 'Relicário',
    description: 'O original. Papel, tinta sépia e luz de fim de tarde.',
    swatch: { light: ['#f7f2e9', '#fffaf2', '#8a6a52'], dark: ['#191714', '#22201c', '#c9a384'] },
  },
  {
    id: 'herbario',
    name: 'Herbário',
    description:
      'Um álbum de botânica: verdes de folha seca, papel de algodão e etiquetas retas.',
    swatch: { light: ['#f2f3ec', '#fbfcf7', '#46663f'], dark: ['#13170f', '#1c211a', '#9dbe8c'] },
  },
  {
    id: 'candeia',
    name: 'Candeia',
    description: 'Ler à luz de lamparina: azul de fim de noite e um âmbar quente.',
    swatch: { light: ['#f1f0ea', '#fbfaf6', '#9a6418'], dark: ['#10151f', '#1a2130', '#e0a85c'] },
  },
  {
    id: 'porcelana',
    name: 'Porcelana',
    description: 'Louça fina guardada: brancos frios, azul de decalque, linhas finíssimas.',
    swatch: { light: ['#f6f6f8', '#ffffff', '#5a6a93'], dark: ['#16171c', '#1f2027', '#9fb0d8'] },
  },
];

export const FONT_SCALES: Record<FontScale, { label: string; value: number }> = {
  small: { label: 'Pequeno', value: 0.9 },
  default: { label: 'Padrão', value: 1 },
  large: { label: 'Grande', value: 1.15 },
  xlarge: { label: 'Muito grande', value: 1.32 },
};

/** Ponto de partida para a personalização de cores. */
export const BASE_PALETTES: Record<'light' | 'dark', Palette> = {
  light: {
    paper: '#f7f2e9',
    paperRaised: '#fffaf2',
    paperSunken: '#efe7da',
    ink: '#2f2a24',
    inkSoft: '#5d554b',
    inkFaint: '#8b8276',
    line: '#e1d7c7',
    accent: '#8a6a52',
    accentSoft: '#f0e4d8',
    sage: '#7f8f7a',
    terracotta: '#b1705a',
  },
  dark: {
    paper: '#191714',
    paperRaised: '#22201c',
    paperSunken: '#141210',
    ink: '#ece4d8',
    inkSoft: '#b7ad9e',
    inkFaint: '#897f71',
    line: '#322e28',
    accent: '#c9a384',
    accentSoft: '#2e2822',
    sage: '#93a38c',
    terracotta: '#c98b73',
  },
};

export const PALETTE_FIELDS: { key: keyof Palette; label: string; hint: string }[] = [
  { key: 'paper', label: 'Fundo', hint: 'A cor de fundo de todas as telas.' },
  { key: 'paperRaised', label: 'Superfícies e cartões', hint: 'Cartões, folhas e campos.' },
  { key: 'paperSunken', label: 'Superfícies recuadas', hint: 'Fundos de trilhas e seletores.' },
  { key: 'ink', label: 'Texto principal', hint: 'Títulos e corpo do texto.' },
  { key: 'inkSoft', label: 'Texto secundário', hint: 'Descrições e legendas.' },
  { key: 'inkFaint', label: 'Texto discreto', hint: 'Metadados e rótulos pequenos.' },
  { key: 'line', label: 'Linhas e bordas', hint: 'Divisórias e contornos.' },
  { key: 'accent', label: 'Cor principal', hint: 'Botões, links e elementos ativos.' },
  { key: 'accentSoft', label: 'Destaque suave', hint: 'Fundos de realce e chips ativos.' },
  { key: 'sage', label: 'Cor complementar', hint: 'Dias difíceis e gráficos.' },
  { key: 'terracotta', label: 'Cor de ênfase', hint: 'Favoritos e marcações pontuais.' },
];

/** Converte a paleta do usuário no conjunto completo de tokens CSS. */
export function paletteToTokens(palette: Palette, mode: 'light' | 'dark'): Record<string, string> {
  const dark = mode === 'dark';
  const toward = dark ? '#ffffff' : '#000000';
  const away = dark ? '#000000' : '#ffffff';
  return {
    '--paper': palette.paper,
    '--paper-raised': palette.paperRaised,
    '--paper-sunken': palette.paperSunken,
    '--ink': palette.ink,
    '--ink-soft': palette.inkSoft,
    '--ink-faint': palette.inkFaint,
    '--line': palette.line,
    '--line-strong': mix(palette.line, toward, 0.18),
    '--accent': palette.accent,
    '--accent-contrast': readableOn(palette.accent),
    '--accent-soft': palette.accentSoft,
    '--sage': palette.sage,
    '--sage-soft': mix(palette.sage, away, dark ? 0.78 : 0.84),
    '--terracotta': palette.terracotta,
    '--danger': dark ? '#d08273' : '#a5503f',
    '--cat-rosa': mix(palette.terracotta, '#b98a8a', 0.5),
    '--cat-salvia': palette.sage,
    '--cat-terracota': palette.terracotta,
    '--cat-areia': mix(palette.accent, palette.sage, 0.4),
    '--cat-tinta': palette.inkFaint,
    '--cat-musgo': mix(palette.sage, toward, 0.15),
  };
}

interface ThemeApi {
  themeId: ThemeId;
  mode: ThemeMode;
  /** Modo efetivo depois de resolver 'system'. */
  resolvedMode: 'light' | 'dark';
  fontScale: FontScale;
  /** Pré-visualização temporária: sobrepõe o tema salvo sem gravar nada. */
  preview: { theme: ThemeId; palette: Palette | null; mode: 'light' | 'dark' } | null;
  setPreview: (p: ThemeApi['preview']) => void;
  systemPrefersDark: boolean;
}

const ThemeContext = createContext<ThemeApi | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, ready } = useArchive();
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [preview, setPreview] = useState<ThemeApi['preview']>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setSystemPrefersDark(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const resolvedMode: 'light' | 'dark' =
    preview?.mode ??
    (settings.mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : settings.mode);

  const themeId = preview?.theme ?? settings.theme;

  // Aplica tema, modo e escala tipográfica no elemento raiz.
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.dataset.theme = themeId;
    root.dataset.mode = resolvedMode;
    root.style.setProperty('--font-scale', String(FONT_SCALES[settings.fontScale].value));

    const customPalette =
      preview?.palette ??
      (settings.theme === 'custom'
        ? resolvedMode === 'dark'
          ? settings.customDark
          : settings.customLight
        : null);

    // Limpa tokens de uma personalização anterior antes de aplicar a nova.
    for (const field of Object.keys(paletteToTokens(BASE_PALETTES.light, 'light'))) {
      root.style.removeProperty(field);
    }
    if (themeId === 'custom' && customPalette) {
      const tokens = paletteToTokens(customPalette, resolvedMode);
      for (const [key, value] of Object.entries(tokens)) root.style.setProperty(key, value);
    }

    const themeColor = getComputedStyle(root).getPropertyValue('--paper').trim();
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute('content', themeColor || '#f7f2e9');
    }
  }, [ready, themeId, resolvedMode, settings, preview]);

  // Densidade da lista e estilo dos cartões também são atributos globais.
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.density = settings.listDensity;
    document.documentElement.dataset.cardStyle = settings.memoryViewStyle;
  }, [ready, settings.listDensity, settings.memoryViewStyle]);

  const value = useMemo<ThemeApi>(
    () => ({
      themeId,
      mode: settings.mode,
      resolvedMode,
      fontScale: settings.fontScale,
      preview,
      setPreview,
      systemPrefersDark,
    }),
    [themeId, settings.mode, settings.fontScale, resolvedMode, preview, systemPrefersDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>.');
  return ctx;
}
