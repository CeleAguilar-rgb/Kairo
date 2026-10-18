import { dayOfMonth, formatDayMonth, WEEKDAYS_SHORT, type IsoDate } from '@/lib/dates'

import { byTime, monthGrid } from '../agenda-utils'
import type { AgendaEntry } from '../types'

import styles from './MonthView.module.css'
import types from './entry-types.module.css'

type MonthViewProps = {
  anchor: IsoDate
  entries: AgendaEntry[]
  today: IsoDate
  weekStart: 'monday' | 'sunday'
  onOpenDay: (date: IsoDate) => void
}

// La vista de mes: una celda por día con sus primeras tres cosas y "+N más". Tocar un día abre su vista.
export function MonthView({ anchor, entries, today, weekStart, onOpenDay }: MonthViewProps) {
  const days = monthGrid(anchor, weekStart)
  const month = anchor.slice(0, 7)
  // Los nombres de los días, empezando por el primero de la semana del perfil
  const names = Array.from({ length: 7 }, (_, index) => WEEKDAYS_SHORT[((weekStart === 'monday' ? 1 : 0) + index) % 7])

  return (
    <div className={styles.scroll}>
      <div className={styles.month}>
        <div className={styles.dows}>
          {names.map((name) => (
            <span key={name} className={styles.dow}>
              {name}
            </span>
          ))}
        </div>
        <div className={styles.cells}>
          {days.map((date) => {
            const items = entries.filter((entry) => entry.date === date).sort(byTime)
            const inMonth = date.startsWith(month)
            return (
              <button
                key={date}
                type="button"
                className={[styles.day, inMonth ? null : styles.outside, date === today ? styles.today : null].filter(Boolean).join(' ')}
                aria-label={`${formatDayMonth(date)}, ${items.length} ${items.length === 1 ? 'cosa' : 'cosas'}. Abrir día`}
                onClick={() => onOpenDay(date)}
              >
                <span className={[styles.num, date === today ? styles.numToday : null].filter(Boolean).join(' ')}>{dayOfMonth(date)}</span>
                {items.slice(0, 3).map((entry) => (
                  <span key={entry.id} className={[styles.item, types[entry.type]].join(' ')}>
                    {entry.title}
                  </span>
                ))}
                {items.length > 3 ? <span className={styles.more}>+{items.length - 3} más</span> : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
