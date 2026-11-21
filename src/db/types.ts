/** Modelos de domínio do Relicário. */

export type ID = string;

/** Data do acontecimento guardada como 'YYYY-MM-DD' (sem fuso, é uma data civil). */
export type CivilDate = string;

export interface Memory {
  id: ID;
  title: string;
  /** Data em que o acontecimento se deu (pode ser muito anterior ao registro). */
  occurredAt: CivilDate | null;
  /** Precisão da data informada pelo usuário. */
  occurredPrecision: 'day' | 'month' | 'year' | 'unknown';
  /** Momento em que o registro entrou no arquivo (ISO completo). */
  createdAt: string;
  updatedAt: string;
  categoryIds: ID[];
  personIds: ID[];
  tags: string[];
  text: string;
  /** "Como isso me fez sentir?" */
  feeling: string;
  /** "Contexto ou história por trás desse momento" */
  context: string;
  favorite: boolean;
  hardDay: boolean;
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

export type AttachmentKind = 'image' | 'audio' | 'video' | 'pdf' | 'document' | 'other';

export interface Attachment {
  id: ID;
  /** Registro ao qual pertence; null = anexo de perfil/cápsula. */
  memoryId: ID | null;
  ownerKind: 'memory' | 'person' | 'capsule';
  ownerId: ID;
  name: string;
  mime: string;
  size: number;
  kind: AttachmentKind;
  caption: string;
  createdAt: string;
  blob: Blob;
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

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Settings {
  theme: ThemeMode;
  /** Hash PBKDF2 do PIN em base64; null = sem proteção. */
  pinHash: string | null;
  pinSalt: string | null;
  pinIterations: number;
  /** Desbloqueio por biometria do dispositivo (WebAuthn), quando disponível. */
  biometricEnabled: boolean;
  biometricCredentialId: string | null;
  lockOnBackground: boolean;
  lastBackupAt: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  pinHash: null,
  pinSalt: null,
  pinIterations: 150000,
  biometricEnabled: false,
  biometricCredentialId: null,
  lockOnBackground: true,
  lastBackupAt: null,
};
