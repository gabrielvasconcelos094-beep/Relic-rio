import { useMemo, useState } from 'react';
import type { Memory } from '@/db/types';
import { Icon } from './Icon';
import { buildCalendarMonth } from '@/utils/selectors';
import { MONTHS_PT, formatCivil, parseCivil, todayCivil } from '@/utils/date';

const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface Props {
  memories: Memory[];
  onSelectDay: (date: string, memories: Memory[]) => void;
  selected: string | null;
}

/**
 * Grade mensal. Uma memória só ocupa uma casa quando o usuário informou o dia
 * exato; mês/ano, ano e datas aproximadas aparecem abaixo da grade, sem que o
 * aplicativo invente uma data que não foi dada.
 */
export function CalendarView({ memories, onSelectDay, selected }: Props) {
  const today = todayCivil();
  const parsedToday = parseCivil(today)!;
  const [cursor, setCursor] = useState(() => {
    const fromSelected = selected ? parseCivil(selected) : null;
    return fromSelected
      ? { year: fromSelected.year, month: fromSelected.month }
      : { year: parsedToday.year, month: parsedToday.month };
  });

  const month = useMemo(
    () => buildCalendarMonth(memories, cursor.year, cursor.month),
    [memories, cursor],
  );

  const shift = (delta: number) => {
    setCursor((c) => {
      const next = c.month + delta;
      if (next < 1) return { year: c.year - 1, month: 12 };
      if (next > 12) return { year: c.year + 1, month: 1 };
      return { year: c.year, month: next };
    });
  };

  const leading = Array.from({ length: month.startWeekday });

  return (
    <div>
      <div className="calendar-head">
        <button
          type="button"
          className="icon-btn"
          aria-label="Ano anterior"
          onClick={() => setCursor((c) => ({ ...c, year: c.year - 1 }))}
        >
          <Icon name="back" size={16} />
          <span className="visually-hidden">Ano anterior</span>
        </button>
        <button type="button" className="icon-btn" aria-label="Mês anterior" onClick={() => shift(-1)}>
          <Icon name="back" />
        </button>
        <div className="month" aria-live="polite">
          {MONTHS_PT[month.month - 1]} de {month.year}
        </div>
        <button type="button" className="icon-btn" aria-label="Próximo mês" onClick={() => shift(1)}>
          <Icon name="forward" />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Próximo ano"
          onClick={() => setCursor((c) => ({ ...c, year: c.year + 1 }))}
        >
          <Icon name="forward" size={16} />
        </button>
      </div>

      <div className="row" style={{ justifyContent: 'center', marginBottom: 10 }}>
        <button
          type="button"
          className="btn btn-sm btn-quiet"
          onClick={() => setCursor({ year: parsedToday.year, month: parsedToday.month })}
        >
          Hoje
        </button>
        <span className="tiny faint">
          {month.total} {month.total === 1 ? 'registro neste mês' : 'registros neste mês'}
        </span>
      </div>

      <div className="calendar-grid" role="grid" aria-label={`${MONTHS_PT[month.month - 1]} de ${month.year}`}>
        {DOW.map((d, i) => (
          <div key={`${d}-${i}`} className="calendar-dow" aria-hidden="true">
            {d}
          </div>
        ))}
        {leading.map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {month.days.map((day) => {
          const count = day.memories.length;
          const isToday = day.date === today;
          const isSelected = day.date === selected;
          const classes = ['calendar-cell'];
          if (count) classes.push('has-memories');
          if (isToday) classes.push('today');
          if (isSelected) classes.push('selected');
          return (
            <button
              key={day.date}
              type="button"
              className={classes.join(' ')}
              disabled={count === 0}
              aria-label={
                count
                  ? `${formatCivil(day.date)}: ${count} ${count === 1 ? 'registro' : 'registros'}`
                  : `${formatCivil(day.date)}: nenhum registro`
              }
              aria-pressed={isSelected}
              onClick={() => onSelectDay(day.date, day.memories)}
            >
              <span>{day.day}</span>
              {count > 0 && <span className="count">{count}</span>}
            </button>
          );
        })}
      </div>

      {month.loose.length > 0 && (
        <div className="calendar-loose">
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Sem dia exato
          </div>
          <p className="tiny faint" style={{ marginBottom: 8 }}>
            {month.loose.length}{' '}
            {month.loose.length === 1 ? 'registro pertence' : 'registros pertencem'} a este período,
            mas sem um dia determinado — por isso não ocupam uma casa do calendário.
          </p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onSelectDay(`${month.year}-${String(month.month).padStart(2, '0')}`, month.loose)}
          >
            Ver esses registros
          </button>
        </div>
      )}
    </div>
  );
}
