/** Modelos de domínio do Relicário. */

export type ID = string;

/** Data do acontecimento guardada como 'YYYY-MM-DD' (sem fuso, é uma data civil). */
export type CivilDate = string;

/**
 * Precisão da data do acontecimento.
 * - day:        o usuário sabe o dia exato.
 * - month:      sabe mês e ano; o dia guardado é apenas um ancoradouro e não deve ser exibido.
 * - year:       sabe só o ano.
 * - approximate: uma estimativa declarada como tal ("por volta de…").
 * - unknown:    não há data.
 */
export type DatePrecision = 'day' | 'month' | 'year' | 'approximate' | 'unknown';

export interface Memory {
  id: ID;
  title: string;
  /** Data em que o acontecimento se deu (pode ser muito anterior ao registro). */
  occurredAt: CivilDate | null;
  occurredPrecision: DatePrecision;
  /** Observação livre para datas aproximadas ("no inverno de 2019", "no fim do curso"). */
  occurredNote: string;
  /** Momento em que o registro entrou no arquivo (ISO completo). Nunca muda. */
  createdAt: string;
  /** Última modificação do registro (ISO completo). */
  updatedAt: string;
  /** Quando o conteúdo chegou ao aplicativo (compartilhamento externo), se diferente. */
  capturedAt: string | null;
  categoryIds: ID[];
  personIds: ID[];
  collectionIds: ID[];
  tags: string[];
  text: string;
  /** "Como isso me fez sentir?" */
  feeling: string;
  /** "Contexto ou história por trás desse momento" */
  context: string;
  /** Origem do registro (id de Source) ou null. */
  sourceId: ID | null;
  favorite: boolean;
  hardDay: boolean;
  /** Registro ainda não organizado: vive na Entrada. */
  inbox: boolean;
  /** Na lixeira desde (ISO). null = ativo. */
  deletedAt: string | null;
  /** Marca registros criados pelo conjunto de demonstração. */
  demo?: boolean;
}

export interface Person {
  id: ID;
  name: string;
  photoId: ID | null;
  metAt: CivilDate | null;
  description: string;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  demo?: boolean;
}

export interface Category {
  id: ID;
  name: string;
  color: string;
  icon: string;
  builtin: boolean;
  order: number;
}

/**
 * Coleção: agrupa memórias por significado, período ou tema escolhido pelo usuário.
 * Diferente de categoria, que classifica a natureza do registro.
 */
export interface Collection {
  id: ID;
  name: string;
  description: string;
  color: string;
  icon: string;
  /** Anexo usado como capa (pertence à coleção, ownerKind 'collection'). */
  coverId: ID | null;
  createdAt: string;
  updatedAt: string;
  demo?: boolean;
}

/** Origem de um registro: por onde a memória chegou. */
export interface Source {
  id: ID;
  name: string;
  icon: string;
  builtin: boolean;
  order: number;
}

export type AttachmentKind = 'image' | 'audio' | 'video' | 'pdf' | 'document' | 'other';

export interface Attachment {
  id: ID;
  /** Registro ao qual pertence; null = anexo de perfil/cápsula/coleção. */
  memoryId: ID | null;
  ownerKind: 'memory' | 'person' | 'capsule' | 'collection';
  ownerId: ID;
  name: string;
  mime: string;
  size: number;
  kind: AttachmentKind;
  caption: string;
  createdAt: string;
  blob: Blob;
  /** SHA-256 do conteúdo, em hexadecimal. Usado na verificação de integridade e no backup. */
  sha256: string | null;
  /** Texto extraído localmente (PDF, texto puro) para busca. Vazio quando não há. */
  textContent: string;
  /** Metadados próprios do elemento dentro de uma memória com vários elementos. */
  personId: ID | null;
  occurredAt: CivilDate | null;
  sourceId: ID | null;
  demo?: boolean;
}

/** Cápsula / carta para o futuro. */
export interface Capsule {
  id: ID;
  title: string;
  letter: string;
  memoryIds: ID[];
  /** Data a partir da qual a cápsula pode ser aberta ('YYYY-MM-DD'). */
  openAt: CivilDate;
  createdAt: string;
  updatedAt: string;
  openedAt: string | null;
  demo?: boolean;
}

export type HistoryKind =
  | 'created'
  | 'title'
  | 'text'
  | 'feeling'
  | 'context'
  | 'date'
  | 'people'
  | 'categories'
  | 'collections'
  | 'tags'
  | 'source'
  | 'favorite'
  | 'hardDay'
  | 'inbox'
  | 'attachment-added'
  | 'attachment-removed'
  | 'attachment-caption'
  | 'trashed'
  | 'restored';

/** Uma alteração registrada na vida de uma memória. */
export interface HistoryEntry {
  id: ID;
  memoryId: ID;
  at: string;
  kind: HistoryKind;
  /** Descrição curta para a interface. */
  summary: string;
  /** Valor anterior, quando restaurável (texto ou lista de ids serializada). */
  before: string | null;
  after: string | null;
  /** Campo de Memory ao qual `before` se aplica, quando restaurável. */
  field: string | null;
}

export type ReminderKind = 'collection' | 'memory' | 'custom';

export interface Reminder {
  id: ID;
  kind: ReminderKind;
  targetId: ID | null;
  title: string;
  /** Data civil do disparo. */
  at: CivilDate;
  /** Hora local 'HH:MM'. */
  time: string;
  repeat: 'none' | 'monthly' | 'yearly';
  enabled: boolean;
  lastFiredAt: string | null;
  createdAt: string;
}

/** Conteúdo recebido por compartilhamento e ainda não importado. */
export interface PendingShare {
  id: string;
  receivedAt: string;
  text: string;
  subject: string;
  /** Pacote de origem informado pelo Android, quando disponível. */
  sourcePackage: string | null;
  items: { name: string; mime: string; size: number; uri: string }[];
}

export type ThemeId = 'relicario' | 'herbario' | 'candeia' | 'porcelana' | 'custom';
export type ThemeMode = 'light' | 'dark' | 'system';
export type FontScale = 'small' | 'default' | 'large' | 'xlarge';
export type ListDensity = 'compact' | 'comfortable';
export type MemoryViewStyle = 'card' | 'quiet';
export type DefaultSort = 'occurred-desc' | 'occurred-asc' | 'created-desc' | 'title-asc';

/** Tokens de cor que o tema personalizado pode definir. */
export interface Palette {
  paper: string;
  paperRaised: string;
  paperSunken: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  line: string;
  accent: string;
  accentSoft: string;
  sage: string;
  terracotta: string;
}

export interface NotificationPrefs {
  enabled: boolean;
  onThisDay: boolean;
  capsules: boolean;
  reminders: boolean;
  /** Hora local das notificações diárias. */
  time: string;
  /** Quando falso, a notificação não revela título nem trecho da memória. */
  showContent: boolean;
}

export interface Settings {
  theme: ThemeId;
  mode: ThemeMode;
  customLight: Palette | null;
  customDark: Palette | null;
  fontScale: FontScale;
  listDensity: ListDensity;
  memoryViewStyle: MemoryViewStyle;
  galleryColumns: number;
  defaultSort: DefaultSort;
  /** Seções visíveis na tela inicial. */
  homeShowFeatured: boolean;
  homeShowQuickTiles: boolean;
  homeShowRecent: boolean;
  /** Hash PBKDF2 do PIN em base64; null = sem proteção. */
  pinHash: string | null;
  pinSalt: string | null;
  pinIterations: number;
  biometricEnabled: boolean;
  biometricCredentialId: string | null;
  lockOnBackground: boolean;
  lastBackupAt: string | null;
  notifications: NotificationPrefs;
  /** Widget da tela inicial pode mostrar conteúdo pessoal. */
  widgetShowContent: boolean;
  /** Dias de retenção na lixeira. */
  trashRetentionDays: number;
  /** Extrair texto de PDFs anexados para tornar a busca mais completa. */
  extractPdfText: boolean;
}

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  enabled: false,
  onThisDay: true,
  capsules: true,
  reminders: true,
  time: '09:00',
  showContent: false,
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'relicario',
  mode: 'system',
  customLight: null,
  customDark: null,
  fontScale: 'default',
  listDensity: 'comfortable',
  memoryViewStyle: 'card',
  galleryColumns: 3,
  defaultSort: 'occurred-desc',
  homeShowFeatured: true,
  homeShowQuickTiles: true,
  homeShowRecent: true,
  pinHash: null,
  pinSalt: null,
  pinIterations: 150000,
  biometricEnabled: false,
  biometricCredentialId: null,
  lockOnBackground: true,
  lastBackupAt: null,
  notifications: DEFAULT_NOTIFICATIONS,
  widgetShowContent: false,
  trashRetentionDays: 30,
  extractPdfText: true,
};
