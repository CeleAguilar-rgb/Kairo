import { formatWallTime, minutesToWallTime, type IsoDate } from '@/lib/dates'

import { freeSlots, hourLabel, isTimed, placeTimed, timeText } from '../agenda-utils'
import type { AgendaEntry } from '../types'

import { EntryBlock } from './EntryParts'
import styles from './TimeGrid.module.css'

type TimeGridProps = {
  days: IsoDate[]
  // Todo lo visible del período; aquí se agrupa por día
  entries: AgendaEntry[]
  range: { startHour: number; endHour: number }
  hourPx: number
  today: IsoDate
  nowMinutes: number
  hourFormat: '12h' | '24h'
  selectedId: string | null
  onSelect: (id: string) => void
  // La vista de día muestra los huecos libres y la nota de cada evento
  variant: 'day' | 'week'
  onNewAt?: (date: IsoDate, startMin: number) => void
}

// La cuadrícula de horas de la vista de día (una columna) y de semana (siete): las líneas de cada hora,
// la raya de "ahora" en el día de hoy y los eventos con hora puestos donde les toca. Los que se
// empalman se reparten lado a lado.
export function TimeGrid({ days, entries, range, hourPx, today, nowMinutes, hourFormat, selectedId, onSelect, variant, onNewAt }: TimeGridProps) {
  const startMin = range.startHour * 60
  const height = (range.endHour - range.startHour) * hourPx
  const hours = Array.from({ length: range.endHour - range.startHour }, (_, index) => range.startHour + index)
  const fmt = (minutes: number) => formatWallTime(minutesToWallTime(minutes), hourFormat)
  const labelWidth = variant === 'day' ? 56 : 64

  return (
    <div className={styles.grid} style={{ gridTemplateColumns: `${labelWidth}px repeat(${days.length}, minmax(0, 1fr))` }}>
      <div className={styles.hours} style={{ height }} aria-hidden="true">
        {hours.map((hour, index) => (
          <span key={hour} className={styles.hourLabel} style={{ top: index === 0 ? 0 : (hour - range.startHour) * hourPx - 8 }}>
            {hourLabel(hour, hourFormat)}
          </span>
        ))}
      </div>

      {days.map((date) => {
        const dayEntries = entries.filter((entry) => entry.date === date)
        const isToday = date === today
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
        const slots = variant === 'day' && date >= today ? freeSlots(dayEntries, range, isToday ? Math.ceil(nowMinutes / 30) * 30 : 0) : []
        const hasTimed = dayEntries.some(isTimed)

        return (
          <div
            key={date}
            className={[styles.column, isToday ? styles.today : null, weekday === 0 || weekday === 6 ? styles.weekend : null].filter(Boolean).join(' ')}
            style={{ height }}
          >
            {hours.map((hour, index) => (
              <span key={hour} className={styles.line} style={{ top: (hour - range.startHour) * hourPx }} aria-hidden={index === 0 ? 'true' : undefined} />
            ))}

            {isToday && nowMinutes >= startMin && nowMinutes <= range.endHour * 60 ? (
              <div className={styles.now} style={{ top: ((nowMinutes - startMin) / 60) * hourPx }} aria-hidden="true">
                <span className={styles.nowDot} />
              </div>
            ) : null}

            {slots.map((slot) => (
              <button
                key={slot.startMin}
                type="button"
                className={styles.free}
                style={{ top: ((slot.startMin - startMin) / 60) * hourPx + 6, height: Math.min(44, ((slot.endMin - slot.startMin) / 60) * hourPx - 12) }}
                onClick={() => onNewAt?.(date, slot.startMin)}
              >
                Libre de {fmt(slot.startMin)} a {fmt(slot.endMin)} · agregar algo
              </button>
            ))}

            {placeTimed(dayEntries).map(({ entry, column, columns }) => {
              const top = ((entry.startMin - startMin) / 60) * hourPx + 2
              const blockHeight = Math.max(((entry.endMin - entry.startMin) / 60) * hourPx - 4, variant === 'day' ? 28 : 24)
              return (
                <EntryBlock
                  key={entry.id}
                  entry={entry}
                  selected={selectedId === entry.id}
                  time={timeText(entry, hourFormat)}
                  height={blockHeight}
                  showNote={variant === 'day'}
                  onSelect={onSelect}
                  style={{
                    top,
                    height: blockHeight,
                    left: `calc(${(column / columns) * 100}% + 4px)`,
                    width: `calc(${100 / columns}% - 8px)`,
                    zIndex: 2,
                  }}
                />
              )
            })}

            {variant === 'day' && !hasTimed ? (
              <div className={styles.empty}>
                <strong>Día libre</strong>
                <span>Toca un hueco para agregar algo.</span>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
