/** Proteção local por PIN (PBKDF2-SHA256) e, quando o aparelho oferece, por biometria. */

const enc = new TextEncoder();

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function cryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

export async function derivePin(
  pin: string,
  saltB64?: string,
  iterations = 150000,
): Promise<{ hash: string; salt: string; iterations: number }> {
  if (!cryptoAvailable()) throw new Error('Este dispositivo não oferece criptografia para proteger o PIN.');
  const salt = saltB64 ? fromBase64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return { hash: toBase64(bits), salt: toBase64(salt), iterations };
}

export async function verifyPin(
  pin: string,
  hash: string,
  salt: string,
  iterations: number,
): Promise<boolean> {
  const derived = await derivePin(pin, salt, iterations);
  if (derived.hash.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i += 1) diff |= derived.hash.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

/* --------------------------------------------------------- biometria (WebAuthn) */

export async function biometricsAvailable(): Promise<boolean> {
  try {
    if (typeof PublicKeyCredential === 'undefined') return false;
    if (!window.isSecureContext) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Registra o desbloqueio biométrico local. Retorna o id da credencial. */
export async function registerBiometric(): Promise<string> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Relicário', id: window.location.hostname },
      user: { id: userId, name: 'relicario-local', displayName: 'Relicário' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error('O cadastro biométrico não foi concluído.');
  return toBase64(credential.rawId);
}

export async function verifyBiometric(credentialId: string): Promise<boolean> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ type: 'public-key', id: fromBase64(credentialId) as BufferSource }],
      userVerification: 'required',
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  return !!assertion;
}
