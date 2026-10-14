import { projectTone } from '@/features/projects'

import { PRIORITY_LABEL, type TaskPriority } from '../types'

import styles from './TaskBits.module.css'

// Chip "● Dashboard personal" de las filas y tarjetas de Tareas.
export function ProjectChip({ project }: { project: { id: string; name: string } | null }) {
  return (
    <span className={styles.chip} title={project?.name ?? 'Sin proyecto'}>
      <span
        className={[styles.dot, project ? null : styles.dotNone].filter(Boolean).join(' ')}
        style={project ? { background: projectTone(project.id) } : undefined}
        aria-hidden="true"
      />
      <span className={styles.chipText}>{project?.name ?? 'Sin proyecto'}</span>
    </span>
  )
}

export function ProjectDot({ projectId }: { projectId: string | null }) {
  return (
    <span
      className={[styles.dot, projectId ? null : styles.dotNone].filter(Boolean).join(' ')}
      style={projectId ? { background: projectTone(projectId) } : undefined}
      aria-hidden="true"
    />
  )
}

export function PriorityBadge({ priority, long = false }: { priority: TaskPriority; long?: boolean }) {
  return (
    <span className={[styles.priority, styles[priority]].join(' ')}>
      {long ? `Prioridad ${PRIORITY_LABEL[priority].toLowerCase()}` : PRIORITY_LABEL[priority]}
    </span>
  )
}

export function DueText({ label, tone }: { label: string; tone: 'today' | 'overdue' | 'normal' }) {
  return <span className={[styles.due, styles[`due_${tone}`]].join(' ')}>{label}</span>
}
