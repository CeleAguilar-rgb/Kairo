'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Drawer } from '@/components/ui/Drawer'
import { ProgressBar } from '@/components/ui/Progress'
import { Segmented } from '@/components/ui/Segmented'
import { useFocus } from '@/features/focus'
import { formatRelativeDay, type IsoDate } from '@/lib/dates'
import { fadeUp, staggerList } from '@/lib/motion'

import { TASK_STATUSES } from '@kairo/shared'
import Link from 'next/link'

import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  type Task,
  type TaskStatus,
} from '../types'

import styles from './TaskDetailDrawer.module.css'

type TaskDetailDrawerProps = {
  task: Task | null
  today: IsoDate
  onClose: () => void
  onToggleDone: (task: Task) => void
  onToggleSubtask: (task: Task, subtaskId: string) => void
  // Si viene, el panel muestra el selector de Estado (Tareas); Inicio no lo necesita.
  onChangeStatus?: (task: Task, status: TaskStatus) => void
  // Si viene, el panel muestra "Borrar" (Tareas); Inicio no lo necesita.
  onDelete?: (task: Task) => void
  // Si viene, las notas se editan y se guardan solas (Tareas). Devuelve si se guardó.
  onSaveNotes?: (task: Task, notes: string) => Promise<boolean>
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const SAVE_LABEL: Record<SaveState, string> = {
  idle: '',
  saving: 'Guardando…',
  saved: 'Guardado',
  error: 'No se pudo guardar. Se intentará otra vez al seguir escribiendo.',
}

// Espera tras la última tecla antes de guardar: suficiente para no mandar una petición por letra.
const SAVE_DELAY_MS = 800

// Notas de la tarea: se guardan solas un momento después de dejar de escribir, al salir del campo
// y al cerrar el panel. Antes había un campo "Notas" que no guardaba nada y lo escrito se perdía.
function NotesField({ task, onSave }: { task: Task; onSave: (task: Task, notes: string) => Promise<boolean> }) {
  const [value, setValue] = useState(task.notes ?? '')
  const [state, setState] = useState<SaveState>('idle')
  // Refs: lo último escrito y lo último guardado, para el temporizador y para el guardado al cerrar.
  const savedRef = useRef(task.notes ?? '')
  const valueRef = useRef(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function save() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    const notes = valueRef.current
    if (notes.trim() === savedRef.current.trim()) return
    setState('saving')
    const ok = await onSave(task, notes)
    if (ok) savedRef.current = notes
    // Si siguió escribiendo mientras se guardaba, el próximo guardado ya está en camino.
    if (valueRef.current === notes) setState(ok ? 'saved' : 'error')
  }

  // useEffectEvent: la limpieza ve el task y onSave más recientes sin que el efecto dependa de ellos.
  const saveOnClose = useEffectEvent(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const notes = valueRef.current
    if (notes.trim() !== savedRef.current.trim()) void onSave(task, notes)
  })

  // Al cerrar el panel (se desmonta el campo) se guarda lo que faltaba.
  useEffect(() => () => saveOnClose(), [])

  return (
    <>
      <div className={styles.sectionHead}>
        <label htmlFor="detail-notes" className={styles.sectionTitle}>
          Notas
        </label>
        <span className={styles.saveState} role="status" aria-live="polite">
          {SAVE_LABEL[state]}
        </span>
      </div>
      <textarea
        id="detail-notes"
        rows={4}
        maxLength={5000}
        className={styles.textarea}
        placeholder="Escribe lo que necesites recordar…"
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          valueRef.current = event.target.value
          setState('idle')
          if (timerRef.current) clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => void save(), SAVE_DELAY_MS)
        }}
        onBlur={() => void save()}
      />
    </>
  )
}

// Panel lateral del detalle de un pendiente (Main.dc.html y Tareas.dc.html).
// El contenido entra escalonado un instante después del panel, así el ojo
// sigue primero el movimiento del panel y luego lee.
export function TaskDetailDrawer({
  task,
  today,
  onClose,
  onToggleDone,
  onToggleSubtask,
  onChangeStatus,
  onDelete,
  onSaveNotes,
}: TaskDetailDrawerProps) {
  const focus = useFocus()
  const done = task?.status === 'done'
  const subsDone = task?.subtasks.filter((s) => s.done).length ?? 0

  return (
    <Drawer
      open={task !== null}
      onClose={onClose}
      title={task?.title ?? 'Detalle'}
      hideTitle
    >
      {task ? (
        <motion.div
          className={styles.body}
          variants={staggerList(0.05, 0.12)}
          initial="hidden"
          animate="show"
        >
          <motion.div className={styles.top} variants={fadeUp}>
            {task.project ? (
              <Link
                href={`/proyectos/${task.project.id}`}
                className={styles.chip}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 12l-8 8-8-8V4h8l8 8z" />
                  <circle cx="8" cy="8" r="1.2" />
                </svg>
                {task.project.name}
              </Link>
            ) : (
              <span className={styles.chip}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 12l-8 8-8-8V4h8l8 8z" />
                  <circle cx="8" cy="8" r="1.2" />
                </svg>
                Sin proyecto
              </span>
            )}
            <div className={styles.topActions}>
              <button
                type="button"
                className={styles.close}
                aria-label="Cerrar detalle"
                onClick={onClose}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </motion.div>

          <motion.div className={styles.heading} variants={fadeUp}>
            <p
              className={[styles.title, done ? styles.titleDone : null]
                .filter(Boolean)
                .join(' ')}
              aria-hidden="true"
            >
              {task.title}
            </p>
            <div className={styles.meta}>
              <span className={styles.metaItem}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                {task.dueOn
                  ? formatRelativeDay(task.dueOn, today)
                  : 'Sin fecha'}
              </span>
              <span
                className={[styles.priority, styles[task.priority]].join(' ')}
              >
                {PRIORITY_LABEL[task.priority]}
              </span>
            </div>
          </motion.div>

          {/* Sin onSaveNotes (Inicio) las notas solo se leen; con él (Tareas) se editan aquí mismo */}
          {!onSaveNotes && task.notes ? (
            <motion.p className={styles.notes} variants={fadeUp}>
              {task.notes}
            </motion.p>
          ) : null}

          {onChangeStatus ? (
            <motion.div className={styles.section} variants={fadeUp}>
              <h3 className={styles.sectionTitle}>Estado</h3>
              <Segmented
                label="Estado"
                mode="radio"
                tone="raised"
                value={task.status}
                onChange={(status) => onChangeStatus(task, status)}
                options={TASK_STATUSES.map((value) => ({
                  value,
                  label: STATUS_LABEL[value],
                }))}
              />
            </motion.div>
          ) : null}

          {task.subtasks.length > 0 ? (
            <motion.section
              className={styles.section}
              variants={fadeUp}
              aria-labelledby="detail-subs"
            >
              <div className={styles.sectionHead}>
                <h3 id="detail-subs" className={styles.sectionTitle}>
                  Subtareas
                </h3>
                <span className={styles.count}>
                  {subsDone}/{task.subtasks.length}
                </span>
              </div>
              <ProgressBar
                value={subsDone / task.subtasks.length}
                label="Avance de subtareas"
              />
              <ul className={styles.subs}>
                {task.subtasks.map((sub) => (
                  <li key={sub.id} className={styles.sub}>
                    <Checkbox
                      checked={sub.done}
                      onToggle={() => onToggleSubtask(task, sub.id)}
                      label={
                        (sub.done ? 'Desmarcar: ' : 'Marcar: ') + sub.title
                      }
                    />
                    <span
                      className={[
                        styles.subTitle,
                        sub.done ? styles.subDone : null,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {sub.title}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.section>
          ) : null}

          {onSaveNotes ? (
            <motion.div className={styles.section} variants={fadeUp}>
              {/* key: al abrir otra tarea, el campo arranca de cero con sus notas */}
              <NotesField key={task.id} task={task} onSave={onSaveNotes} />
            </motion.div>
          ) : null}

          <motion.div className={styles.actions} variants={fadeUp}>
            <Button
              variant="solid"
              className={styles.primary}
              onClick={() => onToggleDone(task)}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={done ? 'undo' : 'do'}
                  className={styles.actionLabel}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path
                      d={
                        done
                          ? 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5'
                          : 'M5 12l5 5L20 7'
                      }
                    />
                  </svg>
                  {done ? 'Marcar como pendiente' : 'Marcar como hecho'}
                </motion.span>
              </AnimatePresence>
            </Button>
            <Button variant="ghost" onClick={() => focus.focusOnTask({ id: task.id, title: task.title })}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M10 9v6l5-3z" fill="currentColor" stroke="none" />
              </svg>
              Pomodoro
            </Button>
          </motion.div>

          {/* Borrar vive aquí abajo, separado del resto: arriba quedaba pegado a la X de cerrar y era
              fácil tocar uno por el otro. Con texto, además, se entiende qué hace sin adivinar el ícono. */}
          {onDelete ? (
            <motion.div className={styles.footer} variants={fadeUp}>
              <button type="button" className={styles.delete} onClick={() => onDelete(task)}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                </svg>
                Mandar a la papelera
              </button>
            </motion.div>
          ) : null}
        </motion.div>
      ) : null}
    </Drawer>
  )
}
