import type { IsoDate } from '@/lib/dates'

// Tabla projects de docs/guides/data-model.md (camelCase). `progress` no es
// columna: la API lo calcula con las tareas del proyecto (hechas / totales).
export type ProjectKind = 'work' | 'personal' | 'school'
export type ProjectStatus = 'active' | 'paused' | 'done'

export type Project = {
  id: string
  name: string
  kind: ProjectKind
  status: ProjectStatus
  description: string | null
  coverPath: string | null
  startedOn: IsoDate | null
  goalOn: IsoDate | null
  progress: number
  taskCount: number
}

export const PROJECT_KIND_LABEL: Record<ProjectKind, string> = {
  work: 'Trabajo',
  personal: 'Personal',
  school: 'Escuela',
}
