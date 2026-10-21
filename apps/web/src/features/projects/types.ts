import type {
  ProjectCoverKey,
  ProjectFileKind,
  ProjectKind,
  ProjectStatus,
  TaskStatus,
} from '@kairo/shared'

import type { IsoDate } from '@/lib/dates'

// Tabla projects de docs/guides/data-model.md (camelCase). `progress`, `taskCount`,
// `doneCount` y `nextDueOn` no son columnas: la API los calcula con las tareas del
// proyecto (progress = hechas / totales; nextDueOn = la fecha más cercana de las pendientes).
// Los tipos y estados salen de packages/shared (los mismos que valida projectSchema).
export type { ProjectCoverKey, ProjectFileKind, ProjectKind, ProjectStatus }

export type Project = {
  id: string
  name: string
  kind: ProjectKind
  status: ProjectStatus
  description: string | null
  coverPath: string | null
  // Null si la portada es ilustrada (el front la dibuja con `coverKeyOf`) o si no hay portada. Si la
  // persona subió su propia imagen, la API la resuelve aquí a una URL firmada (bucket privado).
  coverUrl: string | null
  startedOn: IsoDate | null
  goalOn: IsoDate | null
  progress: number
  taskCount: number
  doneCount: number
  nextDueOn: IsoDate | null
}

export const PROJECT_KIND_LABEL: Record<ProjectKind, string> = {
  work: 'Trabajo',
  personal: 'Personal',
  school: 'Escuela',
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Activo',
  paused: 'En pausa',
  done: 'Terminado',
  archived: 'Archivado',
}

// Mientras no exista la subida de imágenes, `coverPath` guarda "preset:<clave>" y el front dibuja
// esa ilustración; una ruta de Storage normal (la imagen que suba la persona) la resolverá la API
// con una URL firmada. Cómo distinguir las dos es una decisión pendiente para cuando se haga el
// backend de proyectos. Las claves válidas salen de packages/shared (PROJECT_COVER_KEYS).
const COVER_PREFIX = 'preset:'

export function coverKeyOf(coverPath: string | null): ProjectCoverKey | null {
  if (!coverPath?.startsWith(COVER_PREFIX)) return null
  return coverPath.slice(COVER_PREFIX.length) as ProjectCoverKey
}

export function coverPathOf(cover: ProjectCoverKey | null): string | null {
  return cover ? `${COVER_PREFIX}${cover}` : null
}

// ---- Lo que devuelve la API (hechos crudos, decisión #38) ----

// `GET /projects`: las columnas del proyecto. El avance, el conteo de tareas y la próxima fecha NO vienen: los
// arma api.ts con la lista de tareas (project-utils.ts), igual que Agenda y Día a día arman lo suyo.
export type ProjectRecord = Omit<Project, 'progress' | 'taskCount' | 'doneCount' | 'nextDueOn'>

export type ProjectDetailRecord = ProjectRecord & {
  notes: string | null
  objectives: ProjectObjective[]
  links: ProjectLink[]
}

// `GET /projects/:id/sprints`. El título y el estado de cada tarea del sprint activo los pone api.ts con la lista
// de Tareas: aquí solo vienen sus ids. Los sprints cerrados traen la foto de cuántas tareas tuvieron y cuántas
// estaban hechas al cerrarlos.
export type SprintRecord = { id: string; number: number; goal: string; startsOn: IsoDate; endsOn: IsoDate; notes: string | null }

export type ProjectSprintsRecord = {
  active: (SprintRecord & { taskIds: string[] }) | null
  closed: (SprintRecord & { doneCount: number; totalCount: number })[]
}

// ---- Detalle (GET /v1/projects/:id) ----

export type ProjectObjective = { id: string; text: string; done: boolean }

export type ProjectLink = { id: string; title: string; url: string }

// Lo que muestra "Tareas del proyecto": una tarea resumida (las completas viven en Tareas).
export type ProjectTask = {
  id: string
  title: string
  status: TaskStatus
  subtasksDone: number
  subtasksTotal: number
  dueOn: IsoDate | null
}

export type ProjectSprintSummary = { number: number; endsOn: IsoDate }

export type ProjectDetail = Project & {
  notes: string | null
  objectives: ProjectObjective[]
  links: ProjectLink[]
  tasks: ProjectTask[]
  // El sprint activo, si lo hay (tabla sprints, status 'active').
  currentSprint: ProjectSprintSummary | null
  // Minutos de pomodoro en la semana (viene del módulo de Enfoque).
  focusMinutesWeek: number
}

// ---- Sprints (GET /v1/projects/:id/sprints) ----

// El tablero de un sprint tiene tres columnas (Por hacer, En curso, Hecho).
export type SprintTaskStatus = Extract<TaskStatus, 'todo' | 'in_progress' | 'done'>

export type SprintTask = {
  id: string
  title: string
  status: SprintTaskStatus
  dueOn: IsoDate | null
  subtasksDone: number
  subtasksTotal: number
}

// Una tarea que todavía no entra a ningún sprint (tasks.sprint_id vacío).
export type BacklogTask = { id: string; title: string }

// Tabla sprints. `doneCount`/`totalCount` no son columnas: salen de las tareas del sprint.
export type Sprint = {
  id: string
  number: number
  goal: string
  startsOn: IsoDate
  endsOn: IsoDate
  notes: string | null
  doneCount: number
  totalCount: number
}

export type ProjectSprints = {
  active: Sprint | null
  // Las tareas del sprint activo.
  tasks: SprintTask[]
  backlog: BacklogTask[]
  // Los sprints cerrados, del más reciente al más antiguo.
  closed: Sprint[]
}

// ---- Archivos (GET /v1/projects/:id/attachments) ----

// Tabla attachments. Las miniaturas de las imágenes de ejemplo se dibujan (`look`); con Storage
// serán la imagen real con una URL firmada.
export type ProjectFile = {
  id: string
  name: string
  kind: ProjectFileKind
  sizeBytes: number
  uploadedOn: IsoDate
  look: 'sketch' | 'palette' | null
}

export type ProjectFiles = {
  files: ProjectFile[]
  // Lo que ocupan los archivos de los demás proyectos y escritos (el espacio es uno solo).
  usedElsewhereBytes: number
  quotaBytes: number
}
