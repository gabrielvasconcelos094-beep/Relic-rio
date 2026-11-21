/**
 * Extração local de texto dos anexos, para a busca encontrar o que está escrito
 * dentro de um PDF ou de um arquivo de texto.
 *
 * Tudo acontece dentro do aparelho: o pdf.js é empacotado com o aplicativo e
 * carregado sob demanda. Nenhum documento é enviado a servidor nenhum.
 *
 * Não há OCR: imagens e PDFs digitalizados sem camada de texto são deixados
 * em paz, em vez de serem processados sem necessidade.
 */
import type { Attachment } from '@/db/types';

/** Teto por arquivo, para não inchar o banco com documentos enormes. */
const MAX_CHARS = 120000;
const MAX_PDF_PAGES = 60;
const MAX_PDF_BYTES = 40 * 1024 * 1024;

export function canExtract(att: Pick<Attachment, 'kind' | 'mime' | 'name' | 'size'>): boolean {
  if (att.kind === 'pdf') return att.size <= MAX_PDF_BYTES;
  if (att.kind === 'document') {
    return (
      att.mime.startsWith('text/') ||
      /\.(txt|md|markdown|csv|json|rtf)$/i.test(att.name)
    );
  }
  return false;
}

async function extractPlainText(blob: Blob): Promise<string> {
  const text = await blob.text();
  return text.slice(0, MAX_CHARS);
}

async function extractPdfText(blob: Blob): Promise<string> {
  // Import dinâmico: o pdf.js só entra na memória quando há um PDF para ler.
  const pdfjs = await import('pdfjs-dist');
  const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const data = new Uint8Array(await blob.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: false })
    .promise;
  try {
    const pages = Math.min(doc.numPages, MAX_PDF_PAGES);
    const chunks: string[] = [];
    let total = 0;
    for (let i = 1; i <= pages && total < MAX_CHARS; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      page.cleanup();
      if (text) {
        chunks.push(text);
        total += text.length;
      }
    }
    return chunks.join('\n').slice(0, MAX_CHARS);
  } finally {
    await doc.destroy();
  }
}

/**
 * Devolve o texto extraído, ou string vazia quando não há nada a extrair.
 * Nunca lança: uma falha de extração não pode impedir o anexo de ser guardado.
 */
export async function extractText(att: Attachment): Promise<string> {
  if (!canExtract(att)) return '';
  try {
    if (att.kind === 'pdf') return await extractPdfText(att.blob);
    return await extractPlainText(att.blob);
  } catch {
    return '';
  }
}
