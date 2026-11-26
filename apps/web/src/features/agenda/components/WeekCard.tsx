'use client'

import {
  animate,
  AnimatePresence,
  motion,
  stagger,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'

import { Card, CardHeader, LineIcon } from '@/components/ui/Card'
import { Doodle } from '@/components/ui/Doodle'
import { ScrollTabs } from '@/components/ui/ScrollTabs'
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
import { DURATION, EASE_OUT, PRESS, SPRING } from '@/lib/motion'

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
  // Al elegir un día con más o menos eventos, la zona de eventos anima su alto: la tarjeta se alarga o se acorta
  // suave y el encabezado y los días se quedan quietos. Se anima el alto (no una escala), así nada se estira.
  // En reposo vale "auto".
  const viewportRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const viewportHeight = useMotionValue<number | string>('auto')
  const resize = useRef<{ pending: boolean; controls?: AnimationPlaybackControls }>({ pending: false })
  const reduceMotion = useReducedMotion()

  useLayoutEffect(() => {
    const list = listRef.current
    const viewport = viewportRef.current
    if (!list || !viewport) return
    const state = resize.current
    // Llega la lista del día nuevo (con mode="wait", después de que se fue la anterior): de ahí sale el alto final.
    const observer = new ResizeObserver(() => {
      const listHeight = list.offsetHeight
      if (!state.pending || listHeight === 0) return
      state.pending = false
      // El alto mínimo que se ve: en el escritorio "Pendientes de hoy" comparte la fila, y si es más alta la
      // tarjeta no baja de ahí (la zona de eventos se estira hasta llenarla, flex: 1). Se mide con alto 0 un
      // instante, sin pintar. Sin esto, parte de la animación pasaría escondida y el cambio se vería a saltos.
      const before = viewport.style.height
      viewport.style.height = '0px'
      const floor = viewport.offsetHeight
      viewport.style.height = before
      state.controls = animate(viewportHeight, Math.max(listHeight, floor), {
        duration: DURATION.slow,
        ease: EASE_OUT,
        onComplete: () => viewportHeight.set('auto'),
      })
    })
    observer.observe(list)
    return () => {
      observer.disconnect()
      state.controls?.stop()
    }
  }, [viewportHeight])

  const byDay = new Map<IsoDate, AgendaEvent[]>()
  for (const event of events) {
    const day = dateOfMoment(event.startsAt, timeZone)
    byDay.set(day, [...(byDay.get(day) ?? []), event])
  }
  const dayEvents = (byDay.get(selected) ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  function pick(day: IsoDate) {
    if (day === selected) return
    // El alto que se ve ahora queda fijo mientras se van los eventos; el efecto de arriba lo lleva al nuevo.
    const viewport = viewportRef.current
    if (viewport && !reduceMotion) {
      resize.current.controls?.stop()
      viewportHeight.set(viewport.offsetHeight)
      resize.current.pending = true
    }
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

      <ScrollTabs as="div" centerEdges className={styles.days} role="group" aria-label="Días de la semana">
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
              whileTap={PRESS.button}
            >
              {/* El día elegido se oscurece en su lugar. Antes la píldora viajaba entre días (layoutId) y, como cada
                  día es una tarjetita aparte, al pasar tapaba los números de los demás; además hacía que Motion
                  volviera a medir el Inicio y estirara la tarjeta al cambiar de alto. */}
              <motion.span
                className={styles.dayPill}
                aria-hidden="true"
                initial={false}
                animate={isSelected ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                transition={isSelected ? SPRING.pop : { duration: DURATION.fast, ease: EASE_OUT }}
              />
              <span className={styles.dow}>{WEEKDAYS_SHORT[weekdayOf(day)]}</span>
              <span className={styles.num}>{dayOfMonth(day)}</span>
              <span className={[styles.dot, hasEvents ? styles.dotOn : null].filter(Boolean).join(' ')} />
            </motion.button>
          )
        })}
      </ScrollTabs>

      <motion.div ref={viewportRef} className={styles.eventsViewport} style={{ height: viewportHeight }}>
        <div ref={listRef}>
          {/* mode="wait": primero se van los eventos del día anterior (rápido) y luego entran los nuevos, mientras
              la tarjeta toma su alto nuevo. Con "popLayout" las dos listas se encimaban medio transparentes. */}
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={selected}
              className={styles.events}
              custom={direction}
              variants={{
                enter: (dir: number) => ({ opacity: 0, x: dir * 16 }),
                center: { opacity: 1, x: 0, transition: { duration: 0.26, ease: EASE_OUT, delayChildren: stagger(0.04) } },
                exit: (dir: number) => ({ opacity: 0, x: dir * -12, transition: { duration: DURATION.press, ease: EASE_OUT } }),
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
      </motion.div>
    </Card>
  )
}
