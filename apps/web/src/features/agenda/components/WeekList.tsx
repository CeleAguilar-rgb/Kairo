import { dayOfMonth, formatLongDay, weekdayOf, WEEKDAYS_SHORT, type IsoDate } from '@/lib/dates'

import { byTime, timeText } from '../agenda-utils'
import type { AgendaEntry } from '../types'

import types from './entry-types.module.css'
import styles from './WeekList.module.css'

type WeekListProps = {
  days: IsoDate[]
  entries: AgendaEntry[]
  today: IsoDate
  hourFormat: '12h' | '24h'
  selectedId: string | null
  onSelect: (id: string) => void
  onOpenDay: (date: IsoDate) => void
}

// La semana en el teléfono: una lista, un renglón por día. Lo de todo el día va primero y luego lo que tiene
// hora (byTime), así lo que "no sigue la tabla" tiene su sitio sin una cuadrícula de siete columnas.
// Los días vacíos se pliegan a una línea. Solo se ve en pantallas angostas (lo decide el CSS).
export function WeekList({ days, entries, today, hourFormat, selectedId, onSelect, onOpenDay }: WeekListProps) {
  return (
    <ol className={styles.list}>
      {days.map((date) => {
        const items = entries.filter((entry) => entry.date === date).sort(byTime)
        return (
          <li key={date} className={styles.day}>
            <button type="button" className={styles.dayHead} aria-label={`Ver el ${formatLongDay(date)}`} onClick={() => onOpenDay(date)}>
              <span className={styles.dow}>{WEEKDAYS_SHORT[weekdayOf(date)]}</span>
              <span className={[styles.num, date === today ? styles.numToday : null].filter(Boolean).join(' ')}>{dayOfMonth(date)}</span>
            </button>

            {items.length === 0 ? (
              <p className={styles.empty}>Sin nada</p>
            ) : (
              <ul className={styles.items}>
                {items.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={[styles.item, selectedId === entry.id ? styles.itemSelected : null].filter(Boolean).join(' ')}
                      aria-pressed={selectedId === entry.id}
                      onClick={() => onSelect(entry.id)}
                    >
                      <span className={[styles.swatch, types[entry.type]].join(' ')} aria-hidden="true" />
                      <span className={styles.itemText}>
                        <span className={styles.itemTitle}>{entry.title}</span>
                        <span className={styles.itemTime}>{timeText(entry, hourFormat)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ol>
  )
}
