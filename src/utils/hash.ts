/** Hash SHA-256 local, usado na verificação de integridade e nos manifestos de backup. */

export function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

export function hashAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

export async function sha256Bytes(data: ArrayBuffer | Uint8Array): Promise<string | null> {
  if (!hashAvailable()) return null;
  const buf: ArrayBuffer =
    data instanceof Uint8Array
      ? (data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer)
      : data;
  return toHex(await crypto.subtle.digest('SHA-256', buf));
}

export async function sha256Blob(blob: Blob): Promise<string | null> {
  if (!hashAvailable()) return null;
  return sha256Bytes(await blob.arrayBuffer());
}
