import type { SVGProps } from 'react';

const paths: Record<string, string> = {
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  archive: 'M4 7h16M5 7v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7M4 7l1.2-2.4A1 1 0 0 1 6.1 4h11.8a1 1 0 0 1 .9.6L20 7M10 11h4',
  people: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM21 20v-1.5a4 4 0 0 0-3-3.87M16.5 4.2a3.25 3.25 0 0 1 0 6.1',
  shelter: 'M12 12v6.5a2 2 0 0 0 4 0M3.5 12a8.5 8.5 0 0 1 17 0ZM12 3.5V12',
  chart: 'M4 20h16M7 20v-7M12 20V7M17 20v-4',
  plus: 'M12 5v14M5 12h14',
  search: 'm20 20-3.6-3.6M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  back: 'M15 5l-7 7 7 7',
  forward: 'm9 5 7 7-7 7',
  close: 'M6 6l12 12M18 6 6 18',
  heart: 'M12 20s-7.5-4.6-7.5-9.7A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.7C19.5 15.4 12 20 12 20Z',
  star: 'm12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.6-.8z',
  calendar: 'M4 8h16M7 4v3m10-3v3M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  shuffle: 'M16 4h4v4M4 20 20 4M4 4l5 5M20 20h-4v-4M15 15l5 5',
  image: 'M5 19h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Zm0 0 6-6 3 3 2-2 4 4M9.5 9.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
  audio: 'M11 5 6.5 9H3v6h3.5L11 19zM15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10',
  video: 'M4 7h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm12 4 5-3v8l-5-3z',
  pdf: 'M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 0v5h5M9 14h6M9 17h4',
  file: 'M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 0v5h5',
  tag: 'M4 11.5V5a1 1 0 0 1 1-1h6.5a1 1 0 0 1 .7.3l7.5 7.5a1 1 0 0 1 0 1.4l-6.5 6.5a1 1 0 0 1-1.4 0L4.3 12.2a1 1 0 0 1-.3-.7ZM8.5 8.5h.01',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-2-1.2L14.6 3h-4l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7.5 7.5 0 0 0 0 2.5l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z',
  edit: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3ZM14.5 6.5l3 3',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
  download: 'M12 4v11m0 0 4-4m-4 4-4-4M5 19h14',
  upload: 'M12 16V5m0 0 4 4m-4-4-4 4M5 19h14',
  lock: 'M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Zm2 0V8a4 4 0 0 1 8 0v3',
  unlock: 'M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Zm2 0V8a4 4 0 0 1 7.5-2',
  fingerprint: 'M12 11v2a7 7 0 0 1-1.2 4M8 8.6a5 5 0 0 1 8 4.4 13 13 0 0 1-.6 4M5.5 15.5A9 9 0 0 1 5 13a7 7 0 0 1 3-5.8M12 16v.01M19 13a7 7 0 0 0-3.3-6',
  filter: 'M4 6h16M7 12h10M10 18h4',
  check: 'm5 12.5 4.5 4.5L19 7',
  letter: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm0 1.5 8 6 8-6',
  capsule: 'M8 3h8v3.2a4 4 0 0 1-.6 2.1L14 10.6a4 4 0 0 0 0 4.2l1.4 2.3a4 4 0 0 1 .6 2.1V21H8v-1.8a4 4 0 0 1 .6-2.1l1.4-2.3a4 4 0 0 0 0-4.2L8.6 8.3A4 4 0 0 1 8 6.2Z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M4 7h16M4 12h16M4 17h16',
  timeline: 'M7 4v16M7 8h13M7 14h9M4.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM4.5 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  book: 'M5 4h9a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H5zM5 4v13.5M19 7v13',
  leaf: 'M20 4c-9 0-14 4-14 10a6 6 0 0 0 1.5 4M6 20C8 12 13 8 20 4',
  info: 'M12 11v5m0-8.5v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  box: 'M4 8.5 12 4l8 4.5M4 8.5V17l8 4.5M4 8.5 12 13m8-4.5V17l-8 4.5M20 8.5 12 13m0 0v8.5',
  candle: 'M9 10h6v10H9zM12 10V7M12 4s1.5 1.3 1.5 2.2A1.5 1.5 0 0 1 12 7.5a1.5 1.5 0 0 1-1.5-1.3C10.5 5.3 12 4 12 4Z',
  quote: 'M9 7c-2.5 1-4 3-4 6h3v4H4v-4m15-6c-2.5 1-4 3-4 6h3v4h-4v-4',
  hands: 'M8 13V6.5a1.5 1.5 0 0 1 3 0V12m0-5.5a1.5 1.5 0 0 1 3 0V12m0-4.2a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L5 15a1.6 1.6 0 0 1 2.6-1.8L8 14',
  laurel: 'M12 21s-5-2.5-5-8V5l5 2 5-2v8c0 5.5-5 8-5 8Z',
  light: 'M12 3v2M5.6 5.6l1.4 1.4M3 12h2m14 0h2M17 7l1.4-1.4M12 19v2M9.5 16.5h5M10 14a3.5 3.5 0 1 1 4 0v1.5h-4z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2m0 16v2M4 12H2m20 0h-2M5.6 5.6 4.2 4.2m15.6 15.6-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  dots: 'M12 6.01V6m0 6.01V12m0 6.01V18',
};

export type IconName = keyof typeof paths | string;

interface Props extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...rest }: Props) {
  const d = paths[name] ?? paths.file;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}

/** Ícones das categorias (nomes usados em db/defaults). */
export const CATEGORY_ICON_MAP: Record<string, string> = {
  coracao: 'heart',
  maos: 'hands',
  casa: 'home',
  folha: 'leaf',
  aspas: 'quote',
  calendario: 'calendar',
  vela: 'candle',
  caixa: 'box',
  estrela: 'star',
  louros: 'laurel',
  luz: 'light',
  arquivo: 'archive',
};
