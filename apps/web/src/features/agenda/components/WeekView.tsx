import { dayOfMonth, formatLongDay, weekdayOf, WEEKDAYS_SHORT, type IsoDate } from '@/lib/dates'

import { hourRange, HOUR_PX, weekDays } from '../agenda-utils'
import type { AgendaEntry } from '../types'

import { EntryChip } from './EntryParts'
import { TimeGrid } from './TimeGrid'
import styles from './WeekView.module.css'

type WeekViewProps = {
  anchor: IsoDate
  entries: AgendaEntry[]
  today: IsoDate
  nowMinutes: number
  hourFormat: '12h' | '24h'
  weekStart: 'monday' | 'sunday'
  selectedId: string | null
  onSelect: (id: string) => void
  onOpenDay: (date: IsoDate) => void
}

// La vista de semana: los siete días en columnas, con lo de todo el día arriba y la cuadrícula de horas.
// En pantallas angostas se desliza de lado en lugar de apretar las columnas.
export function WeekView({ anchor, entries, today, nowMinutes, hourFormat, weekStart, selectedId, onSelect, onOpenDay }: WeekViewProps) {
  const days = weekDays(anchor, weekStart)
  const range = hourRange(entries.filter((entry) => days.includes(entry.date)))

  return (
    <div className={styles.scroll}>
      <div className={styles.week}>
        <div className={styles.head}>
          <span />
          {days.map((date) => (
            <button key={date} type="button" className={styles.dayHead} aria-label={`Ver el ${formatLongDay(date)}`} onClick={() => onOpenDay(date)}>
              <span className={styles.dow}>{WEEKDAYS_SHORT[weekdayOf(date)]}</span>
              <span className={[styles.num, date === today ? styles.numToday : null].filter(Boolean).join(' ')}>{dayOfMonth(date)}</span>
            </button>
          ))}
        </div>

        <div className={styles.allDay}>
          <span className={styles.allDayLabel}>Todo el día</span>
          {days.map((date) => (
            <div key={date} className={styles.allDayCell}>
              {entries
                .filter((entry) => entry.date === date && entry.allDay)
                .map((entry) => (
                  <EntryChip key={entry.id} entry={entry} selected={selectedId === entry.id} onSelect={onSelect} />
                ))}
            </div>
          ))}
        </div>

        <TimeGrid
          days={days}
          entries={entries}
          range={range}
          hourPx={HOUR_PX.week}
          today={today}
          nowMinutes={nowMinutes}
          hourFormat={hourFormat}
          selectedId={selectedId}
          onSelect={onSelect}
          variant="week"
        />
      </div>
    </div>
  )
}
