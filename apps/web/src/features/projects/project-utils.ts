import type { Task } from '@/features/tasks'

import type {
  BacklogTask,
  Project,
  ProjectDetail,
  ProjectDetailRecord,
  ProjectRecord,
  ProjectSprints,
  ProjectSprintsRecord,
  ProjectTask,
  Sprint,
  SprintTask,
} from './types'

// La lógica pura que arma lo que pinta cada pantalla de Proyectos a partir de los hechos crudos de la API (los
// proyectos y sus sprints) y de la lista de Tareas (decisión #38: la cuenta vive aquí, no en la API, igual que
// Agenda y Día a día). Sin servidor ni React, para poder probarla suelta.

// Las tareas de un proyecto: la API de Tareas ya trae `project: { id, name }` en cada una.
export const tasksOfProject = (tasks: Task[], projectId: string): Task[] => tasks.filter((task) => task.project?.id === projectId)

const subtasksDone = (task: Task) => task.subtasks.filter((subtask) => subtask.done).length

// El avance de un proyecto: hechas / totales, cuántas hay y la fecha más cercana de las pendientes.
export function withTaskStats(record: ProjectRecord, allTasks: Task[]): Project {
  const tasks = tasksOfProject(allTasks, record.id)
  const doneCount = tasks.filter((task) => task.status === 'done').length
  const upcoming = tasks
    .filter((task) => task.status !== 'done' && task.dueOn)
    .map((task) => task.dueOn as string)
    .sort()
  return {
    ...record,
    progress: tasks.length === 0 ? 0 : doneCount / tasks.length,
    taskCount: tasks.length,
    doneCount,
    nextDueOn: upcoming[0] ?? null,
  }
}

// Una tarea como la muestra "Tareas del proyecto" (la completa vive en Tareas).
function toProjectTask(task: Task): ProjectTask {
  return { id: task.id, title: task.title, status: task.status, subtasksDone: subtasksDone(task), subtasksTotal: task.subtasks.length, dueOn: task.dueOn }
}

export function toProjectDetail(record: ProjectDetailRecord, allTasks: Task[], sprints: ProjectSprintsRecord): ProjectDetail {
  return {
    ...withTaskStats(record, allTasks),
    notes: record.notes,
    objectives: record.objectives,
    links: record.links,
    tasks: tasksOfProject(allTasks, record.id).map(toProjectTask),
    currentSprint: sprints.active ? { number: sprints.active.number, endsOn: sprints.active.endsOn } : null,
    // Los minutos de pomodoro de la semana vienen del módulo de Enfoque, que todavía no tiene backend.
    focusMinutesWeek: 0,
  }
}

// El tablero del sprint tiene tres columnas: una tarea en "Revisión" se muestra en "En curso".
function boardStatus(task: Task): SprintTask['status'] {
  return task.status === 'review' ? 'in_progress' : task.status
}

// La pestaña Sprints: el sprint activo con su tablero, el backlog y los cerrados.
//  - El tablero son las tareas que entraron al sprint activo (las que ya no existen, porque se fueron a la
//    papelera, no salen).
//  - El backlog son las tareas del proyecto que no están hechas y no están en el sprint activo: lo que "regresó
//    al backlog" al cerrar un sprint cae aquí solo, sin que nadie lo marque.
export function toProjectSprints(record: ProjectSprintsRecord, projectId: string, allTasks: Task[]): ProjectSprints {
  const projectTasks = tasksOfProject(allTasks, projectId)
  const inSprint = new Set(record.active?.taskIds ?? [])

  const tasks: SprintTask[] = projectTasks
    .filter((task) => inSprint.has(task.id))
    .map((task) => ({
      id: task.id,
      title: task.title,
      status: boardStatus(task),
      dueOn: task.dueOn,
      subtasksDone: subtasksDone(task),
      subtasksTotal: task.subtasks.length,
    }))

  const backlog: BacklogTask[] = projectTasks.filter((task) => task.status !== 'done' && !inSprint.has(task.id)).map((task) => ({ id: task.id, title: task.title }))

  const active: Sprint | null = record.active
    ? {
        id: record.active.id,
        number: record.active.number,
        goal: record.active.goal,
        startsOn: record.active.startsOn,
        endsOn: record.active.endsOn,
        notes: record.active.notes,
        doneCount: tasks.filter((task) => task.status === 'done').length,
        totalCount: tasks.length,
      }
    : null

  return { active, tasks, backlog, closed: record.closed }
}
