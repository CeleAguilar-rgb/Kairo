import { dayOfMonth, formatDayMonth, weekdayOf, WEEKDAYS_SHORT, type IsoDate } from '@/lib/dates'

import { hourRange, HOUR_PX, weekDays } from '../agenda-utils'
import type { AgendaEntry } from '../types'

import { EntryChip } from './EntryParts'
import styles from './DayView.module.css'
import { TimeGrid } from './TimeGrid'

type DayViewProps = {
  anchor: IsoDate
  entries: AgendaEntry[]
  today: IsoDate
  nowMinutes: number
  hourFormat: '12h' | '24h'
  weekStart: 'monday' | 'sunday'
  selectedId: string | null
  onSelect: (id: string) => void
  onPickDay: (date: IsoDate) => void
  onNewAt: (date: IsoDate, startMin: number) => void
}

// La vista de día: la tira de la semana para saltar de un día a otro, lo que dura todo el día, y la
// cuadrícula de horas con la raya de "ahora" y los huecos libres.
export function DayView({ anchor, entries, today, nowMinutes, hourFormat, weekStart, selectedId, onSelect, onPickDay, onNewAt }: DayViewProps) {
  const days = weekDays(anchor, weekStart)
  const allDay = entries.filter((entry) => entry.date === anchor && entry.allDay)
  const range = hourRange(entries.filter((entry) => entry.date === anchor))

  return (
    <div className={styles.view}>
      <div className={styles.strip}>
        {days.map((date) => {
          const count = entries.filter((entry) => entry.date === date).length
          const current = date === anchor
          return (
            <button
              key={date}
              type="button"
              className={[styles.pick, current ? styles.current : null, date === today && !current ? styles.isToday : null].filter(Boolean).join(' ')}
              aria-current={current ? 'date' : undefined}
              aria-label={`${formatDayMonth(date)}, ${count} ${count === 1 ? 'cosa' : 'cosas'}`}
              onClick={() => onPickDay(date)}
            >
              <span className={styles.pickDow}>{WEEKDAYS_SHORT[weekdayOf(date)]}</span>
              <span className={styles.pickNum}>{dayOfMonth(date)}</span>
              <span className={[styles.pickDot, count > 0 ? styles.pickDotOn : null].filter(Boolean).join(' ')} />
            </button>
          )
        })}
      </div>

      <div className={styles.allDay}>
        <span className={styles.allDayLabel}>Todo el día</span>
        {allDay.map((entry) => (
          <EntryChip key={entry.id} entry={entry} selected={selectedId === entry.id} onSelect={onSelect} />
        ))}
        {allDay.length === 0 ? <span className={styles.none}>Nada todo el día.</span> : null}
      </div>

      <TimeGrid
        days={[anchor]}
        entries={entries}
        range={range}
        hourPx={HOUR_PX.day}
        today={today}
        nowMinutes={nowMinutes}
        hourFormat={hourFormat}
        selectedId={selectedId}
        onSelect={onSelect}
        variant="day"
        onNewAt={onNewAt}
      />
    </div>
  )
}
