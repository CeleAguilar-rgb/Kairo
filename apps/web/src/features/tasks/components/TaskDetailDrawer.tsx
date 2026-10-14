'use client'

import { AnimatePresence, motion } from 'motion/react'

import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Drawer } from '@/components/ui/Drawer'
import { ProgressBar } from '@/components/ui/Progress'
import { formatRelativeDay, type IsoDate } from '@/lib/dates'
import { fadeUp, staggerList } from '@/lib/motion'

import { PRIORITY_LABEL, type Task } from '../types'

import styles from './TaskDetailDrawer.module.css'

type TaskDetailDrawerProps = {
  task: Task | null
  today: IsoDate
  onClose: () => void
  onToggleDone: (task: Task) => void
  onToggleSubtask: (task: Task, subtaskId: string) => void
}

// Panel lateral del detalle de un pendiente (Main.dc.html y Tareas.dc.html).
// El contenido entra escalonado un instante después del panel, así el ojo
// sigue primero el movimiento del panel y luego lee.
export function TaskDetailDrawer({ task, today, onClose, onToggleDone, onToggleSubtask }: TaskDetailDrawerProps) {
  const done = task?.status === 'done'
  const subsDone = task?.subtasks.filter((s) => s.done).length ?? 0

  return (
    <Drawer open={task !== null} onClose={onClose} title={task?.title ?? 'Detalle'} hideTitle>
      {task ? (
        <motion.div className={styles.body} variants={staggerList(0.05, 0.12)} initial="hidden" animate="show">
          <motion.div className={styles.top} variants={fadeUp}>
            <span className={styles.chip}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 12l-8 8-8-8V4h8l8 8z" />
                <circle cx="8" cy="8" r="1.2" />
              </svg>
              {task.project?.name ?? 'Personal'}
            </span>
            <button type="button" className={styles.close} aria-label="Cerrar detalle" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </motion.div>

          <motion.div className={styles.heading} variants={fadeUp}>
            <p className={[styles.title, done ? styles.titleDone : null].filter(Boolean).join(' ')} aria-hidden="true">
              {task.title}
            </p>
            <div className={styles.meta}>
              <span className={styles.metaItem}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                {task.dueOn ? formatRelativeDay(task.dueOn, today) : 'Sin fecha'}
              </span>
              <span className={[styles.priority, styles[task.priority]].join(' ')}>{PRIORITY_LABEL[task.priority]}</span>
            </div>
          </motion.div>

          {task.notes ? (
            <motion.p className={styles.notes} variants={fadeUp}>
              {task.notes}
            </motion.p>
          ) : null}

          {task.subtasks.length > 0 ? (
            <motion.section className={styles.section} variants={fadeUp} aria-labelledby="detail-subs">
              <div className={styles.sectionHead}>
                <h3 id="detail-subs" className={styles.sectionTitle}>
                  Subtareas
                </h3>
                <span className={styles.count}>
                  {subsDone}/{task.subtasks.length}
                </span>
              </div>
              <ProgressBar value={subsDone / task.subtasks.length} label="Avance de subtareas" />
              <ul className={styles.subs}>
                {task.subtasks.map((sub) => (
                  <li key={sub.id} className={styles.sub}>
                    <Checkbox
                      checked={sub.done}
                      onToggle={() => onToggleSubtask(task, sub.id)}
                      label={(sub.done ? 'Desmarcar: ' : 'Marcar: ') + sub.title}
                    />
                    <span className={[styles.subTitle, sub.done ? styles.subDone : null].filter(Boolean).join(' ')}>{sub.title}</span>
                  </li>
                ))}
              </ul>
            </motion.section>
          ) : null}

          <motion.div className={styles.section} variants={fadeUp}>
            <label htmlFor="detail-notes" className={styles.sectionTitle}>
              Notas
            </label>
            <textarea id="detail-notes" rows={4} className={styles.textarea} placeholder="Escribe lo que necesites recordar…" />
          </motion.div>

          <motion.div className={styles.actions} variants={fadeUp}>
            <Button variant="solid" className={styles.primary} onClick={() => onToggleDone(task)}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={done ? 'undo' : 'do'}
                  className={styles.actionLabel}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={done ? 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5' : 'M5 12l5 5L20 7'} />
                  </svg>
                  {done ? 'Marcar como pendiente' : 'Marcar como hecho'}
                </motion.span>
              </AnimatePresence>
            </Button>
            <Button variant="ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 4l6 6L9 21H3v-6L14 4z" />
              </svg>
              Editar
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </Drawer>
  )
}
