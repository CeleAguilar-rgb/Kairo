'use client'

import { addGoalProgressSchema, milestoneSchema } from '@kairo/shared'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useOptimistic, useState, useTransition, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/Toast'
import type { IsoDate } from '@/lib/dates'
import { fieldErrors } from '@/lib/form-errors'
import { DURATION, EASE_OUT } from '@/lib/motion'

import {
  achieveGoalAction,
  addGoalProgressAction,
  addMilestoneAction,
  deleteGoalAction,
  setGoalPausedAction,
  toggleMilestoneAction,
} from '../goal-actions'
import { formatLogAmount, formatLogDate, goalDueText, goalPercent, goalProgressText, goalRatio } from '../goal-utils'
import { undoRoutineAction } from '../routine-actions'
import { GOAL_KIND_LONG } from '../routine-meta'
import type { Goal } from '../types'

import { AreaChip } from './GoalCard'
import styles from './GoalDetailDrawer.module.css'
import { ProgressDial } from './ProgressDial'

type GoalDetailDrawerProps = {
  goal: Goal | null
  today: IsoDate
  onClose: () => void
  onEdit: (goal: Goal) => void
  // Se logró (con el último hito o con "La logré"): la pantalla muestra la celebración.
  onAchieved: (title: string) => void
}

export function GoalDetailDrawer({ goal, today, onClose, onEdit, onAchieved }: GoalDetailDrawerProps) {
  return (
    <Drawer open={goal !== null} onClose={onClose} title={goal?.title ?? 'Meta'} hideTitle width="lg">
      {goal ? <GoalDetail key={goal.id} goal={goal} today={today} onClose={onClose} onEdit={onEdit} onAchieved={onAchieved} /> : null}
    </Drawer>
  )
}

type DetailProps = Omit<GoalDetailDrawerProps, 'goal'> & { goal: Goal }

function GoalDetail({ goal, today, onClose, onEdit, onAchieved }: DetailProps) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [amount, setAmount] = useState('')
  const [newMilestone, setNewMilestone] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Marcar un hito se ve al instante (y mueve el anillo); la lista real llega cuando la acción termina.
  const [milestones, flip] = useOptimistic(goal.milestones, (current, id: string) => current.map((item) => (item.id === id ? { ...item, done: !item.done } : item)))
  const view: Goal =
    goal.kind === 'milestones' ? { ...goal, milestones, target: milestones.length, current: milestones.filter((item) => item.done).length } : goal

  const fail = (message: string | undefined, fallback: string) => toast.show({ message: message ?? fallback, icon: 'info' })

  function handleToggle(id: string) {
    startTransition(async () => {
      flip(id)
      const result = await toggleMilestoneAction(goal.id, id)
      if (!result.ok) return fail(result.message, 'No se pudo marcar el hito.')
      if (result.achieved) onAchieved(goal.title)
    })
  }

  function handleAddMilestone(event: FormEvent) {
    event.preventDefault()
    const parsed = milestoneSchema.safeParse({ text: newMilestone })
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues))
    startTransition(async () => {
      const result = await addMilestoneAction(goal.id, parsed.data)
      if (!result.ok) return setErrors(result.errors)
      setNewMilestone('')
      setErrors({})
    })
  }

  function handleAddProgress(event: FormEvent) {
    event.preventDefault()
    const parsed = addGoalProgressSchema.safeParse({ amount: Number(amount.replaceAll(',', '')) })
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues))
    startTransition(async () => {
      const result = await addGoalProgressAction(goal.id, parsed.data)
      if (!result.ok) return setErrors(result.errors)
      setAmount('')
      setErrors({})
      toast.show({ message: 'Avance registrado.', icon: 'check' })
    })
  }

  function handleAchieve() {
    startTransition(async () => {
      const result = await achieveGoalAction(goal.id)
      if (!result.ok) return fail(result.message, 'No se pudo marcar la meta como lograda.')
      onAchieved(goal.title)
    })
  }

  function handlePause() {
    const paused = goal.status !== 'paused'
    startTransition(async () => {
      const result = await setGoalPausedAction(goal.id, paused)
      if (!result.ok) return fail(result.message, 'No se pudo cambiar el estado de la meta.')
      toast.show({ message: paused ? 'Meta en pausa. Su avance se queda guardado.' : 'Meta retomada.', icon: 'check' })
      onClose()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGoalAction(goal.id)
      if (!result.ok) return fail(result.message, 'No se pudo borrar la meta.')
      onClose()
      const token = result.undoToken
      toast.show({ message: `Se borró la meta "${goal.title}"`, icon: 'trash', onUndo: token ? () => void undoRoutineAction(token) : undefined })
    })
  }

  return (
    <div className={styles.panel}>
      <header className={styles.head}>
        <AreaChip area={goal.area} />
        <button type="button" className={styles.close} aria-label="Cerrar detalle" onClick={onClose}>
          <LineIcon d="M6 6l12 12M18 6L6 18" size={20} />
        </button>
      </header>

      <div className={styles.body}>
        <div className={styles.titles}>
          <p className={styles.title} aria-hidden="true">
            {goal.title}
          </p>
          {goal.why ? <span className={styles.why}>“{goal.why}”</span> : null}
        </div>

        <div className={styles.ringBox}>
          <ProgressDial value={goalRatio(view)} size={84} track="border">
            <span className={styles.ringLabel}>{goalPercent(view)}%</span>
          </ProgressDial>
          <div className={styles.ringText}>
            <span className={styles.ringMain}>{goalProgressText(view)}</span>
            <span className={styles.hint}>{GOAL_KIND_LONG[goal.kind]}</span>
            <span className={styles.hint}>Fecha meta: {goalDueText(goal, today)}</span>
          </div>
        </div>

        {goal.kind === 'milestones' ? (
          <section className={styles.section} aria-labelledby="goal-hitos">
            <h3 id="goal-hitos" className={styles.sectionTitle}>
              Hitos
            </h3>
            {milestones.map((milestone) => (
              <button
                key={milestone.id}
                type="button"
                role="checkbox"
                aria-checked={milestone.done}
                className={styles.hito}
                disabled={goal.status === 'done'}
                onClick={() => handleToggle(milestone.id)}
              >
                <span className={[styles.box, milestone.done ? styles.boxOn : null].filter(Boolean).join(' ')}>
                  {milestone.done ? <LineIcon d="M5 12l5 5L20 7" size={13} strokeWidth={3} /> : null}
                </span>
                <span className={milestone.done ? styles.hitoDone : undefined}>{milestone.text}</span>
              </button>
            ))}
            <form className={styles.inline} onSubmit={handleAddMilestone} noValidate>
              <label htmlFor="goal-new-milestone" className={styles.srOnly}>
                Nuevo hito
              </label>
              <input
                id="goal-new-milestone"
                className={styles.input}
                type="text"
                maxLength={120}
                autoComplete="off"
                placeholder="Agregar un hito"
                value={newMilestone}
                aria-invalid={Boolean(errors.text)}
                onChange={(event) => {
                  setNewMilestone(event.target.value)
                  setErrors({})
                }}
              />
              <Button type="submit" variant="ghost" disabled={pending}>
                Agregar
              </Button>
            </form>
            {errors.text ? <span className={styles.error}>{errors.text}</span> : null}
            <span className={styles.hint}>Al marcar el último hito, la meta se da por lograda.</span>
          </section>
        ) : null}

        {goal.kind === 'number' ? (
          <section className={styles.section} aria-labelledby="goal-progress">
            <h3 id="goal-progress" className={styles.sectionTitle}>
              Registrar avance
            </h3>
            <form className={styles.inline} onSubmit={handleAddProgress} noValidate>
              <label htmlFor="goal-add" className={styles.srOnly}>
                Cantidad a sumar
              </label>
              <input
                id="goal-add"
                className={styles.input}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Cantidad a sumar"
                value={amount}
                aria-invalid={Boolean(errors.amount)}
                onChange={(event) => {
                  setAmount(event.target.value)
                  setErrors({})
                }}
              />
              <Button type="submit" disabled={pending}>
                Sumar
              </Button>
            </form>
            {errors.amount ? <span className={styles.error}>{errors.amount}</span> : null}
            <ul className={styles.log}>
              {goal.log.slice(0, 5).map((entry) => (
                <li key={entry.id} className={styles.logRow}>
                  <span>{formatLogDate(entry)}</span>
                  <span className={styles.logAmount}>{formatLogAmount(entry.amount, goal.unit)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {goal.linkHref && goal.linkLabel ? (
          <Link href={goal.linkHref} className={styles.link}>
            <LineIcon d={['M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1', 'M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1']} />
            <span className={styles.linkText}>{goal.linkLabel}</span>
            <LineIcon d="M9 6l6 6-6 6" size={16} strokeWidth={2} />
          </Link>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {confirmDelete ? (
          <motion.div
            key="confirm"
            className={styles.confirmWrap}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto', transition: { duration: 0.3, ease: EASE_OUT } }}
            exit={{ opacity: 0, height: 0, transition: { duration: DURATION.base } }}
          >
            <div role="alertdialog" aria-labelledby="goal-del-title" className={styles.confirm}>
              <span id="goal-del-title" className={styles.confirmText}>
                ¿Borrar la meta &quot;{goal.title}&quot;? Va a la papelera con su avance.
              </span>
              <Button variant="ghost" className={styles.confirmCancel} onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
              <Button variant="danger" className={styles.confirmDo} onClick={handleDelete} disabled={pending}>
                Borrar meta
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <footer className={styles.footer}>
        <Button variant="ghost" iconOnly className={styles.trash} aria-label="Borrar meta" onClick={() => setConfirmDelete(true)}>
          <LineIcon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
        </Button>
        <Button variant="ghost" onClick={handlePause} disabled={pending}>
          {goal.status === 'paused' ? 'Retomar' : 'Pausar'}
        </Button>
        <Button variant="ghost" onClick={() => onEdit(goal)}>
          Editar
        </Button>
        <Button className={styles.achieve} onClick={handleAchieve} disabled={pending}>
          La logré
        </Button>
      </footer>
    </div>
  )
}
