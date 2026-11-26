'use client'

import { AnimatePresence, motion } from 'motion/react'
import { TASK_STATUSES } from '@kairo/shared'
import { useState, type DragEvent, type ReactNode } from 'react'

import { addDays, type IsoDate } from '@/lib/dates'
import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'
import { useEntering } from '@/lib/use-entering'

import { byDue, dueLabel, dueTone } from '../grouping'
import { STATUS_LABEL, type Task, type TaskStatus } from '../types'

import { DueText, PriorityBadge, ProjectChip, SubtaskCount } from './TaskBits'
import styles from './TaskBoard.module.css'

type TaskBoardProps = {
  tasks: Task[]
  today: IsoDate
  weekEnd: IsoDate
  // false cuando ya se filtró por un proyecto: repetir su chip en cada tarjeta no dice nada.
  showProject: boolean
  onOpen: (task: Task) => void
  onMove: (task: Task, status: TaskStatus) => void
  onDelete: (task: Task) => void
}

const COLUMN_ICON: Record<TaskStatus, ReactNode> = {
  todo: <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />,
  in_progress: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </>
  ),
  review: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  done: <path d="M5 12l5 5L20 7" />,
}

// Cerrada antes de los últimos 7 días (contando hoy). Sin fecha de cierre (datos viejos) cuenta
// como antigua: así no llena la columna. doneAt es un momento en UTC; para esta cuenta basta su día.
function isOlderThanAWeek(doneAt: string | null, today: IsoDate): boolean {
  return !doneAt || doneAt.slice(0, 10) < addDays(today, -6)
}

// Vista Tablero de Tareas.dc.html: una columna por estado. Se arrastra una
// tarjeta a otra columna, o se usa la flecha de la tarjeta (que también sirve
// con teclado y en pantallas táctiles, donde arrastrar no funciona).
export function TaskBoard({
  tasks,
  today,
  weekEnd,
  showProject,
  onOpen,
  onMove,
  onDelete,
}: TaskBoardProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null)
  const [showOlderDone, setShowOlderDone] = useState(false)
  // Al entrar, las tarjetas llegan escalonadas por columna; las que se mueven o se crean después no esperan.
  const entering = useEntering()

  function handleDrop(event: DragEvent, status: TaskStatus) {
    event.preventDefault()
    const id = dragId ?? event.dataTransfer.getData('text/plain')
    const task = tasks.find((t) => t.id === id)
    if (task && task.status !== status) onMove(task, status)
    setDragId(null)
    setOverStatus(null)
  }

  // Las tarjetas solo se reacomodan si cambia quién está en qué columna.
  const boardKey = tasks.map((t) => `${t.id}:${t.status}`).join(',')

  return (
    <div className={styles.board}>
      {TASK_STATUSES.map((status, columnIndex) => {
        const column = tasks.filter((t) => t.status === status)
        // Abiertas: por fecha, como la Lista (lo más urgente arriba). Hecho: lo último que se cerró arriba.
        const sorted =
          status === 'done'
            ? column.sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
            : column.sort(byDue)
        // "Hecho" crecía sin límite: muestra lo de los últimos 7 días y el resto detrás de un botón.
        const olderDone = status === 'done' && !showOlderDone ? sorted.filter((t) => isOlderThanAWeek(t.doneAt, today)) : []
        const cards = olderDone.length > 0 ? sorted.filter((t) => !olderDone.includes(t)) : sorted
        const isOver = overStatus === status && dragId !== null
        // Sin flecha en la última columna: antes daba la vuelta y regresaba una tarea hecha a "Por hacer".
        const next = columnIndex < TASK_STATUSES.length - 1 ? TASK_STATUSES[columnIndex + 1] : null
        return (
          <motion.section
            key={status}
            className={[styles.column, isOver ? styles.columnOver : null]
              .filter(Boolean)
              .join(' ')}
            aria-label={STATUS_LABEL[status]}
            onDragOver={(event) => {
              event.preventDefault()
              if (overStatus !== status) setOverStatus(status)
            }}
            onDrop={(event) => handleDrop(event, status)}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                duration: 0.4,
                ease: EASE_OUT,
                delay: 0.04 + columnIndex * 0.06,
              },
            }}
          >
            <div className={styles.columnHead}>
              <div className={styles.columnTitle}>
                <span
                  className={[styles.columnIcon, styles[`icon_${status}`]].join(
                    ' ',
                  )}
                  aria-hidden="true"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {COLUMN_ICON[status]}
                  </svg>
                </span>
                <h2 className={styles.columnName}>{STATUS_LABEL[status]}</h2>
              </div>
              <span
                className={[
                  styles.count,
                  status === 'in_progress' ? styles.countDark : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {cards.length}
              </span>
            </div>

            <AnimatePresence mode="popLayout">
              {cards.map((task, cardIndex) => {
                const subsDone = task.subtasks.filter((s) => s.done).length
                return (
                  // El envoltorio es de Motion (animación de layout al cambiar de columna);
                  // la tarjeta de adentro es un elemento normal porque arrastrar usa los
                  // eventos nativos del navegador, que Motion tipa distinto.
                  <motion.div
                    key={task.id}
                    layoutId={`board-card-${task.id}`}
                    layout
                    layoutDependency={boardKey}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      transition: {
                        duration: 0.35,
                        ease: EASE_OUT,
                        delay: entering ? 0.12 + columnIndex * 0.06 + Math.min(cardIndex, 6) * 0.035 : 0,
                      },
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.96,
                      transition: { duration: DURATION.fast },
                    }}
                    transition={SPRING.panel}
                  >
                    <article
                      className={[
                        styles.card,
                        status === 'done' ? styles.cardDone : null,
                        dragId === task.id ? styles.cardDragging : null,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', task.id)
                        event.dataTransfer.effectAllowed = 'move'
                        setDragId(task.id)
                      }}
                      onDragEnd={() => {
                        setDragId(null)
                        setOverStatus(null)
                      }}
                    >
                      <div className={styles.cardTop}>
                        {showProject ? <ProjectChip project={task.project} /> : <span />}
                        <div className={styles.cardTopActions}>
                          <button
                            type="button"
                            className={styles.delete}
                            onClick={() => onDelete(task)}
                            aria-label={`Borrar "${task.title}"`}
                          >
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
                          </button>
                          {next ? (
                            <button
                              type="button"
                              className={styles.next}
                              onClick={() => onMove(task, next)}
                              aria-label={`Mover "${task.title}" a ${STATUS_LABEL[next]}`}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M9 6l6 6-6 6" />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <h3 className={styles.cardTitle}>
                        <button
                          type="button"
                          className={styles.openButton}
                          onClick={() => onOpen(task)}
                        >
                          {task.title}
                        </button>
                      </h3>
                      <div className={styles.cardMeta}>
                        {task.subtasks.length > 0 ? (
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
                            <path d="M9 11l3 3 8-8" />
                            <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
                          </svg>
                        ) : null}
                        <SubtaskCount done={subsDone} total={task.subtasks.length} />
                        {/* La Lista mostraba la prioridad y el tablero no; en "Hecho" ya no importa */}
                        {status !== 'done' ? <PriorityBadge priority={task.priority} /> : null}
                        <span className={styles.cardDue}>
                          <DueText
                            label={dueLabel(task.dueOn, today, weekEnd)}
                            tone={dueTone(task, today)}
                          />
                        </span>
                      </div>
                    </article>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {olderDone.length > 0 ? (
              <button type="button" className={styles.olderDone} onClick={() => setShowOlderDone(true)}>
                Ver {olderDone.length} {olderDone.length === 1 ? 'anterior' : 'anteriores'}
              </button>
            ) : null}

            {cards.length === 0 && olderDone.length === 0 ? (
              <p className={styles.dropHint}>Arrastra una tarjeta aquí</p>
            ) : null}
          </motion.section>
        )
      })}
    </div>
  )
}
