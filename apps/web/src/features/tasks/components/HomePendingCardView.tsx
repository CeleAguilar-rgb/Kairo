'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { completeTask } from '@/features/tasks/actions'
import type { Task } from '@/features/tasks/api'
import styles from './HomePendingCardView.module.css'

type HomePendingCardViewProps = {
  tasks: Task[]
  pendingCount: number
  doneCount: number
  totalCount: number
}

export function HomePendingCardView({ tasks, pendingCount, doneCount, totalCount }: HomePendingCardViewProps) {
  const [, startTransition] = useTransition()

  function handleComplete(taskId: string) {
    startTransition(async () => {
      await completeTask(taskId)
    })
  }

  return (
    <Card tone="inverted" className={styles.card}>
      <div className={styles.heading}>
        <div className={styles.headingText}>
          <h2 className={styles.title}>Pendientes de hoy</h2>
          <span className={styles.hint}>Toca una para marcarla como hecha</span>
        </div>
        {totalCount > 0 ? (
          <span className={styles.count}>
            {doneCount}/{totalCount}
          </span>
        ) : null}
      </div>

      {tasks.length > 0 ? (
        <ul className={styles.list}>
          {tasks.map((task) => (
            <li key={task.id} className={styles.row}>
              <Checkbox
                checked={false}
                onToggle={() => handleComplete(task.id)}
                label={`Marcar "${task.title}" como hecha`}
              />
              <span className={styles.rowTitle}>{task.title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          {pendingCount === 0 ? 'Nada pendiente. Buen trabajo.' : 'Sin tareas que mostrar.'}
        </p>
      )}

      <Link href="/tareas" className={styles.link}>
        Ver todas en Tareas
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </Card>
  )
}
