import type { CivilDate } from '@/db/types';

export const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export const WEEKDAYS_PT = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado',
];

/** Data civil de hoje no fuso local, como 'YYYY-MM-DD'. */
export function todayCivil(d = new Date()): CivilDate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseCivil(date: CivilDate): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function isValidCivil(date: string): boolean {
  const p = parseCivil(date);
  if (!p) return false;
  const d = new Date(p.year, p.month - 1, p.day);
  return d.getFullYear() === p.year && d.getMonth() === p.month - 1 && d.getDate() === p.day;
}

export function civilToDate(date: CivilDate): Date | null {
  const p = parseCivil(date);
  return p ? new Date(p.year, p.month - 1, p.day) : null;
}

export function formatCivil(
  date: CivilDate | null,
  precision: 'day' | 'month' | 'year' | 'unknown' = 'day',
): string {
  if (!date) return 'Sem data';
  const p = parseCivil(date);
  if (!p) return 'Sem data';
  if (precision === 'year') return String(p.year);
  if (precision === 'month') return `${MONTHS_PT[p.month - 1]} de ${p.year}`;
  return `${p.day} de ${MONTHS_PT[p.month - 1]} de ${p.year}`;
}

export function formatCivilShort(date: CivilDate | null): string {
  const p = date ? parseCivil(date) : null;
  if (!p) return '—';
  return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`;
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function longToday(d = new Date()): string {
  return `${WEEKDAYS_PT[d.getDay()]}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Diferença em anos completos entre uma data civil e hoje. */
export function yearsAgo(date: CivilDate, from = new Date()): number | null {
  const p = parseCivil(date);
  if (!p) return null;
  return from.getFullYear() - p.year;
}

const SPELLED = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco',
  'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze',
];

export function describeYearsAgo(n: number): string {
  if (n <= 0) return 'Hoje mesmo';
  if (n === 1) return 'Há um ano';
  const label = n < SPELLED.length ? SPELLED[n] : String(n);
  return `Há ${label} anos`;
}

export function daysUntil(date: CivilDate, from = new Date()): number | null {
  const target = civilToDate(date);
  if (!target) return null;
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - base.getTime()) / 86400000);
}
