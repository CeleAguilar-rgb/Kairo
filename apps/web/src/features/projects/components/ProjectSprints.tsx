'use client'

import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card, CardHeader, LineIcon } from '@/components/ui/Card'
import { Doodle } from '@/components/ui/Doodle'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { formatRange, type IsoDate } from '@/lib/dates'
import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'

import {
  addFromBacklog,
  closeSprint,
  daysLeftText,
  moveTask,
  SPRINT_COLUMNS,
  sprintDays,
  startSprint,
  taskMeta,
  type CloseOptions,
  type SprintState,
} from '../sprint-utils'
import type { ProjectSprints as ProjectSprintsData } from '../types'

import styles from './ProjectSprints.module.css'
import { CloseSprintDrawer, StartSprintDrawer } from './SprintPanel'

type ProjectSprintsProps = {
  sprints: ProjectSprintsData
  today: IsoDate
  weekEnd: IsoDate
}

// Cada tarjeta entra un poco después de la anterior, de arriba hacia abajo.
const enter = (position: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT, delay: 0.1 + position * 0.07 } },
})

// La tira de 14 días del sprint: los que pasaron, hoy, los que faltan y (en sprints de una
// semana) los que sobran, que no se ven.
function dayClass(position: number, total: number, index: number) {
  if (position >= total) return styles.dayNone
  if (position < index) return styles.dayPast
  if (position === index) return styles.dayToday
  return styles.dayFuture
}

// La pestaña Sprints (ProyectoSprints.dc.html): el sprint activo, su tablero, el backlog y los
// cerrados. Hoy todo vive en memoria; la lógica está en sprint-utils.ts.
export function ProjectSprints({ sprints, today, weekEnd }: ProjectSprintsProps) {
  const toast = useToast()
  const [state, setState] = useState<SprintState>(sprints)
  const [closeOpen, setCloseOpen] = useState(false)
  const [startOpen, setStartOpen] = useState(false)

  const { active, tasks, backlog, closed } = state
  const doneCount = tasks.filter((task) => task.status === 'done').length
  const openCount = tasks.length - doneCount
  const fraction = tasks.length === 0 ? 0 : doneCount / tasks.length
  const days = active ? sprintDays(active, today) : null
  const nextNumber = active ? active.number + 1 : (closed[0]?.number ?? 0) + 1

  const handleClose = (options: CloseOptions) => {
    const result = closeSprint(state, options, today)
    setState(result.state)
    setCloseOpen(false)
    toast.show({ message: result.message, icon: 'check' })
  }

  const handleStart = (options: { goal: string; weeks: 1 | 2 }) => {
    setState(startSprint(state, options, today))
    setStartOpen(false)
    toast.show({ message: `Sprint ${nextNumber} empezó hoy`, icon: 'check' })
  }

  const handleAddFromBacklog = (id: string, title: string) => {
    setState(addFromBacklog(state, id))
    toast.show({ message: `"${title}" entró al Sprint ${active?.number}`, icon: 'check' })
  }

  return (
    <>
      <motion.div {...enter(0)} className={styles.toolbar}>
        <span className={styles.toolbarText}>Sprints de dos semanas · uno activo a la vez</span>
        {active ? (
          <Button onClick={() => setCloseOpen(true)}>Cerrar Sprint {active.number}</Button>
        ) : (
          <Button onClick={() => setStartOpen(true)}>Empezar Sprint {nextNumber}</Button>
        )}
      </motion.div>

      <div className={styles.grid}>
        <div className={styles.main}>
          {active && days ? (
            <>
              <motion.div {...enter(1)}>
                <Card tone="inverted" as="section" className={styles.active} aria-labelledby="sprint-active">
                  <span className={styles.bolt} aria-hidden="true">
                    <Doodle kind="bolt" size={40} stroke="inverted" />
                  </span>
                  <div className={styles.activeHead}>
                    <div className={styles.activeTitles}>
                      <span className={styles.kicker}>Sprint activo</span>
                      <h2 id="sprint-active" className={styles.sprintName}>
                        Sprint {active.number}
                      </h2>
                      <span className={styles.range}>{formatRange(active.startsOn, active.endsOn)}</span>
                    </div>
                    <span className={styles.leftChip}>{daysLeftText(days.left, days.index)}</span>
                  </div>

                  <div className={styles.goal}>
                    <span className={styles.kicker}>Meta</span>
                    <p className={styles.goalText}>{active.goal || <span className={styles.muted}>Sin meta todavía</span>}</p>
                  </div>

                  <div className={styles.progress}>
                    <div className={styles.progressRow}>
                      <span>
                        {doneCount} de {tasks.length} tareas hechas
                      </span>
                      <span className={styles.muted}>{Math.round(fraction * 100)}%</span>
                    </div>
                    <div className={styles.track} role="progressbar" aria-label="Tareas hechas del sprint" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
                      <motion.div className={styles.fill} initial={{ scaleX: 0 }} animate={{ scaleX: fraction }} transition={SPRING.soft} />
                    </div>
                    <div className={styles.days} role="img" aria-label={`Día ${Math.min(Math.max(days.index + 1, 1), days.total)} de ${days.total}`}>
                      {Array.from({ length: 14 }, (_, position) => (
                        <span key={position} className={[styles.day, dayClass(position, days.total, days.index)].join(' ')} />
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div {...enter(2)}>
                <Card as="section" className={styles.card} aria-labelledby="sprint-board">
                  <CardHeader
                    id="sprint-board"
                    title="Tablero del sprint"
                    subtitle="Mueve cada tarea con las flechas."
                    iconTone="dark"
                    icon={
                      <LineIcon
                        d={[
                          'M4.5 4h2A1.5 1.5 0 0 1 8 5.5v13A1.5 1.5 0 0 1 6.5 20h-2A1.5 1.5 0 0 1 3 18.5v-13A1.5 1.5 0 0 1 4.5 4z',
                          'M11.5 4h2A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-2A1.5 1.5 0 0 1 10 12.5v-7A1.5 1.5 0 0 1 11.5 4z',
                          'M18.5 4h1A1.5 1.5 0 0 1 21 5.5v10a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-10A1.5 1.5 0 0 1 18.5 4z',
                        ]}
                      />
                    }
                  />
                  <LayoutGroup id="sprint-board">
                    <div className={styles.columns}>
                      {SPRINT_COLUMNS.map((column, columnIndex) => {
                        const items = tasks.filter((task) => task.status === column.status)
                        return (
                          <div key={column.status} role="group" aria-label={`${column.label}, ${items.length} ${items.length === 1 ? 'tarea' : 'tareas'}`} className={styles.column}>
                            <div className={styles.columnHead}>
                              <span className={styles.columnName}>{column.label}</span>
                              <span className={[styles.columnCount, column.status === 'done' ? styles.columnCountDone : null].filter(Boolean).join(' ')}>{items.length}</span>
                            </div>
                            <AnimatePresence mode="popLayout">
                              {items.map((task) => (
                                <motion.div
                                  key={task.id}
                                  layout
                                  layoutId={`sprint-task-${task.id}`}
                                  className={styles.taskCard}
                                  initial={{ opacity: 0, scale: 0.96 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.96, transition: { duration: DURATION.fast } }}
                                  transition={SPRING.panel}
                                >
                                  <span className={[styles.taskTitle, task.status === 'done' ? styles.taskTitleDone : null].filter(Boolean).join(' ')}>{task.title}</span>
                                  <div className={styles.taskFoot}>
                                    <span className={styles.taskMeta}>{taskMeta(task, today, weekEnd)}</span>
                                    <span className={styles.moves}>
                                      {columnIndex > 0 ? (
                                        <button
                                          type="button"
                                          className={styles.move}
                                          aria-label={`Mover "${task.title}" a ${SPRINT_COLUMNS[columnIndex - 1].label}`}
                                          onClick={() => setState((current) => ({ ...current, tasks: moveTask(current.tasks, task.id, -1) }))}
                                        >
                                          <LineIcon d="M15 6l-6 6 6 6" size={16} strokeWidth={2} />
                                        </button>
                                      ) : null}
                                      {columnIndex < SPRINT_COLUMNS.length - 1 ? (
                                        <button
                                          type="button"
                                          className={styles.move}
                                          aria-label={`Mover "${task.title}" a ${SPRINT_COLUMNS[columnIndex + 1].label}`}
                                          onClick={() => setState((current) => ({ ...current, tasks: moveTask(current.tasks, task.id, 1) }))}
                                        >
                                          <LineIcon d="M9 6l6 6-6 6" size={16} strokeWidth={2} />
                                        </button>
                                      ) : null}
                                    </span>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                            {items.length === 0 ? <p className={styles.columnEmpty}>{column.empty}</p> : null}
                          </div>
                        )
                      })}
                    </div>
                  </LayoutGroup>
                </Card>
              </motion.div>
            </>
          ) : (
            <motion.div {...enter(1)}>
              <EmptyState
                id="sprint-empty"
                eyebrow="Sprints"
                title="Este proyecto no tiene un sprint activo"
                description="Empieza uno para planear unas semanas de trabajo, con su meta, su tablero y las tareas que entran del backlog."
                doodle="spiral"
                actions={<Button onClick={() => setStartOpen(true)}>Empezar Sprint {nextNumber}</Button>}
              />
            </motion.div>
          )}
        </div>

        <aside className={styles.side}>
          <motion.div {...enter(2)}>
            <Card as="section" className={styles.card} aria-labelledby="sprint-backlog">
              <CardHeader
                id="sprint-backlog"
                title="Backlog"
                subtitle="Lo que todavía no entra a ningún sprint."
                iconTone="accent"
                icon={<LineIcon d={['M8 6h12M8 12h12M8 18h12', 'M4 6h.01M4 12h.01M4 18h.01']} />}
                action={<span className={styles.count}>{backlog.length === 1 ? '1 tarea' : `${backlog.length} tareas`}</span>}
              />
              <ul className={styles.rows}>
                <AnimatePresence initial={false}>
                  {backlog.map((item) => (
                    <motion.li
                      key={item.id}
                      layout
                      className={styles.row}
                      exit={{ opacity: 0, x: 16, transition: { duration: DURATION.base } }}
                      transition={SPRING.panel}
                    >
                      <span className={styles.rowTitle}>{item.title}</span>
                      {active ? (
                        <button type="button" className={styles.addButton} aria-label={`Agregar "${item.title}" al sprint`} onClick={() => handleAddFromBacklog(item.id, item.title)}>
                          <LineIcon d="M12 5v14M5 12h14" size={14} strokeWidth={2} />
                          Agregar
                        </button>
                      ) : null}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              {backlog.length === 0 ? <p className={styles.empty}>Backlog vacío. Todo lo pendiente ya está en un sprint.</p> : null}
              {!active && backlog.length > 0 ? <p className={styles.empty}>Empieza un sprint para agregar estas tareas.</p> : null}
            </Card>
          </motion.div>

          <motion.div {...enter(3)}>
            <Card as="section" className={styles.card} aria-labelledby="sprint-closed">
              <CardHeader
                id="sprint-closed"
                title="Sprints cerrados"
                iconTone="warm"
                icon={<LineIcon d={['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5', 'M12 7v5l3 2']} />}
              />
              {closed.length === 0 ? (
                <p className={styles.empty}>Todavía no has cerrado ningún sprint.</p>
              ) : (
                <ul className={styles.history}>
                  <AnimatePresence initial={false}>
                    {closed.map((sprint) => (
                      <motion.li
                        key={sprint.id}
                        layout
                        className={styles.closedItem}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={SPRING.panel}
                      >
                        <div className={styles.closedHead}>
                          <span className={styles.closedName}>Sprint {sprint.number}</span>
                          <span className={styles.score}>
                            {sprint.doneCount} de {sprint.totalCount} hechas
                          </span>
                        </div>
                        <span className={styles.hint}>{formatRange(sprint.startsOn, sprint.endsOn)}</span>
                        {sprint.notes ? <p className={styles.retro}>{sprint.notes}</p> : null}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </Card>
          </motion.div>
        </aside>
      </div>

      {active ? (
        <CloseSprintDrawer
          open={closeOpen}
          sprintNumber={active.number}
          doneCount={doneCount}
          openCount={openCount}
          onClose={() => setCloseOpen(false)}
          onConfirm={handleClose}
        />
      ) : null}
      <StartSprintDrawer open={startOpen} sprintNumber={nextNumber} onClose={() => setStartOpen(false)} onConfirm={handleStart} />
    </>
  )
}
