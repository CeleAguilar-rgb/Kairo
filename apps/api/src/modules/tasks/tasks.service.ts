import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { CreateTaskInput, TaskStatus } from '@kairo/shared'
import { ProjectsService } from '../projects/projects.service'
import { TasksRepository } from './tasks.repository'
import type { tasks } from '../../db/schema/tasks'

type TaskRow = typeof tasks.$inferSelect
type ProjectRef = { id: string; name: string }

@Injectable()
export class TasksService {
  constructor(
    @Inject(TasksRepository) private readonly repository: TasksRepository,
    // El nombre del proyecto y si es de la persona se le piden a su service (modules.md: nunca se lee su tabla).
    @Inject(ProjectsService) private readonly projectsService: ProjectsService,
  ) {}

  async findAll(userId: string) {
    const rows = await this.repository.findActive(userId)
    const { topLevel, subtasksByParent } = groupByParent(rows)
    const projects = await this.projectsService.summaries(
      userId,
      topLevel.map((task) => task.projectId),
    )
    return topLevel.map((task) => toTask(task, subtasksByParent.get(task.id) ?? [], projectOf(task, projects)))
  }

  // API pública para otros módulos (Sprints): varias tareas por id, de esta persona, con su proyecto. Un id
  // que no es suyo (o que ya no existe) simplemente no sale.
  async findByIds(userId: string, ids: string[]) {
    const { tasks: rows, subtasks } = await this.repository.findByIds(userId, ids)
    const { subtasksByParent } = groupByParent([...rows, ...subtasks])
    const projects = await this.projectsService.summaries(
      userId,
      rows.map((task) => task.projectId),
    )
    return rows.map((task) => toTask(task, subtasksByParent.get(task.id) ?? [], projectOf(task, projects)))
  }

  async create(userId: string, input: CreateTaskInput) {
    // La llave foránea solo garantiza que el proyecto exista: que sea de ESTA persona lo revisa su service.
    if (input.projectId !== null && !(await this.projectsService.exists(userId, input.projectId))) {
      throw new BadRequestException({ code: 'PROJECT_NOT_FOUND', message: 'No encontramos ese proyecto.' })
    }
    const position = await this.repository.countTopLevel(userId)
    const { task, subtasks } = await this.repository.createWithSubtasks(
      userId,
      input,
      position,
    )
    return this.withProject(userId, task, subtasks)
  }

  // Sirve tanto para una tarea (moverla en el tablero, marcarla hecha) como
  // para una subtarea (su checkbox en el detalle): las dos son filas de
  // tasks, así que un solo método de repository las cambia igual.
  async setStatus(userId: string, taskId: string, status: TaskStatus) {
    const result = await this.repository.setStatus(userId, taskId, status)
    if (!result) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'No encontramos esa tarea.',
      })
    }
    return this.withProject(userId, result.task, result.subtasks)
  }

  // Papelera: la tarea y sus subtareas se van juntas (docs/guides/design.md,
  // patrón "Borrar"). El front ya sabe su título y cuántas subtareas arrastra
  // (las tiene en memoria), así que no hace falta devolver nada más.
  async delete(userId: string, taskId: string): Promise<void> {
    const task = await this.repository.softDelete(userId, taskId)
    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'No encontramos esa tarea.',
      })
    }
  }

  // API pública para Escuela: las tareas de un proyecto se van a la papelera con él. No falla si no tiene.
  async deleteByProject(userId: string, projectId: string): Promise<void> {
    await this.repository.softDeleteByProject(userId, projectId)
  }

  // "Deshacer" del aviso de borrar.
  async restore(userId: string, taskId: string) {
    const result = await this.repository.restore(userId, taskId)
    if (!result) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'No encontramos esa tarea en la papelera.',
      })
    }
    return this.withProject(userId, result.task, result.subtasks)
  }

  // Una sola tarea con el nombre de su proyecto.
  private async withProject(userId: string, task: TaskRow, subtasks: TaskRow[]) {
    const projects = await this.projectsService.summaries(userId, [task.projectId])
    return toTask(task, subtasks, projectOf(task, projects))
  }
}

function projectOf(task: TaskRow, projects: Map<string, ProjectRef>): ProjectRef | null {
  return task.projectId ? (projects.get(task.projectId) ?? null) : null
}

function groupByParent(rows: TaskRow[]) {
  const topLevel: TaskRow[] = []
  const subtasksByParent = new Map<string, TaskRow[]>()
  for (const row of rows) {
    if (row.parentTaskId) {
      const list = subtasksByParent.get(row.parentTaskId) ?? []
      list.push(row)
      subtasksByParent.set(row.parentTaskId, list)
    } else {
      topLevel.push(row)
    }
  }
  return { topLevel, subtasksByParent }
}

// `project` lo resuelve el service con el de Proyectos (el nombre por id, nunca
// leyendo su tabla — modules.md). Sale null si la tarea no tiene proyecto.
function toTask(task: TaskRow, subtasks: TaskRow[], project: ProjectRef | null) {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    status: task.status,
    priority: task.priority,
    dueOn: task.dueOn,
    doneAt: task.doneAt?.toISOString() ?? null,
    position: task.position,
    project,
    subtasks: subtasks.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      done: subtask.status === 'done',
    })),
  }
}
