'use client'

import type { CreateReminderInput } from '@kairo/shared'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useOptimistic, useState, useTransition } from 'react'

import { PageHeading } from '@/components/layout/PageHeading'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, LineIcon } from '@/components/ui/Card'
import { Doodle } from '@/components/ui/Doodle'
import { useToast } from '@/components/ui/Toast'
import { addDays, minutesNowIn, minutesToWallTime, todayIn } from '@/lib/dates'
import { EASE_OUT } from '@/lib/motion'
import { useEntering } from '@/lib/use-entering'

import { completeReminderAction, createReminderAction, snoozeReminderAction, undoReminderAction } from '../actions'
import { isLate, nextReminderText, snoozeTarget, splitByDay, type WhenContext } from '../reminder-utils'
import type { Reminder, ReminderSnooze } from '../types'

import styles from './RemindersView.module.css'
import { ReminderForm } from './ReminderForm'
import { ReminderRow } from './ReminderRow'

type RemindersViewProps = {
  // Todos los pendientes, por hora. "Para hoy" y "Más adelante" se separan aquí.
  reminders: Reminder[]
  // El momento en que el servidor armó la página: de ahí parte el reloj (así servidor y navegador pintan lo mismo).
  nowIso: string
  timeZone: string
  hourFormat: '12h' | '24h'
}

// Lo que se ve al instante, antes de que el servidor conteste: marcar como listo quita la fila y
// posponer le cambia la hora. Cuando llega la lista de verdad, reemplaza esto.
type OptimisticAction = { type: 'complete'; id: string } | { type: 'snooze'; id: string; snoozedTo: string }

const SNOOZE_TEXT: Record<ReminderSnooze, string> = {
  '10m': 'en 10 minutos',
  '1h': 'en 1 hora',
  tomorrow: 'mañana',
}

// El formulario abre con hoy y la próxima media hora; si ya es tarde, con mañana temprano.
function newDraft(nowIso: string, timeZone: string): CreateReminderInput {
  const now = new Date(nowIso)
  const today = todayIn(timeZone, now)
  const next = Math.ceil((minutesNowIn(timeZone, now) + 1) / 30) * 30
  if (next >= 24 * 60) return { title: '', date: addDays(today, 1), time: '08:00', repeat: 'none' }
  return { title: '', date: today, time: minutesToWallTime(next), repeat: 'none' }
}

// Recordatorios (Recordatorios.dc.html): "Para hoy" con lo de hoy y lo atrasado, el formulario de nuevo
// recordatorio, y "Más adelante" con lo que viene. Lo que se hace pasa por acciones de servidor
// (actions.ts); la lista se actualiza sola porque cada acción revalida la página.
export function RemindersView({ reminders, nowIso, timeZone, hourFormat }: RemindersViewProps) {
  const toast = useToast()
  const entering = useEntering()
  const [, startTransition] = useTransition()
  const [creating, startCreating] = useTransition()

  const [now, setNow] = useState(nowIso)
  const [draft, setDraft] = useState<CreateReminderInput | null>(null)
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})

  // El reloj avanza solo: lo que se atrasa se pone en rojo y lo de mañana pasa a "Para hoy" a medianoche.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().toISOString()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const [visible, applyOptimistic] = useOptimistic(reminders, (current, action: OptimisticAction) =>
    action.type === 'complete'
      ? current.filter((reminder) => reminder.id !== action.id)
      : current.map((reminder) => (reminder.id === action.id ? { ...reminder, snoozedTo: action.snoozedTo } : reminder)),
  )

  const today = todayIn(timeZone, new Date(now))
  const context: WhenContext = { nowIso: now, today, timeZone, hourFormat }
  const { today: dueToday, later } = splitByDay(visible, today, timeZone)

  // Quién está en qué lista y en qué orden: Motion solo re-mide las filas si esto cambia.
  const layoutKey = `${dueToday.map((reminder) => reminder.id).join(',')}|${later.map((reminder) => reminder.id).join(',')}`

  const undo = (token: string) =>
    startTransition(async () => {
      const result = await undoReminderAction(token)
      if (!result.ok) toast.show({ message: result.message ?? 'Ya no se puede deshacer.', icon: 'info' })
    })

  const handleComplete = (reminder: Reminder) =>
    startTransition(async () => {
      applyOptimistic({ type: 'complete', id: reminder.id })
      const result = await completeReminderAction(reminder.id)
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo marcar como listo.', icon: 'info' })
      const token = result.undoToken
      toast.show({ message: `"${reminder.title}" quedó listo.`, icon: 'check', onUndo: token ? () => undo(token) : undefined })
    })

  const handleSnooze = (reminder: Reminder, option: ReminderSnooze) =>
    startTransition(async () => {
      applyOptimistic({ type: 'snooze', id: reminder.id, snoozedTo: snoozeTarget(option, new Date().toISOString(), timeZone) })
      const result = await snoozeReminderAction(reminder.id, { until: option })
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo posponer.', icon: 'info' })
      const token = result.undoToken
      toast.show({ message: `Te lo recordaré ${SNOOZE_TEXT[option]}.`, icon: 'check', onUndo: token ? () => undo(token) : undefined })
    })

  const handleCreate = (input: CreateReminderInput) =>
    startCreating(async () => {
      const result = await createReminderAction(input)
      if (!result.ok) {
        setServerErrors(result.errors)
        toast.show({ message: result.message ?? 'Revisa los campos marcados.', icon: 'info' })
        return
      }
      setDraft(null)
      setServerErrors({})
      toast.show({ message: 'Recordatorio guardado.', icon: 'check' })
    })

  const openForm = () => {
    setServerErrors({})
    setDraft(newDraft(now, timeZone))
  }

  const pendingCount = dueToday.length
  const countText = pendingCount === 0 ? null : `· ${pendingCount} ${pendingCount === 1 ? 'pendiente' : 'pendientes'}`

  const renderRow = (reminder: Reminder, index: number, tone: 'accent' | 'surface') => (
    <ReminderRow
      key={reminder.id}
      reminder={reminder}
      tone={tone}
      context={context}
      late={isLate(reminder, now, today, timeZone)}
      layoutKey={layoutKey}
      delay={entering ? 0.25 + Math.min(index, 8) * 0.05 : 0}
      onComplete={handleComplete}
      onSnooze={handleSnooze}
    />
  )

  return (
    <main className={styles.main}>
      <PageHeading title="Recordatorios" squiggleWidth={260} />

      <div className={styles.grid}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.12 }}
        >
          <Card as="section" tone="accent" className={styles.todayCard} aria-labelledby="reminders-today">
            <CardHeader
              id="reminders-today"
              title={
                <>
                  Para hoy {countText ? <span className={styles.count}>{countText}</span> : null}
                </>
              }
              iconTone="surface"
              icon={<LineIcon d={['M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0']} />}
              action={
                <Button variant="plain" className={styles.newButton} aria-expanded={draft !== null} onClick={draft ? () => setDraft(null) : openForm}>
                  <LineIcon d="M12 5v14M5 12h14" size={14} strokeWidth={2.2} />
                  Nuevo
                </Button>
              }
            />

            <AnimatePresence initial={false}>
              {draft ? (
                <ReminderForm
                  key="form"
                  initial={draft}
                  timeZone={timeZone}
                  pending={creating}
                  serverErrors={serverErrors}
                  onCancel={() => setDraft(null)}
                  onSubmit={handleCreate}
                />
              ) : null}
            </AnimatePresence>

            <ul className={styles.list} aria-labelledby="reminders-today">
              <AnimatePresence mode="popLayout">{dueToday.map((reminder, index) => renderRow(reminder, index, 'accent'))}</AnimatePresence>
            </ul>

            <AnimatePresence>
              {dueToday.length === 0 ? (
                <motion.div
                  key="all-done"
                  className={styles.allDone}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                >
                  <svg width="86" height="70" viewBox="0 0 86 70" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <motion.path
                      d="M14 40c6 8 12 12 18 12 12 0 16-26 40-40"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
                    />
                    <path d="M66 50l4 4M72 44l6 1M60 58l1 6" strokeWidth="2" />
                  </svg>
                  <span className={styles.allDoneTitle}>Todo al día</span>
                  <span className={styles.allDoneText}>No hay nada pendiente por recordar. {nextReminderText(later[0], context)}</span>
                  {draft ? null : (
                    <Button variant="plain" className={styles.newButton} onClick={openForm}>
                      <LineIcon d="M12 5v14M5 12h14" size={14} strokeWidth={2.2} />
                      Nuevo recordatorio
                    </Button>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.2 }}
        >
          <Card as="section" className={styles.laterCard} aria-labelledby="reminders-later">
            <CardHeader
              id="reminders-later"
              title="Más adelante"
              subtitle={later.length === 0 ? undefined : `${later.length} ${later.length === 1 ? 'recordatorio' : 'recordatorios'}`}
              icon={<LineIcon d={['M3 5h18v16H3z', 'M3 10h18M8 3v4M16 3v4']} />}
            />

            <ul className={styles.list} aria-labelledby="reminders-later">
              <AnimatePresence mode="popLayout">{later.map((reminder, index) => renderRow(reminder, index + dueToday.length, 'surface'))}</AnimatePresence>
            </ul>

            {later.length === 0 ? (
              <div className={styles.laterEmpty}>
                <Doodle kind="cloud" size={40} strokeWidth={2} />
                <span>Nada programado para otros días. Lo que agregues con otra fecha aparece aquí.</span>
              </div>
            ) : null}
          </Card>
        </motion.div>
      </div>
    </main>
  )
}
