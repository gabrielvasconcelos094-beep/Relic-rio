/**
 * Notificações locais.
 *
 * São agendadas pelo próprio sistema Android (@capacitor/local-notifications):
 * não há servidor, nem push, nem envio de conteúdo para fora do aparelho.
 *
 * O conteúdo de uma memória só entra no texto da notificação quando o usuário
 * autoriza em Configurações → Notificações. Por padrão a notificação é neutra,
 * para não revelar nada na tela bloqueada.
 */
import type { Capsule, Memory, NotificationPrefs, Reminder } from '@/db/types';
import { isNative } from './native';
import { describeYearsAgo, parseCivil, todayCivil, yearsAgo } from './date';
import { onThisDay } from './selectors';
import { snippet } from './search';

/** Faixas de id reservadas para cada tipo, para cancelar sem afetar as outras. */
const ID_ON_THIS_DAY = 10000;
const ID_CAPSULE = 20000;
const ID_REMINDER = 30000;

/** Quantos dias à frente agendamos as lembranças de "hoje, no passado". */
const LOOKAHEAD_DAYS = 30;

type Plugin = typeof import('@capacitor/local-notifications').LocalNotifications;

async function plugin(): Promise<Plugin | null> {
  if (!isNative()) return null;
  try {
    const mod = await import('@capacitor/local-notifications');
    return mod.LocalNotifications;
  } catch {
    return null;
  }
}

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export async function notificationsSupported(): Promise<boolean> {
  return (await plugin()) !== null;
}

export async function checkPermission(): Promise<PermissionState> {
  const api = await plugin();
  if (!api) return 'unsupported';
  try {
    const result = await api.checkPermissions();
    return result.display as PermissionState;
  } catch {
    return 'unsupported';
  }
}

export async function requestPermission(): Promise<PermissionState> {
  const api = await plugin();
  if (!api) return 'unsupported';
  try {
    const result = await api.requestPermissions();
    return result.display as PermissionState;
  } catch {
    return 'denied';
  }
}

function at(date: string, time: string): Date {
  const p = parseCivil(date);
  const [h, min] = time.split(':').map(Number);
  if (!p) return new Date();
  return new Date(p.year, p.month - 1, p.day, h || 9, min || 0, 0, 0);
}

interface Scheduled {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date; allowWhileIdle: boolean };
  extra: { route: string };
}

/**
 * Monta a lista de notificações a agendar. Separado do efeito colateral para
 * poder ser conferido em teste sem um aparelho.
 */
export function planNotifications(
  prefs: NotificationPrefs,
  data: { memories: Memory[]; capsules: Capsule[]; reminders: Reminder[] },
  now = new Date(),
): Scheduled[] {
  if (!prefs.enabled) return [];
  const out: Scheduled[] = [];
  const show = prefs.showContent;

  if (prefs.onThisDay) {
    for (let offset = 0; offset < LOOKAHEAD_DAYS; offset += 1) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const matches = onThisDay(data.memories, day);
      if (!matches.length) continue;
      const when = at(todayCivil(day), prefs.time);
      if (when.getTime() <= now.getTime()) continue;

      const first = matches[0];
      const years = first.occurredAt ? yearsAgo(first.occurredAt, day) : null;
      const body = show
        ? `${years !== null ? describeYearsAgo(years) : 'Em outro ano'}: ${
            first.title || snippet(first.text, 60) || 'um registro seu'
          }${matches.length > 1 ? ` e mais ${matches.length - 1}.` : '.'}`
        : matches.length === 1
          ? 'Há uma memória guardada nesta data.'
          : `Há ${matches.length} memórias guardadas nesta data.`;

      out.push({
        id: ID_ON_THIS_DAY + offset,
        title: 'Hoje, no passado',
        body,
        schedule: { at: when, allowWhileIdle: false },
        extra: { route: '/hoje-no-passado' },
      });
    }
  }

  if (prefs.capsules) {
    let i = 0;
    for (const capsule of data.capsules) {
      if (capsule.openedAt) continue;
      const when = at(capsule.openAt, prefs.time);
      if (when.getTime() <= now.getTime()) continue;
      out.push({
        id: ID_CAPSULE + i,
        title: 'Uma cápsula pode ser aberta',
        body: show
          ? `“${capsule.title || 'Carta para o futuro'}” chegou à data que você escolheu.`
          : 'Uma carta que você guardou chegou à data marcada.',
        schedule: { at: when, allowWhileIdle: true },
        extra: { route: `/capsula/${capsule.id}` },
      });
      i += 1;
    }
  }

  if (prefs.reminders) {
    let i = 0;
    for (const reminder of data.reminders) {
      if (!reminder.enabled) continue;
      const when = at(reminder.at, reminder.time || prefs.time);
      if (when.getTime() <= now.getTime()) continue;
      out.push({
        id: ID_REMINDER + i,
        title: 'Relicário',
        body: show ? reminder.title || 'Um lembrete seu.' : 'Você pediu para lembrar de algo.',
        schedule: { at: when, allowWhileIdle: true },
        extra: {
          route:
            reminder.kind === 'collection' && reminder.targetId
              ? `/colecao/${reminder.targetId}`
              : reminder.kind === 'memory' && reminder.targetId
                ? `/memoria/${reminder.targetId}`
                : '/',
        },
      });
      i += 1;
    }
  }

  return out;
}

export interface SyncResult {
  supported: boolean;
  permission: PermissionState;
  scheduled: number;
  cancelled: number;
  reason?: string;
}

/**
 * Cancela o que estava agendado e reagenda a partir do estado atual.
 * Chamado quando o app abre e quando as preferências ou os dados mudam, o que
 * evita notificações repetidas ou desatualizadas.
 */
export async function syncNotifications(
  prefs: NotificationPrefs,
  data: { memories: Memory[]; capsules: Capsule[]; reminders: Reminder[] },
): Promise<SyncResult> {
  const api = await plugin();
  if (!api) {
    return {
      supported: false,
      permission: 'unsupported',
      scheduled: 0,
      cancelled: 0,
      reason: 'As notificações locais só funcionam no aplicativo Android instalado.',
    };
  }

  let cancelled = 0;
  try {
    const pending = await api.getPending();
    if (pending.notifications.length) {
      cancelled = pending.notifications.length;
      await api.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
  } catch {
    /* nada agendado ainda */
  }

  if (!prefs.enabled) {
    return { supported: true, permission: await checkPermission(), scheduled: 0, cancelled };
  }

  let permission = await checkPermission();
  if (permission === 'prompt') permission = await requestPermission();
  if (permission !== 'granted') {
    return {
      supported: true,
      permission,
      scheduled: 0,
      cancelled,
      reason: 'O Android não autorizou as notificações para o Relicário.',
    };
  }

  const planned = planNotifications(prefs, data);
  if (!planned.length) return { supported: true, permission, scheduled: 0, cancelled };

  try {
    await api.schedule({ notifications: planned });
    return { supported: true, permission, scheduled: planned.length, cancelled };
  } catch (err) {
    return {
      supported: true,
      permission,
      scheduled: 0,
      cancelled,
      reason: err instanceof Error ? err.message : 'O sistema recusou o agendamento.',
    };
  }
}
