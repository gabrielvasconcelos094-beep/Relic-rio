/**
 * Criptografia dos backups.
 *
 * Usa apenas primitivas do WebCrypto do próprio aparelho — nenhum algoritmo próprio:
 *  - derivação de chave: PBKDF2-SHA256 com salt aleatório de 16 bytes;
 *  - cifra: AES-256-GCM (criptografia autenticada: detecta senha errada e adulteração).
 *
 * O arquivo gerado tem um cabeçalho em texto com os parâmetros necessários para
 * decifrar (nunca a senha), seguido do conteúdo cifrado.
 */

export const ENCRYPTED_MAGIC = 'RELICARIO-ENC';
export const ENCRYPTED_VERSION = 1;
export const PBKDF2_ITERATIONS = 310000;

export interface EncryptedHeader {
  magic: typeof ENCRYPTED_MAGIC;
  version: number;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  cipher: 'AES-GCM-256';
  /** Informação não sensível, exibida antes de pedir a senha. */
  createdAt: string;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function cryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Envelope: "RELICARIO-ENC\n" + JSON do cabeçalho + "\n" + bytes cifrados. */
export async function encryptBytes(
  plain: Uint8Array,
  password: string,
): Promise<Uint8Array> {
  if (!cryptoAvailable()) {
    throw new Error('Este dispositivo não oferece a criptografia necessária para proteger o backup.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      plain as BufferSource,
    ),
  );

  const header: EncryptedHeader = {
    magic: ENCRYPTED_MAGIC,
    version: ENCRYPTED_VERSION,
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: b64(salt),
    iv: b64(iv),
    cipher: 'AES-GCM-256',
    createdAt: new Date().toISOString(),
  };
  const headerBytes = enc.encode(`${ENCRYPTED_MAGIC}\n${JSON.stringify(header)}\n`);

  const out = new Uint8Array(headerBytes.length + cipher.length);
  out.set(headerBytes, 0);
  out.set(cipher, headerBytes.length);
  return out;
}

export function isEncrypted(bytes: Uint8Array): boolean {
  const head = dec.decode(bytes.slice(0, ENCRYPTED_MAGIC.length));
  return head === ENCRYPTED_MAGIC;
}

export function readEncryptedHeader(
  bytes: Uint8Array,
): { header: EncryptedHeader; bodyOffset: number } | null {
  if (!isEncrypted(bytes)) return null;
  // Procura as duas quebras de linha que delimitam o cabeçalho.
  let first = -1;
  let second = -1;
  const limit = Math.min(bytes.length, 8192);
  for (let i = 0; i < limit; i += 1) {
    if (bytes[i] === 0x0a) {
      if (first === -1) first = i;
      else {
        second = i;
        break;
      }
    }
  }
  if (first === -1 || second === -1) return null;
  try {
    const header = JSON.parse(dec.decode(bytes.slice(first + 1, second))) as EncryptedHeader;
    if (header.magic !== ENCRYPTED_MAGIC) return null;
    return { header, bodyOffset: second + 1 };
  } catch {
    return null;
  }
}

export async function decryptBytes(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const parsed = readEncryptedHeader(bytes);
  if (!parsed) throw new Error('Este arquivo não é um backup criptografado do Relicário.');
  const { header, bodyOffset } = parsed;
  if (header.version > ENCRYPTED_VERSION) {
    throw new Error('Backup criado por uma versão mais nova do Relicário.');
  }
  if (header.cipher !== 'AES-GCM-256' || header.kdf !== 'PBKDF2-SHA256') {
    throw new Error('O backup usa um formato de criptografia desconhecido.');
  }
  const key = await deriveKey(password, unb64(header.salt), header.iterations);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: unb64(header.iv) as BufferSource },
      key,
      bytes.slice(bodyOffset) as BufferSource,
    );
    return new Uint8Array(plain);
  } catch {
    // AES-GCM é autenticado: a falha aqui significa senha errada ou arquivo adulterado.
    throw new Error('Senha incorreta, ou o arquivo de backup foi alterado depois de criado.');
  }
}
