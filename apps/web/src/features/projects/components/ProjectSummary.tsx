'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'

import { Card, CardHeader, LineIcon } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Doodle } from '@/components/ui/Doodle'
import { CountUp, ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { Segmented } from '@/components/ui/Segmented'
import { dayOfMonth, formatDayMonth, formatDuration, formatDueLabel, formatMonthShort, type IsoDate } from '@/lib/dates'
import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'
import { useEntering } from '@/lib/use-entering'

import type { ProjectDetail, ProjectTask } from '../types'

import styles from './ProjectSummary.module.css'

type ProjectSummaryProps = {
  project: ProjectDetail
  today: IsoDate
  weekEnd: IsoDate
}

type TaskView = 'pending' | 'done'

const STATUS_TEXT: Record<ProjectTask['status'], string> = {
  todo: 'Por hacer',
  in_progress: 'En curso',
  review: 'Revisión',
  done: 'Hecho',
}

// Cada tarjeta entra un poco después de la anterior, de arriba hacia abajo.
const enter = (position: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT, delay: 0.12 + position * 0.07 } },
})

// "7 de octubre de 2026"
const fullDate = (date: IsoDate) => `${formatDayMonth(date)} de ${date.slice(0, 4)}`

// Solo se abren enlaces http(s): un "javascript:" guardado como enlace no debe poder ejecutarse.
function isSafeUrl(url: string) {
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

// El Resumen del proyecto (Proyecto.dc.html): de qué trata, objetivos, tareas, avance, detalles,
// enlaces y notas. Hoy todo vive en memoria: marcar, agregar y escribir se pierde al recargar
// hasta que existan los endpoints de proyectos.
export function ProjectSummary({ project, today, weekEnd }: ProjectSummaryProps) {
  const entering = useEntering()
  const [objectives, setObjectives] = useState(project.objectives)
  const [tasks, setTasks] = useState(project.tasks)
  const [view, setView] = useState<TaskView>('pending')
  const [newTitle, setNewTitle] = useState('')
  const [notes, setNotes] = useState(project.notes ?? '')
  const [goalOn, setGoalOn] = useState<IsoDate | null>(project.goalOn)
  const [pickingGoal, setPickingGoal] = useState(false)
  // El estado con el que llegó cada tarea: al desmarcarla vuelve a donde estaba (por ejemplo "En curso").
  const [originalStatus] = useState(() => new Map(project.tasks.map((task) => [task.id, task.status])))

  const doneCount = tasks.filter((task) => task.status === 'done').length
  const total = tasks.length
  const fraction = total === 0 ? 0 : doneCount / total
  const percent = Math.round(fraction * 100)
  const pending = tasks.filter((task) => task.status !== 'done')
  const finished = tasks.filter((task) => task.status === 'done')
  const shown = view === 'pending' ? pending : finished

  const objectivesDone = objectives.filter((objective) => objective.done).length

  const toggleObjective = (id: string) =>
    setObjectives((list) => list.map((objective) => (objective.id === id ? { ...objective, done: !objective.done } : objective)))

  const toggleTask = (id: string) =>
    setTasks((list) =>
      list.map((task) => {
        if (task.id !== id) return task
        if (task.status !== 'done') return { ...task, status: 'done' as const }
        const before = originalStatus.get(id)
        return { ...task, status: before && before !== 'done' ? before : ('todo' as const) }
      }),
    )

  const handleAddTask = (event: FormEvent) => {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    setTasks((list) => [
      { id: `local-${crypto.randomUUID()}`, title, status: 'todo', subtasksDone: 0, subtasksTotal: 0, dueOn: null },
      ...list,
    ])
    setView('pending')
    setNewTitle('')
  }

  const safeLinks = project.links.filter((link) => isSafeUrl(link.url))

  return (
    <div className={styles.grid}>
      <div className={styles.main}>
        <motion.div {...enter(0)}>
          <Card as="section" className={styles.card} aria-labelledby="project-about">
            <CardHeader id="project-about" title="De qué trata" iconTone="warm" icon={<LineIcon d="M4 5h16M4 10h16M4 15h10M4 20h7" />} />
            {project.description ? (
              <p className={styles.about}>{project.description}</p>
            ) : (
              <p className={styles.empty}>Todavía no escribes de qué trata este proyecto.</p>
            )}
          </Card>
        </motion.div>

        <motion.div {...enter(1)}>
          <Card as="section" className={styles.card} aria-labelledby="project-objectives">
            <CardHeader
              id="project-objectives"
              title="Objetivos"
              iconTone="accent"
              icon={<LineIcon d={['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', 'M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z']} />}
              action={
                <span className={styles.count}>
                  {objectivesDone} de {objectives.length}
                </span>
              }
            />
            {objectives.length === 0 ? (
              <p className={styles.empty}>Todavía no hay objetivos. Agrégalos al editar el proyecto.</p>
            ) : (
              <>
                <ProgressBar value={objectives.length === 0 ? 0 : objectivesDone / objectives.length} label="Objetivos cumplidos" tone="soft" />
                <ul className={styles.rows}>
                  {objectives.map((objective) => (
                    <li key={objective.id} className={styles.row}>
                      <Checkbox
                        checked={objective.done}
                        onToggle={() => toggleObjective(objective.id)}
                        label={(objective.done ? 'Desmarcar: ' : 'Marcar como cumplido: ') + objective.text}
                      />
                      <span className={[styles.rowText, objective.done ? styles.done : null].filter(Boolean).join(' ')}>{objective.text}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </motion.div>

        <motion.div {...enter(2)}>
          <Card as="section" className={styles.card} aria-labelledby="project-tasks">
            <CardHeader
              id="project-tasks"
              title="Tareas del proyecto"
              iconTone="dark"
              icon={<LineIcon d={['M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M8.5 12l2.5 2.5 4.5-5']} />}
              action={
                <Segmented
                  label="Mostrar"
                  tone="raised"
                  value={view}
                  onChange={setView}
                  options={[
                    {
                      value: 'pending',
                      label: (
                        <>
                          Pendientes<span className={styles.segCount}>{pending.length}</span>
                        </>
                      ),
                    },
                    {
                      value: 'done',
                      label: (
                        <>
                          Hechas<span className={styles.segCount}>{finished.length}</span>
                        </>
                      ),
                    },
                  ]}
                />
              }
            />

            <div className={styles.rows}>
              <AnimatePresence mode="popLayout">
                {shown.map((task, index) => {
                  const isDone = task.status === 'done'
                  const dueClass = isDone || !task.dueOn ? null : task.dueOn === today ? styles.dueToday : task.dueOn < today ? styles.dueOverdue : null
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      className={styles.row}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.35, ease: EASE_OUT, delay: entering ? 0.3 + Math.min(index, 8) * 0.03 : 0 },
                      }}
                      exit={{ opacity: 0, x: -16, transition: { duration: DURATION.base, ease: EASE_OUT } }}
                      transition={SPRING.panel}
                    >
                      <Checkbox
                        checked={isDone}
                        onToggle={() => toggleTask(task.id)}
                        label={(isDone ? 'Desmarcar: ' : 'Marcar como hecha: ') + task.title}
                      />
                      <div className={styles.taskText}>
                        <span className={[styles.rowText, isDone ? styles.done : null].filter(Boolean).join(' ')}>{task.title}</span>
                        <span className={styles.taskMeta}>
                          {STATUS_TEXT[task.status]} ·{' '}
                          {task.subtasksTotal === 0 ? 'sin subtareas' : `${task.subtasksDone}/${task.subtasksTotal} subtareas`}
                        </span>
                      </div>
                      <span className={[styles.due, dueClass].filter(Boolean).join(' ')}>{formatDueLabel(task.dueOn, today, weekEnd)}</span>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {shown.length === 0 ? (
              <p className={styles.empty}>
                {view === 'pending' ? 'No quedan tareas pendientes en este proyecto.' : 'Todavía no hay tareas hechas en este proyecto.'}
              </p>
            ) : null}

            <form className={styles.addRow} onSubmit={handleAddTask}>
              <label htmlFor="project-add-task" className={styles.srOnly}>
                Agregar tarea al proyecto
              </label>
              <input
                id="project-add-task"
                type="text"
                className={styles.addInput}
                placeholder="Agregar tarea a este proyecto…"
                value={newTitle}
                maxLength={200}
                onChange={(event) => setNewTitle(event.target.value)}
              />
            </form>
          </Card>
        </motion.div>
      </div>

      <aside className={styles.side}>
        <motion.div {...enter(1)}>
          <Card tone="inverted" as="section" className={[styles.card, styles.avance].join(' ')} aria-labelledby="project-progress">
            <span className={styles.heart} aria-hidden="true">
              <Doodle kind="heart" size={40} stroke="inverted" />
            </span>
            <h2 id="project-progress" className={styles.plainTitle}>
              Avance
            </h2>
            <div className={styles.avanceBody}>
              <ProgressRing value={fraction} size={112} stroke={10}>
                <span className={styles.ringPercent}>
                  <CountUp value={percent} />%
                </span>
              </ProgressRing>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>
                    {doneCount} de {total}
                  </span>
                  <span className={styles.statLabel}>tareas hechas</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{formatDuration(project.focusMinutesWeek)}</span>
                  <span className={styles.statLabel}>con pomodoro esta semana</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div {...enter(2)}>
          <Card as="section" className={styles.card} aria-labelledby="project-details">
            <h2 id="project-details" className={styles.plainTitle}>
              Detalles
            </h2>
            <div className={styles.details}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Inicio</span>
                <span>{project.startedOn ? fullDate(project.startedOn) : 'Sin fecha'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Fecha meta</span>
                {pickingGoal ? (
                  <input
                    type="date"
                    className={styles.dateInput}
                    aria-label="Fecha meta"
                    value={goalOn ?? ''}
                    min={project.startedOn ?? undefined}
                    ref={(element) => element?.focus()}
                    onChange={(event) => {
                      setGoalOn(event.target.value || null)
                      setPickingGoal(false)
                    }}
                    onBlur={() => setPickingGoal(false)}
                  />
                ) : (
                  <button type="button" className={styles.linkButton} onClick={() => setPickingGoal(true)}>
                    {goalOn ? fullDate(goalOn) : 'Elegir fecha'}
                  </button>
                )}
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Sprint actual</span>
                {project.currentSprint ? (
                  <Link href={`/proyectos/${project.id}/sprints`} className={styles.sprintLink}>
                    Sprint {project.currentSprint.number}, hasta el {dayOfMonth(project.currentSprint.endsOn)}{' '}
                    {formatMonthShort(project.currentSprint.endsOn)}
                  </Link>
                ) : (
                  <span className={styles.detailLabel}>Sin sprint activo</span>
                )}
              </div>
            </div>

            <h3 className={styles.subtitle}>Enlaces</h3>
            {safeLinks.length === 0 ? (
              <p className={styles.empty}>Todavía no hay enlaces.</p>
            ) : (
              <ul className={styles.links}>
                {safeLinks.map((link, index) => (
                  <li key={link.id}>
                    <a className={styles.link} href={link.url} target="_blank" rel="noopener noreferrer">
                      <span className={[styles.linkIcon, styles[`linkIcon${index % 3}`]].join(' ')} aria-hidden="true">
                        <LineIcon d={['M6 3h9l4 4v14H6z', 'M15 3v4h4']} size={16} />
                      </span>
                      <span className={styles.linkText}>{link.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>

        <motion.div {...enter(3)}>
          <Card tone="accent" as="section" className={styles.card} aria-labelledby="project-notes">
            <label id="project-notes" htmlFor="project-notes-text" className={styles.plainTitle}>
              Notas
            </label>
            <textarea
              id="project-notes-text"
              className={styles.notes}
              rows={5}
              value={notes}
              maxLength={5000}
              placeholder="Ideas, pendientes sueltos, lo que no quieras olvidar…"
              onChange={(event) => setNotes(event.target.value)}
            />
          </Card>
        </motion.div>
      </aside>
    </div>
  )
}
