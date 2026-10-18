'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Doodle } from '@/components/ui/Doodle'
import type { IsoDate } from '@/lib/dates'
import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'
import { useEntering } from '@/lib/use-entering'

import { dueLabel, dueTone, type TaskGroup } from '../grouping'
import type { Task } from '../types'

import { DueText, PriorityBadge, ProjectChip } from './TaskBits'
import styles from './TaskList.module.css'

type TaskListProps = {
  groups: TaskGroup[]
  today: IsoDate
  weekEnd: IsoDate
  openId: string | null
  recentId: string | null
  quickProjectName: string
  onToggleDone: (task: Task) => void
  onOpen: (task: Task) => void
  onQuickAdd: (title: string) => void
  onDelete: (task: Task) => void
}

// Vista Lista de Tareas.dc.html: captura rápida arriba y grupos por fecha.
export function TaskList({ groups, today, weekEnd, openId, recentId, quickProjectName, onToggleDone, onOpen, onQuickAdd, onDelete }: TaskListProps) {
  // Quién está en qué grupo y en qué orden: Motion solo re-mide las filas si esto cambia.
  const listKey = groups.map((group) => `${group.key}:${group.items.map((task) => task.id).join(',')}`).join('|')

  // Una tarea recién creada puede caer fuera de la pantalla (por ejemplo en "Sin fecha"):
  // se desplaza hasta ella para que se vea dónde quedó.
  // Al entrar, los grupos y sus filas llegan escalonados; después (una tarea nueva, un filtro)
  // aparecen sin ese retraso.
  const entering = useEntering()

  useEffect(() => {
    if (!recentId) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(`task-row-${recentId}`)?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  }, [recentId])

  return (
    <section className={styles.list} aria-label="Lista de tareas">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.12 }}
      >
        <QuickAdd projectName={quickProjectName} onAdd={onQuickAdd} />
      </motion.div>

      <AnimatePresence mode="popLayout">
        {groups.map((group, groupIndex) => (
          <motion.div
            key={group.key}
            layout
            layoutDependency={listKey}
            className={styles.group}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.35, delay: entering ? 0.18 + groupIndex * 0.1 : 0 } }}
            exit={{ opacity: 0, transition: { duration: DURATION.fast } }}
            transition={SPRING.panel}
          >
            <motion.div layout="position" layoutDependency={listKey} className={styles.groupHead}>
              <h2 className={styles.groupName}>{group.name}</h2>
              <span className={[styles.count, groupIndex === 0 && group.key !== 'done' ? styles.countDark : null].filter(Boolean).join(' ')}>
                {group.items.length}
              </span>
            </motion.div>

            <AnimatePresence mode="popLayout">
              {group.items.map((task, index) => {
                const done = task.status === 'done'
                return (
                  <motion.div
                    key={task.id}
                    // layoutId: si la tarea cambia de grupo (por ejemplo, a "Hechas"),
                    // Motion la anima de su lugar viejo al nuevo en vez de cortar.
                    id={`task-row-${task.id}`}
                    layoutId={`task-row-${task.id}`}
                    layout
                    layoutDependency={listKey}
                    className={[styles.row, openId === task.id ? styles.rowOpen : null, recentId === task.id ? styles.rowRecent : null]
                      .filter(Boolean)
                      .join(' ')}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT, delay: (entering ? 0.24 + groupIndex * 0.1 : 0) + Math.min(index, 8) * 0.03 } }}
                    exit={{ opacity: 0, x: -16, transition: { duration: DURATION.base, ease: EASE_OUT } }}
                    transition={SPRING.panel}
                  >
                    <Checkbox checked={done} onToggle={() => onToggleDone(task)} label={(done ? 'Desmarcar: ' : 'Marcar como hecha: ') + task.title} />
                    <button type="button" className={styles.rowButton} onClick={() => onOpen(task)} aria-label={`Ver detalle: ${task.title}`}>
                      <span className={[styles.title, done ? styles.titleDone : null].filter(Boolean).join(' ')}>{task.title}</span>
                      <span className={styles.hideSm}>
                        <ProjectChip project={task.project} />
                      </span>
                      <span className={[styles.subs, styles.hideSm].join(' ')}>
                        {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
                      </span>
                      <PriorityBadge priority={task.priority} />
                      <DueText label={dueLabel(task.dueOn, today, weekEnd)} tone={dueTone(task, today)} />
                    </button>
                    <Button
                      variant="plain"
                      iconOnly
                      className={styles.delete}
                      aria-label={`Borrar "${task.title}"`}
                      onClick={() => onDelete(task)}
                    >
                      <LineIcon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" size={16} />
                    </Button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {groups.length === 0 ? (
          <motion.div
            className={styles.empty}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            <Doodle kind="heart" size={40} strokeWidth={2} />
            <span>Nada pendiente aquí. Agrega una tarea arriba o elige otro proyecto.</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}

// El texto que se está escribiendo vive aquí y no en TaskList: así cada letra
// re-renderiza solo este campo, no las ~20 filas de la lista (cada una con sus
// componentes animados).
function QuickAdd({ projectName, onAdd }: { projectName: string; onAdd: (title: string) => void }) {
  const [value, setValue] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const title = value.trim()
    if (!title) return
    onAdd(title)
    setValue('')
  }

  return (
    <form className={styles.quick} onSubmit={handleSubmit}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <label htmlFor="quick-task" className={styles.srOnly}>
        Agregar tarea
      </label>
      <input
        id="quick-task"
        className={styles.quickInput}
        type="text"
        placeholder="Agregar tarea… escribe y presiona Enter"
        value={value}
        maxLength={200}
        onChange={(event) => setValue(event.target.value)}
      />
      <span className={styles.quickProject}>en {projectName}</span>
    </form>
  )
}
