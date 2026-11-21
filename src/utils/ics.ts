import type { Capsule } from '@/db/types';
import { parseCivil } from './date';

/** Lembrete de calendário (.ics) para a data de abertura de uma cápsula. */
export function capsuleReminder(capsule: Capsule): { blob: Blob; filename: string } | null {
  const p = parseCivil(capsule.openAt);
  if (!p) return null;
  const date = `${p.year}${String(p.month).padStart(2, '0')}${String(p.day).padStart(2, '0')}`;
  const next = new Date(p.year, p.month - 1, p.day + 1);
  const end = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(
    next.getDate(),
  ).padStart(2, '0')}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];

  const escape = (v: string) => v.replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Relicario//Capsula//PT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${capsule.id}@relicario.local`,
    `DTSTAMP:${stamp}Z`,
    `DTSTART;VALUE=DATE:${date}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escape(`Abrir no Relicário: ${capsule.title || 'cápsula'}`)}`,
    `DESCRIPTION:${escape('Uma cápsula de memórias guardada no Relicário pode ser aberta hoje.')}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT9H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Relicário',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return {
    blob: new Blob([`${lines.join('\r\n')}\r\n`], { type: 'text/calendar;charset=utf-8' }),
    filename: `relicario-capsula-${capsule.openAt}.ics`,
  };
}
