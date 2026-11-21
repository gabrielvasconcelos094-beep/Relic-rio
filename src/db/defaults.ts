import type { Category } from './types';

/** Categorias iniciais. Podem ser renomeadas, recoloridas ou removidas pelo usuário. */
export const BUILTIN_CATEGORIES: Category[] = [
  { id: 'cat_afeto', name: 'Afeto', color: 'rosa', icon: 'coracao', builtin: true, order: 0 },
  { id: 'cat_amizade', name: 'Amizade', color: 'salvia', icon: 'maos', builtin: true, order: 1 },
  { id: 'cat_familia', name: 'Família', color: 'terracota', icon: 'casa', builtin: true, order: 2 },
  { id: 'cat_gentilezas', name: 'Gentilezas', color: 'areia', icon: 'folha', builtin: true, order: 3 },
  { id: 'cat_palavras', name: 'Palavras', color: 'tinta', icon: 'aspas', builtin: true, order: 4 },
  { id: 'cat_datas', name: 'Datas especiais', color: 'musgo', icon: 'calendario', builtin: true, order: 5 },
  { id: 'cat_aniversarios', name: 'Aniversários', color: 'rosa', icon: 'vela', builtin: true, order: 6 },
  { id: 'cat_presentes', name: 'Presentes', color: 'terracota', icon: 'caixa', builtin: true, order: 7 },
  { id: 'cat_momentos', name: 'Momentos especiais', color: 'salvia', icon: 'estrela', builtin: true, order: 8 },
  { id: 'cat_conquistas', name: 'Conquistas', color: 'musgo', icon: 'louros', builtin: true, order: 9 },
  { id: 'cat_gratidao', name: 'Gratidão', color: 'areia', icon: 'luz', builtin: true, order: 10 },
  { id: 'cat_outros', name: 'Outros', color: 'tinta', icon: 'arquivo', builtin: true, order: 11 },
];

/** Paleta discreta usada pelas categorias. */
export const CATEGORY_COLORS: Record<string, { label: string; token: string }> = {
  rosa: { label: 'Rosa antigo', token: '--cat-rosa' },
  salvia: { label: 'Verde-sálvia', token: '--cat-salvia' },
  terracota: { label: 'Terracota', token: '--cat-terracota' },
  areia: { label: 'Areia', token: '--cat-areia' },
  tinta: { label: 'Tinta', token: '--cat-tinta' },
  musgo: { label: 'Musgo', token: '--cat-musgo' },
};

export const CATEGORY_ICONS = [
  'coracao', 'maos', 'casa', 'folha', 'aspas', 'calendario',
  'vela', 'caixa', 'estrela', 'louros', 'luz', 'arquivo',
] as const;

export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

/** Origens iniciais. O usuário pode renomear, remover e criar outras. */
export const BUILTIN_SOURCES: { id: string; name: string; icon: string; builtin: boolean; order: number }[] = [
  { id: 'src_whatsapp', name: 'WhatsApp', icon: 'chat', builtin: true, order: 0 },
  { id: 'src_telegram', name: 'Telegram', icon: 'chat', builtin: true, order: 1 },
  { id: 'src_instagram', name: 'Instagram', icon: 'image', builtin: true, order: 2 },
  { id: 'src_email', name: 'E-mail', icon: 'letter', builtin: true, order: 3 },
  { id: 'src_carta', name: 'Carta manuscrita', icon: 'letter', builtin: true, order: 4 },
  { id: 'src_presencial', name: 'Conversa presencial', icon: 'hands', builtin: true, order: 5 },
  { id: 'src_presente', name: 'Presente físico', icon: 'box', builtin: true, order: 6 },
  { id: 'src_fotografia', name: 'Fotografia', icon: 'image', builtin: true, order: 7 },
  { id: 'src_outro', name: 'Outro', icon: 'archive', builtin: true, order: 8 },
];

/**
 * Pacotes Android cuja origem pode ser deduzida com segurança a partir do
 * compartilhamento. Qualquer pacote fora desta lista NÃO recebe origem automática.
 */
export const PACKAGE_TO_SOURCE: Record<string, string> = {
  'com.whatsapp': 'src_whatsapp',
  'com.whatsapp.w4b': 'src_whatsapp',
  'org.telegram.messenger': 'src_telegram',
  'org.thunderdog.challegram': 'src_telegram',
  'com.instagram.android': 'src_instagram',
  'com.google.android.gm': 'src_email',
};

/** Ícones disponíveis para coleções. */
export const COLLECTION_ICONS = [
  'book', 'star', 'heart', 'letter', 'box', 'leaf', 'light', 'capsule', 'archive', 'calendar',
] as const;
