'use client'

import { AnimatePresence, motion, stagger } from 'motion/react'
import { useState } from 'react'

import { Card, CardHeader, LineIcon } from '@/components/ui/Card'
import { Doodle } from '@/components/ui/Doodle'
import {
  addDays,
  dateOfMoment,
  dayOfMonth,
  formatDuration,
  formatRange,
  formatTime,
  minutesBetween,
  startOfWeek,
  WEEKDAYS_SHORT,
  weekdayOf,
  type IsoDate,
} from '@/lib/dates'
import { EASE_OUT, SPRING } from '@/lib/motion'

import { EVENT_KIND_LABEL, type AgendaEvent } from '../types'

import styles from './WeekCard.module.css'

type WeekCardProps = {
  events: AgendaEvent[]
  today: IsoDate
  timeZone: string
  hourFormat: '12h' | '24h'
  weekStart: 'monday' | 'sunday'
}

// "Esta semana" de Inicio (Main.dc.html): siete días para elegir y los eventos del elegido.
export function WeekCard({ events, today, timeZone, hourFormat, weekStart }: WeekCardProps) {
  const first = startOfWeek(today, weekStart)
  const days = Array.from({ length: 7 }, (_, i) => addDays(first, i))
  const [selected, setSelected] = useState<IsoDate>(today)
  // +1 si avanzaste, -1 si regresaste: decide de qué lado entran los eventos nuevos.
  const [direction, setDirection] = useState(1)

  const byDay = new Map<IsoDate, AgendaEvent[]>()
  for (const event of events) {
    const day = dateOfMoment(event.startsAt, timeZone)
    byDay.set(day, [...(byDay.get(day) ?? []), event])
  }
  const dayEvents = (byDay.get(selected) ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  function pick(day: IsoDate) {
    setDirection(day > selected ? 1 : -1)
    setSelected(day)
  }

  return (
    <Card as="section" className={styles.card} aria-labelledby="home-week">
      <CardHeader
        id="home-week"
        title="Esta semana"
        iconTone="accent"
        icon={<LineIcon d={['M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M3 10h18M8 3v4M16 3v4']} />}
        action={<span className={styles.range}>{formatRange(days[0], days[6])}</span>}
      />

      <div className={styles.days} role="group" aria-label="Días de la semana">
        {days.map((day) => {
          const isSelected = day === selected
          const hasEvents = (byDay.get(day)?.length ?? 0) > 0
          return (
            <motion.button
              key={day}
              type="button"
              className={[styles.day, isSelected ? styles.daySelected : null, day === today ? styles.dayToday : null].filter(Boolean).join(' ')}
              aria-pressed={isSelected}
              aria-label={`${WEEKDAYS_SHORT[weekdayOf(day)]} ${dayOfMonth(day)}${hasEvents ? ', con eventos' : ''}`}
              onClick={() => pick(day)}
              whileTap={{ scale: 0.94 }}
            >
              {isSelected ? <motion.span layoutId="week-selected" className={styles.dayPill} transition={SPRING.slide} /> : null}
              <span className={styles.dow}>{WEEKDAYS_SHORT[weekdayOf(day)]}</span>
              <span className={styles.num}>{dayOfMonth(day)}</span>
              <span className={[styles.dot, hasEvents ? styles.dotOn : null].filter(Boolean).join(' ')} />
            </motion.button>
          )
        })}
      </div>

      <div className={styles.eventsViewport}>
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={selected}
            className={styles.events}
            custom={direction}
            variants={{
              enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
              center: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE_OUT, delayChildren: stagger(0.05) } },
              exit: (dir: number) => ({ opacity: 0, x: dir * -28, transition: { duration: 0.2, ease: EASE_OUT } }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {dayEvents.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.bob}><Doodle kind="cloud" size={40} /></span>
                <span>Día libre. Toca otro día o agrega un evento.</span>
              </div>
            ) : (
              dayEvents.map((event) => (
                <motion.div
                  key={event.id}
                  className={[styles.event, event.kind === 'work' ? styles.eventWork : null].filter(Boolean).join(' ')}
                  variants={{ enter: { opacity: 0, y: 6 }, center: { opacity: 1, y: 0 } }}
                  whileHover={{ x: 4 }}
                  transition={SPRING.slide}
                >
                  <span className={styles.time}>{formatTime(event.startsAt, timeZone, hourFormat)}</span>
                  <div className={styles.eventText}>
                    <span className={styles.eventTitle}>{event.title}</span>
                    <span className={styles.eventMeta}>
                      {event.place ?? event.project?.name ?? EVENT_KIND_LABEL[event.kind]}, {formatDuration(minutesBetween(event.startsAt, event.endsAt))}
                    </span>
                  </div>
                  <LineIcon d={['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v5l3 2']} />
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  )
}
