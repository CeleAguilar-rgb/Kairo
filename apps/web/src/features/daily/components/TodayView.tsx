'use client'

import { motion } from 'motion/react'
import { useEffect, useOptimistic, useState, useTransition } from 'react'

import { ButtonLink } from '@/components/ui/ButtonLink'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { minutesNowIn, minutesToWallTime } from '@/lib/dates'
import { EASE_OUT } from '@/lib/motion'

import { completeFocusTaskAction, toggleRoutineBlockAction } from '../routine-actions'
import { dayProgress, isLateMark } from '../routine-utils'
import type { MealPlan, RoutineBlockToday, RoutineDay, Streak } from '../types'

import { DailyToolbar } from './DailyToolbar'
import { EditRoutineLink } from './EditRoutineLink'
import { RoutineTimeline } from './RoutineTimeline'
import { DayProgressCard, StreaksCard, TodayMenuCard } from './TodayCards'
import styles from './TodayView.module.css'

type TodayViewProps = {
  day: RoutineDay
  streaks: Streak[]
  meals: MealPlan[]
  // El momento en que el servidor armó la página: de ahí parte el reloj (así servidor y navegador pintan lo mismo).
  nowIso: string
  timeZone: string
  hourFormat: '12h' | '24h'
  // "Jueves 8 de octubre"
  dateText: string
}

// Lo que se ve al instante, antes de que el servidor conteste.
type OptimisticAction = { type: 'toggle'; id: string; done: boolean; nowMinutes: number } | { type: 'task'; id: string; nowMinutes: number }

function applyOptimistic(day: RoutineDay, action: OptimisticAction): RoutineDay {
  const mark = (block: RoutineBlockToday): RoutineBlockToday => ({
    ...block,
    log: { doneAt: minutesToWallTime(action.nowMinutes), late: isLateMark(block, action.nowMinutes) },
  })

  if (action.type === 'toggle') {
    const blocks = day.blocks.map((block) => (block.id !== action.id ? block : action.done ? mark(block) : { ...block, log: null }))
    return { ...day, blocks }
  }

  const blocks = day.blocks.map((block) => (block.id !== action.id || block.log ? block : mark(block)))
  const info = day.focus[action.id]
  const focus = info ? { ...day.focus, [action.id]: { ...info, doneCount: Math.min(info.doneCount + 1, info.tasks.length) } } : day.focus
  return { ...day, blocks, focus }
}

// Hoy (DiaADia.dc.html): la rutina del día en línea de tiempo, el avance, el menú y las rachas. Marcar un
// bloque pasa por una acción de servidor; la fila reacciona al instante y la lista real la reemplaza.
export function TodayView({ day, streaks, meals, nowIso, timeZone, hourFormat, dateText }: TodayViewProps) {
  const toast = useToast()
  const [, startTransition] = useTransition()
  const [now, setNow] = useState(nowIso)
  const [visible, apply] = useOptimistic(day, applyOptimistic)

  // El reloj avanza solo: lo que se atrasa se pone en rojo y la raya de "ahora" se mueve.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().toISOString()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const nowMinutes = minutesNowIn(timeZone, new Date(now))
  const progress = dayProgress(visible.blocks)
  const routineName = visible.routine?.name

  const handleToggle = (block: RoutineBlockToday) =>
    startTransition(async () => {
      const done = block.log === null
      apply({ type: 'toggle', id: block.id, done, nowMinutes })
      const result = await toggleRoutineBlockAction({ blockId: block.id, done })
      if (!result.ok) toast.show({ message: result.message ?? 'No se pudo guardar. Intenta de nuevo.', icon: 'info' })
    })

  const handleTask = (block: RoutineBlockToday) =>
    startTransition(async () => {
      apply({ type: 'task', id: block.id, nowMinutes })
      const result = await completeFocusTaskAction(block.id)
      if (!result.ok) toast.show({ message: result.message ?? 'No se pudo guardar. Intenta de nuevo.', icon: 'info' })
    })

  return (
    <>
      <DailyToolbar action={<EditRoutineLink />}>
        {dateText}
        {routineName ? ` · rutina ${routineName}` : ''}
      </DailyToolbar>

      {visible.blocks.length === 0 ? (
        <EmptyState
          id="today-empty"
          title={routineName ? `Tu rutina ${routineName} está en blanco` : 'Hoy no aplica ninguna rutina'}
          description={
            routineName
              ? 'Agrega bloques como despertar, comidas o un rato para escribir, y aquí aparecen para ir marcándolos.'
              : 'Elige los días de una rutina para ver aquí lo que toca hacer cada día.'
          }
          doodle="sun"
          actions={<ButtonLink href="/dia-a-dia/rutina">Editar rutina</ButtonLink>}
        />
      ) : (
        <div className={styles.grid}>
          <motion.section
            className={styles.timeline}
            aria-label="Rutina de hoy"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.12 }}
          >
            <RoutineTimeline
              blocks={visible.blocks}
              focus={visible.focus}
              nowMinutes={nowMinutes}
              hourFormat={hourFormat}
              onToggle={handleToggle}
              onCompleteTask={handleTask}
              onPomodoro={() => toast.show({ message: 'El pomodoro llega con Música y enfoque.', icon: 'info' })}
            />
          </motion.section>

          <motion.div
            className={styles.side}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.2 }}
          >
            <DayProgressCard {...progress} />
            <TodayMenuCard meals={meals} />
            <StreaksCard streaks={streaks} />
          </motion.div>
        </div>
      )}
    </>
  )
}
