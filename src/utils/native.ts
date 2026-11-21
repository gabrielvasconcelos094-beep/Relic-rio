/**
 * Ponte com o Android.
 *
 * Tudo aqui degrada com honestidade: no navegador (ou num aparelho sem o
 * recurso) as funções devolvem valores vazios e `nativeAvailable()` é falso,
 * para a interface poder dizer o que de fato está disponível em vez de fingir.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PendingShare } from '@/db/types';

export interface RelicarioNativePlugin {
  /** Compartilhamentos recebidos e ainda não importados. */
  getPendingShares(): Promise<{ shares: PendingShare[] }>;
  /** Apaga os arquivos temporários de um compartilhamento já importado. */
  clearShare(options: { id: string }): Promise<void>;
  /** Atualiza o conteúdo mostrado pelo widget da tela inicial. */
  updateWidget(options: {
    showContent: boolean;
    title: string;
    text: string;
    meta: string;
    imagePath: string | null;
  }): Promise<void>;
  /** Informa se há ao menos um widget adicionado à tela inicial. */
  widgetStatus(): Promise<{ installed: boolean; count: number }>;
  addListener(
    eventName: 'shareReceived',
    listener: () => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

export const RelicarioNative = registerPlugin<RelicarioNativePlugin>('RelicarioNative');

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function nativePlatform(): string {
  try {
    return Capacitor.getPlatform();
  } catch {
    return 'web';
  }
}

/** Converte um caminho de arquivo do aparelho numa URL que a WebView consegue ler. */
export function toWebPath(path: string): string {
  try {
    return Capacitor.convertFileSrc(path);
  } catch {
    return path;
  }
}

export async function getPendingShares(): Promise<PendingShare[]> {
  if (!isNative()) return [];
  try {
    const result = await RelicarioNative.getPendingShares();
    return result?.shares ?? [];
  } catch {
    return [];
  }
}

export async function clearShare(id: string): Promise<void> {
  if (!isNative()) return;
  try {
    await RelicarioNative.clearShare({ id });
  } catch {
    /* o compartilhamento já foi importado; nada a fazer */
  }
}

/** Baixa um arquivo compartilhado para dentro do aplicativo como Blob. */
export async function fetchSharedFile(uri: string): Promise<Blob | null> {
  try {
    const response = await fetch(toWebPath(uri));
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

export async function updateWidget(payload: {
  showContent: boolean;
  title: string;
  text: string;
  meta: string;
  imagePath?: string | null;
}): Promise<void> {
  if (!isNative()) return;
  try {
    await RelicarioNative.updateWidget({
      showContent: payload.showContent,
      title: payload.title,
      text: payload.text,
      meta: payload.meta,
      imagePath: payload.imagePath ?? null,
    });
  } catch {
    /* sem widget instalado, ou versão do Android sem suporte */
  }
}

export async function widgetStatus(): Promise<{ installed: boolean; count: number }> {
  if (!isNative()) return { installed: false, count: 0 };
  try {
    return await RelicarioNative.widgetStatus();
  } catch {
    return { installed: false, count: 0 };
  }
}
