'use client'

import { DEFAULT_TASK_PRIORITY } from '@kairo/shared'
import { useState, useTransition, type FormEvent } from 'react'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { completeTask, createTask } from '@/features/tasks/actions'
import type { Task } from '@/features/tasks/api'
import styles from './TareasView.module.css'

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const DUE_FORMATTER = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })

function formatDue(dueOn: string | null) {
  if (!dueOn) return null
  // dueOn es 'YYYY-MM-DD': construir Date(dueOn) a secas lo interpreta en
  // UTC y puede mostrar el día anterior según la zona local.
  const [year, month, day] = dueOn.split('-').map(Number)
  return DUE_FORMATTER.format(new Date(year, month - 1, day))
}

type TareasViewProps = { tasks: Task[] }

export function TareasView({ tasks }: TareasViewProps) {
  const [showDone, setShowDone] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string>()
  const [, startTransition] = useTransition()

  const pendingCount = tasks.filter((task) => task.status !== 'done').length
  const visibleTasks = tasks.filter((task) => showDone || task.status !== 'done')

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    setTitle('')
    startTransition(async () => {
      const result = await createTask({ title: trimmed, priority: DEFAULT_TASK_PRIORITY })
      setError(result?.error)
    })
  }

  function handleComplete(taskId: string) {
    startTransition(async () => {
      const result = await completeTask(taskId)
      setError(result?.error)
    })
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.heading}>
        <h1 className={styles.title}>Tareas</h1>
        <p className={styles.summary}>
          {pendingCount === 0
            ? 'Nada pendiente.'
            : `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}.`}
        </p>
      </div>

      <Card>
        <form className={styles.quickAdd} onSubmit={handleCreate}>
          <label htmlFor="nueva-tarea" className={styles.quickAddLabel}>
            Agregar tarea
          </label>
          <input
            id="nueva-tarea"
            className={styles.quickAddInput}
            type="text"
            placeholder="Agregar tarea… escribe y presiona Enter"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </form>

        <div className={styles.list}>
          {visibleTasks.map((task) => {
            const isDone = task.status === 'done'
            return (
              <div key={task.id} className={styles.row}>
                <Checkbox
                  checked={isDone}
                  onToggle={isDone ? () => {} : () => handleComplete(task.id)}
                  label={isDone ? `"${task.title}" ya está hecha` : `Marcar "${task.title}" como hecha`}
                />
                <span className={isDone ? styles.titleDone : styles.titleText}>{task.title}</span>
                <span className={styles.priority} data-priority={task.priority}>
                  {PRIORITY_LABEL[task.priority]}
                </span>
                {task.dueOn ? <span className={styles.due}>{formatDue(task.dueOn)}</span> : null}
              </div>
            )
          })}

          {visibleTasks.length === 0 ? (
            <p className={styles.empty}>Nada pendiente aquí. Agrega una tarea arriba.</p>
          ) : null}
        </div>

        {error ? (
          <span className={styles.error} role="alert">
            {error}
          </span>
        ) : null}
      </Card>

      <button
        type="button"
        className={styles.toggleDone}
        aria-pressed={showDone}
        onClick={() => setShowDone((value) => !value)}
      >
        {showDone ? 'Ocultar hechas' : 'Mostrar hechas'}
      </button>
    </div>
  )
}
