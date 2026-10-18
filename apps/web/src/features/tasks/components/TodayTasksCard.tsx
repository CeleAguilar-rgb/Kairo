'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { useState, useTransition } from 'react'

import { Card, CardHeader, LineIcon } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Doodle } from '@/components/ui/Doodle'
import { ProgressRing } from '@/components/ui/Progress'
import { useToast } from '@/components/ui/Toast'
import { formatRelativeDay, type IsoDate } from '@/lib/dates'
import { listItem, SPRING, staggerList } from '@/lib/motion'

import { updateTaskStatus } from '../actions'
import type { Task, TaskStatus } from '../types'

import { TaskDetailDrawer } from './TaskDetailDrawer'
import styles from './TodayTasksCard.module.css'

type TodayTasksCardProps = {
  tasks: Task[]
  today: IsoDate
  onDoneCountChange?: (pending: number) => void
}

// "Pendientes de hoy": la tarjeta destacada de Inicio (Main.dc.html).
export function TodayTasksCard({ tasks: initial, today, onDoneCountChange }: TodayTasksCardProps) {
  const [tasks, setTasks] = useState(initial)
  const [openId, setOpenId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const toast = useToast()

  const doneCount = tasks.filter((t) => t.status === 'done').length
  const openTask = tasks.find((t) => t.id === openId) ?? null

  // Optimista (como en TasksView): la fila cambia al instante, el PATCH va detrás.
  function update(next: Task[]) {
    setTasks(next)
    onDoneCountChange?.(next.filter((t) => t.status !== 'done').length)
  }

  function sync(taskId: string, status: TaskStatus) {
    startTransition(async () => {
      const result = await updateTaskStatus(taskId, status)
      if ('error' in result) toast.show({ message: result.error, icon: 'info' })
    })
  }

  function toggleDone(task: Task) {
    const status: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    const willBeDone = status === 'done'
    const next = tasks.map((t) =>
      t.id === task.id
        ? { ...t, status, doneAt: willBeDone ? new Date().toISOString() : null }
        : t,
    )
    update(next)
    sync(task.id, status)
    if (willBeDone && next.every((t) => t.status === 'done')) {
      toast.show({ message: '¡Listo todo lo de hoy! Buen trabajo.', icon: 'check' })
    }
  }

  function changeStatus(task: Task, status: TaskStatus) {
    update(tasks.map((t) => (t.id === task.id ? { ...t, status, doneAt: status === 'done' ? new Date().toISOString() : null } : t)))
    sync(task.id, status)
  }

  function toggleSubtask(task: Task, subtaskId: string) {
    const subtask = task.subtasks.find((s) => s.id === subtaskId)
    if (!subtask) return
    const done = !subtask.done
    update(
      tasks.map((t) =>
        t.id === task.id ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, done } : s)) } : t,
      ),
    )
    sync(subtaskId, done ? 'done' : 'todo')
  }

  const allDone = tasks.length > 0 && doneCount === tasks.length

  return (
    <Card as="section" tone="inverted" className={styles.card} aria-labelledby="home-tasks">
      <motion.span
        className={styles.star}
        initial={{ scale: 0, rotate: -40 }}
        animate={allDone ? { scale: [1, 1.35, 1], rotate: [-12, 18, -12] } : { scale: 1, rotate: -12 }}
        transition={allDone ? { duration: 0.6 } : { ...SPRING.pop, delay: 0.3 }}
        whileHover={{ rotate: 12, scale: 1.1 }}
      >
        <Doodle kind="star" size={44} stroke="text" strokeWidth={2} />
      </motion.span>

      <CardHeader
        id="home-tasks"
        title="Pendientes de hoy"
        subtitle="Toca uno para ver el detalle"
        iconTone="inverted"
        icon={<LineIcon d={['M8 4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z', 'M8.5 12l2.5 2.5 4.5-5']} />}
        action={
          <>
            <motion.span whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }} transition={SPRING.pop}>
              <Link href="/tareas?nueva=1" className={styles.add} aria-label="Nuevo pendiente">
                <LineIcon d="M12 5v14M5 12h14" strokeWidth={2} />
              </Link>
            </motion.span>
            <ProgressRing value={tasks.length ? doneCount / tasks.length : 0}>
              <span className={styles.ringText}>
                {doneCount}/{tasks.length}
              </span>
            </ProgressRing>
          </>
        }
      />

      {tasks.length === 0 ? (
        <div className={styles.empty}>
          <Doodle kind="cloud" size={40} />
          <span>Nada para hoy. Disfruta, o agrega algo con +.</span>
        </div>
      ) : (
        <motion.ul className={styles.list} variants={staggerList(0.05, 0.15)} initial="hidden" animate="show">
          {tasks.map((task) => {
            const done = task.status === 'done'
            return (
              <motion.li
                key={task.id}
                variants={listItem}
                className={[styles.row, openId === task.id ? styles.rowOpen : null].filter(Boolean).join(' ')}
              >
                <Checkbox
                  tone="inverted"
                  checked={done}
                  onToggle={() => toggleDone(task)}
                  label={(done ? 'Desmarcar: ' : 'Marcar como hecho: ') + task.title}
                />
                <button type="button" className={styles.rowButton} onClick={() => setOpenId(task.id)} aria-label={`Ver detalle: ${task.title}`}>
                  <span className={[styles.title, done ? styles.titleDone : null].filter(Boolean).join(' ')}>{task.title}</span>
                  <span className={styles.meta}>
                    {task.project?.name ?? 'Personal'} · {task.dueOn ? formatRelativeDay(task.dueOn, today) : 'Sin fecha'}
                  </span>
                </button>
                <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </motion.li>
            )
          })}
        </motion.ul>
      )}

      <Link href="/tareas" className={styles.more}>
        Ver todas en Tareas
        <LineIcon d="M9 6l6 6-6 6" size={14} strokeWidth={2} />
      </Link>

      <TaskDetailDrawer task={openTask} today={today} onClose={() => setOpenId(null)} onToggleDone={toggleDone} onToggleSubtask={toggleSubtask} onChangeStatus={changeStatus} />
    </Card>
  )
}
