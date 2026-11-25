import responsive from '@/components/ui/responsive.module.css'
import { ScrollTabs } from '@/components/ui/ScrollTabs'
import { addDays, dayOfMonth, diffDays, formatDayMonth, weekdayOf, WEEKDAYS_SHORT, type IsoDate } from '@/lib/dates'

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

  const pick = (date: IsoDate) => {
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
  }

  return (
    <div className={styles.view}>
      <div className={[styles.strip, responsive.hideOnPhone].join(' ')}>{days.map(pick)}</div>

      {/* Teléfono: siete días no caben sin apachurrarse. La tira lleva días seguidos alrededor de hoy (también de la
          semana pasada y la siguiente); se ven unos cinco, con degradado en las orillas, y el día elegido va al centro. */}
      <ScrollTabs as="div" centerEdges className={[styles.roll, responsive.phoneOnly].join(' ')} role="group" aria-label="Días">
        {rollingDays(anchor, today).map(pick)}
      </ScrollTabs>

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

// Cuántos días lleva la tira del teléfono a cada lado, y a cuántos días de hoy puede irse el elegido antes de que
// la tira se rearme alrededor de él.
const ROLL_SPAN = 14
const ROLL_RECENTER = 10

// Los días de la tira del teléfono, alrededor de hoy: elegir un día cercano no la mueve, solo cambia cuál va al
// centro. Si con las flechas el día elegido queda lejos de hoy, la tira se arma alrededor de ese día.
function rollingDays(anchor: IsoDate, today: IsoDate): IsoDate[] {
  const center = Math.abs(diffDays(today, anchor)) <= ROLL_RECENTER ? today : anchor
  return Array.from({ length: ROLL_SPAN * 2 + 1 }, (_, i) => addDays(center, i - ROLL_SPAN))
}
