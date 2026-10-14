'use client'

import type { EventDeleteScope, EventInput } from '@kairo/shared'
import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'

import { PageHeading } from '@/components/layout/PageHeading'
import { Button } from '@/components/ui/Button'
import { Card, LineIcon } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/Toast'
import { addDays, addMonths, formatDayMonth, minutesNowIn, minutesToWallTime, startOfMonth, type IsoDate } from '@/lib/dates'
import { EASE_OUT } from '@/lib/motion'

import { createEventAction, deleteEventAction, duplicateEventAction, moveEventAction, undoDeleteAction, updateEventAction } from '../actions'
import { byTime, dayLabel, FILTER_TYPES, heading, rangeLabel, shiftAnchor, weekDays, type AgendaView as View } from '../agenda-utils'
import { isEventEntry, type AgendaEntry, type AgendaEntryType, type EventKind } from '../types'

import styles from './AgendaView.module.css'
import { AgendaSidebar } from './AgendaSidebar'
import { DayView } from './DayView'
import { EventDetailDrawer } from './EventDetailDrawer'
import { DeleteEventDialog, MoveDayDialog } from './EventDialogs'
import { EventDrawer } from './EventDrawer'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'

type AgendaViewProps = {
  entries: AgendaEntry[]
  projects: { id: string; name: string }[]
  today: IsoDate
  nowMinutes: number
  timeZone: string
  hourFormat: '12h' | '24h'
  weekStart: 'monday' | 'sunday'
}

type FormState = { mode: 'create' | 'edit'; initial: EventInput; eventId?: string }

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
]

// "Desde ahora" para un evento nuevo: la próxima media hora si es hoy, o las 9 de la mañana.
function defaultStart(date: IsoDate, today: IsoDate, nowMinutes: number): number {
  if (date !== today) return 9 * 60
  return Math.min(Math.ceil((nowMinutes + 1) / 30) * 30, 22 * 60)
}

function emptyEvent(date: IsoDate, startMin: number): EventInput {
  const endMin = Math.min(startMin + 60, 24 * 60 - 1)
  return {
    title: '',
    kind: 'personal',
    date,
    allDay: false,
    startTime: minutesToWallTime(startMin),
    endTime: minutesToWallTime(endMin),
    location: null,
    projectId: null,
    repeat: 'none',
    reminder: 'none',
    notes: '',
  }
}

// De un evento ya puesto en la agenda al formulario. Editar cambia toda la serie, así que el formulario
// lleva la fecha de su primera vez (mover solo una vez es "Mover de día").
function inputFrom(entry: AgendaEntry & { type: EventKind }): EventInput {
  return {
    title: entry.title,
    kind: entry.type,
    date: entry.seriesStartsOn ?? entry.date,
    allDay: entry.allDay,
    startTime: entry.startMin === null ? null : minutesToWallTime(entry.startMin),
    endTime: entry.endMin === null ? null : minutesToWallTime(entry.endMin),
    location: entry.place,
    projectId: entry.project?.id ?? null,
    repeat: entry.repeat ?? 'none',
    reminder: entry.reminder ?? 'none',
    notes: entry.notes ?? '',
  }
}

// Agenda (Agenda.dc.html, EventoNuevo.dc.html y EventoDetalle.dc.html): el calendario en vistas de día,
// semana y mes con eventos, cobros y tareas con fecha; un panel con el detalle, lo que sigue y los
// filtros; y los paneles para crear, ver, editar, mover y borrar eventos. Lo que se hace pasa por
// acciones de servidor (actions.ts) y después se recarga la agenda.
export function AgendaView({ entries, projects, today, nowMinutes, timeZone, hourFormat, weekStart }: AgendaViewProps) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState<IsoDate>(today)
  // Hacia dónde se mueve el calendario al cambiar de período (1 = adelante, -1 = atrás, 0 = sin dirección)
  const [direction, setDirection] = useState<1 | -1 | 0>(0)
  const [hidden, setHidden] = useState<Set<AgendaEntryType>>(new Set())
  const [now, setNow] = useState(nowMinutes)

  const [form, setForm] = useState<FormState | null>(null)
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<AgendaEntry | null>(null)
  const [moving, setMoving] = useState<AgendaEntry | null>(null)

  // La hora de la raya de "ahora" avanza sola cada minuto.
  useEffect(() => {
    const timer = setInterval(() => setNow(minutesNowIn(timeZone)), 60_000)
    return () => clearInterval(timer)
  }, [timeZone])

  const visible = useMemo(() => entries.filter((entry) => !hidden.has(entry.type)), [entries, hidden])

  // Cuántos hay de cada tipo en el período que se ve (no en todo el año: una serie que se repite cada día sumaría cientos).
  const counts = useMemo(() => {
    const [from, to] =
      view === 'day'
        ? [anchor, anchor]
        : view === 'week'
          ? [weekDays(anchor, weekStart)[0], weekDays(anchor, weekStart)[6]]
          : [startOfMonth(anchor), addDays(startOfMonth(addMonths(anchor, 1)), -1)]
    const result = Object.fromEntries(FILTER_TYPES.map((type) => [type, 0])) as Record<AgendaEntryType, number>
    for (const entry of entries) if (entry.date >= from && entry.date <= to) result[entry.type]++
    return result
  }, [entries, view, anchor, weekStart])

  const upcoming = useMemo(
    () =>
      visible
        .filter((entry) => entry.date > today || (entry.date === today && (entry.allDay || (entry.endMin ?? 0) > now)))
        .sort(byTime)
        .slice(0, 5),
    [visible, today, now],
  )

  // Lo elegido arranca en lo próximo que viene (como el canvas arranca en el siguiente evento de hoy).
  const [selectedId, setSelectedId] = useState<string | null>(() => (upcoming.find(isEventEntry) ?? upcoming[0])?.id ?? null)
  const selected = entries.find((entry) => entry.id === selectedId) ?? null
  const detail = entries.find((entry) => entry.id === detailId) ?? null

  const dayCount = visible.filter((entry) => entry.date === anchor).length

  const go = (nextView: View, nextAnchor: IsoDate, nextDirection: 1 | -1 | 0) => {
    setView(nextView)
    setAnchor(nextAnchor)
    setDirection(nextDirection)
  }

  const step = (stepValue: 1 | -1) => go(view, shiftAnchor(anchor, view, stepValue), stepValue)

  const openCreate = (date: IsoDate, startMin?: number) => {
    setServerErrors({})
    setForm({ mode: 'create', initial: emptyEvent(date, startMin ?? defaultStart(date, today, now)) })
  }

  const openEdit = (entry: AgendaEntry) => {
    if (!isEventEntry(entry)) return
    setServerErrors({})
    setDetailId(null)
    setForm({ mode: 'edit', initial: inputFrom(entry), eventId: entry.eventId })
  }

  const toggleFilter = (type: AgendaEntryType) =>
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })

  // Corre una acción de servidor y recarga la agenda. Si falla, avisa y deja el panel abierto.
  const handleSubmit = (input: EventInput) => {
    if (!form) return
    startTransition(async () => {
      const result = form.mode === 'edit' && form.eventId ? await updateEventAction(form.eventId, input) : await createEventAction(input)
      if (!result.ok) {
        setServerErrors(result.errors)
        toast.show({ message: result.message ?? 'Revisa los campos marcados.', icon: 'info' })
        return
      }
      setForm(null)
      if (result.id) setSelectedId(`${result.id}@${input.date}`)
      setAnchor(input.date)
      toast.show({ message: form.mode === 'edit' ? 'Cambios guardados.' : 'Evento creado.', icon: 'check' })
      router.refresh()
    })
  }

  const handleDuplicate = (entry: AgendaEntry) => {
    if (!isEventEntry(entry)) return
    startTransition(async () => {
      const result = await duplicateEventAction(entry.eventId, entry.date)
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo duplicar.', icon: 'info' })
      setDetailId(null)
      if (result.id) setSelectedId(`${result.id}@${entry.date}`)
      toast.show({ message: 'Evento duplicado.', icon: 'check' })
      router.refresh()
    })
  }

  const handleDelete = (entry: AgendaEntry, scope: EventDeleteScope) => {
    if (!isEventEntry(entry)) return
    startTransition(async () => {
      const result = await deleteEventAction(entry.eventId, { scope, occurrence: entry.date })
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo borrar.', icon: 'info' })
      setDeleting(null)
      setDetailId(null)
      setSelectedId(null)
      const repeats = entry.repeat !== undefined && entry.repeat !== 'none'
      const message = !repeats
        ? `${entry.title} se fue a la papelera`
        : scope === 'one'
          ? `Se borró ${entry.title} del ${formatDayMonth(entry.date)}`
          : scope === 'next'
            ? `Se borraron ${entry.title} desde el ${formatDayMonth(entry.date)}`
            : `Se borró la serie ${entry.title}`
      const token = result.undoToken
      toast.show({
        message,
        icon: 'trash',
        onUndo: token
          ? () =>
              startTransition(async () => {
                await undoDeleteAction(token)
                router.refresh()
              })
          : undefined,
      })
      router.refresh()
    })
  }

  const handleMove = (entry: AgendaEntry, date: IsoDate) => {
    if (!isEventEntry(entry)) return
    startTransition(async () => {
      const result = await moveEventAction(entry.eventId, { date }, entry.date)
      if (!result.ok) return toast.show({ message: result.errors.date ?? result.message ?? 'No se pudo mover.', icon: 'info' })
      setMoving(null)
      setDetailId(null)
      setSelectedId(entry.repeat === 'none' ? `${entry.eventId}@${date}` : null)
      setAnchor(date)
      toast.show({ message: `Se movió al ${dayLabel(date)}`, icon: 'check' })
      router.refresh()
    })
  }

  // Cuántos hay en el período que se ve: el renglón bajo el título del día.
  const weekRange = weekDays(anchor, weekStart)
  const periodKey = view === 'day' ? anchor : view === 'week' ? weekRange[0] : anchor.slice(0, 7)

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <PageHeading title={heading(view, anchor, today, weekStart)} squiggleWidth={220}>
          <motion.p
            className={styles.range}
            aria-live="polite"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.14 }}
          >
            {rangeLabel(view, anchor, weekStart, dayCount)}
          </motion.p>
        </PageHeading>

        <motion.div
          className={styles.controls}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.1 }}
        >
          <Segmented
            label="Vista"
            value={view}
            onChange={(next) => go(next, anchor, 0)}
            options={VIEW_OPTIONS}
          />
          <div className={styles.nav}>
            <button type="button" className={styles.iconButton} aria-label={view === 'day' ? 'Día anterior' : view === 'week' ? 'Semana anterior' : 'Mes anterior'} onClick={() => step(-1)}>
              <LineIcon d="M15 6l-6 6 6 6" size={18} strokeWidth={2} />
            </button>
            <Button variant="secondary" onClick={() => go(view, today, anchor > today ? -1 : anchor < today ? 1 : 0)}>
              Hoy
            </Button>
            <button type="button" className={styles.iconButton} aria-label={view === 'day' ? 'Día siguiente' : view === 'week' ? 'Semana siguiente' : 'Mes siguiente'} onClick={() => step(1)}>
              <LineIcon d="M9 6l6 6-6 6" size={18} strokeWidth={2} />
            </button>
          </div>
          <Button onClick={() => openCreate(view === 'day' || view === 'month' ? anchor : today)}>
            <LineIcon d="M12 5v14M5 12h14" size={16} strokeWidth={2} />
            Nuevo evento
          </Button>
        </motion.div>
      </section>

      <div className={styles.layout}>
        <section className={styles.calendarWrap} aria-label="Calendario">
          <Card className={styles.calendar}>
            <motion.div
              key={`${view}:${periodKey}`}
              initial={direction === 0 ? { opacity: 0, scale: 0.99 } : { opacity: 0, x: direction * 28 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.38, ease: EASE_OUT }}
            >
              {view === 'day' ? (
                <DayView
                  anchor={anchor}
                  entries={visible}
                  today={today}
                  nowMinutes={now}
                  hourFormat={hourFormat}
                  weekStart={weekStart}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onPickDay={(date) => go('day', date, date > anchor ? 1 : -1)}
                  onNewAt={(date, startMin) => openCreate(date, startMin)}
                />
              ) : view === 'week' ? (
                <WeekView
                  anchor={anchor}
                  entries={visible}
                  today={today}
                  nowMinutes={now}
                  hourFormat={hourFormat}
                  weekStart={weekStart}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onOpenDay={(date) => go('day', date, 0)}
                />
              ) : (
                <MonthView anchor={anchor} entries={visible} today={today} weekStart={weekStart} onOpenDay={(date) => go('day', date, 0)} />
              )}
            </motion.div>
          </Card>
        </section>

        <div className={styles.sideWrap}>
          <AgendaSidebar
            selected={selected}
            upcoming={upcoming}
            counts={counts}
            hidden={hidden}
            hourFormat={hourFormat}
            onToggleFilter={toggleFilter}
            onPickUpcoming={(entry) => {
              setSelectedId(entry.id)
              go(view, entry.date, entry.date > anchor ? 1 : -1)
            }}
            onOpenDetail={(entry) => setDetailId(entry.id)}
            onEdit={openEdit}
            onMove={setMoving}
          />
        </div>
      </div>

      <EventDrawer
        open={form !== null}
        mode={form?.mode ?? 'create'}
        initial={form?.initial ?? emptyEvent(anchor, 9 * 60)}
        projects={projects}
        pending={pending}
        serverErrors={serverErrors}
        onClose={() => setForm(null)}
        onSubmit={handleSubmit}
      />

      <EventDetailDrawer
        entry={detail && isEventEntry(detail) ? detail : null}
        hourFormat={hourFormat}
        onClose={() => setDetailId(null)}
        onEdit={openEdit}
        onDuplicate={handleDuplicate}
        onDelete={setDeleting}
      />

      <DeleteEventDialog entry={deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} />
      <MoveDayDialog entry={moving} pending={pending} onClose={() => setMoving(null)} onConfirm={handleMove} />
    </main>
  )
}
