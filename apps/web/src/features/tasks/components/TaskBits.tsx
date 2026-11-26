import { LineIcon } from '@/components/ui/Card'
import { projectTone } from '@/features/projects'

import { PRIORITY_LABEL, type TaskPriority } from '../types'

import styles from './TaskBits.module.css'

// "EXANI-III | Preparación Maestría UANL" → "EXANI-III": en un chip pequeño el nombre largo siempre se
// cortaba a medias ("EXANI-III | Prepara…"). Si el nombre trae un separador, el chip muestra solo la parte
// de antes; el nombre completo queda en el title (y en el detalle de la tarea).
function shortProjectName(name: string): string {
  const [head] = name.split(/\s+[|—–]\s+/)
  return head.trim() || name
}

// Chip "● Dashboard personal" de las filas y tarjetas de Tareas.
export function ProjectChip({ project }: { project: { id: string; name: string } | null }) {
  return (
    <span className={styles.chip} title={project?.name ?? 'Sin proyecto'}>
      <span
        className={[styles.dot, project ? null : styles.dotNone].filter(Boolean).join(' ')}
        style={project ? { background: projectTone(project.id) } : undefined}
        aria-hidden="true"
      />
      <span className={styles.chipText}>{project ? shortProjectName(project.name) : 'Sin proyecto'}</span>
    </span>
  )
}

// "2/5" de subtareas. Una tarea sin subtareas no muestra nada: "0/0" solo era ruido.
export function SubtaskCount({ done, total, className }: { done: number; total: number; className?: string }) {
  if (total === 0) return null
  return (
    <span className={className} aria-label={`${done} de ${total} subtareas`}>
      {done}/{total}
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
  if (tone === 'overdue') {
    // Lo vencido no se marca solo con rojo (quien no distingue bien el color no lo vería): lleva un ícono
    // de alerta y "Vencida" para lectores de pantalla. La palabra visible no cabía en la columna de la fecha.
    return (
      <span className={[styles.due, styles.due_overdue].join(' ')}>
        <LineIcon d={OVERDUE_ICON} size={13} strokeWidth={2.2} />
        <span className={styles.srOnly}>Vencida: </span>
        {label}
      </span>
    )
  }
  return <span className={[styles.due, styles[`due_${tone}`]].join(' ')}>{label}</span>
}

// Círculo con signo de admiración
const OVERDUE_ICON = ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 8v5', 'M12 16.5v.01']
