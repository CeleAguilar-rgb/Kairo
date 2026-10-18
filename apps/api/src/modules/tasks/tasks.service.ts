import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { CreateTaskInput, TaskStatus } from '@kairo/shared'
import { TasksRepository } from './tasks.repository'
import type { tasks } from '../../db/schema/tasks'

type TaskRow = typeof tasks.$inferSelect

@Injectable()
export class TasksService {
  constructor(@Inject(TasksRepository) private readonly repository: TasksRepository) {}

  async findAll(userId: string) {
    const rows = await this.repository.findActive(userId)
    const { topLevel, subtasksByParent } = groupByParent(rows)
    return topLevel.map((task) => toTask(task, subtasksByParent.get(task.id) ?? []))
  }

  async create(userId: string, input: CreateTaskInput) {
    const position = await this.repository.countTopLevel(userId)
    const { task, subtasks } = await this.repository.createWithSubtasks(
      userId,
      input,
      position,
    )
    return toTask(task, subtasks)
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
    return toTask(result.task, result.subtasks)
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

  // "Deshacer" del aviso de borrar.
  async restore(userId: string, taskId: string) {
    const result = await this.repository.restore(userId, taskId)
    if (!result) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'No encontramos esa tarea en la papelera.',
      })
    }
    return toTask(result.task, result.subtasks)
  }
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

// project siempre sale null: Proyectos no tiene tabla ni service en la API
// todavía (decisión #35). Cuando lo tenga, aquí se le pide el nombre por id
// en vez de leer su tabla (regla de modules.md).
function toTask(task: TaskRow, subtasks: TaskRow[]) {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    status: task.status,
    priority: task.priority,
    dueOn: task.dueOn,
    doneAt: task.doneAt?.toISOString() ?? null,
    position: task.position,
    project: null,
    subtasks: subtasks.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      done: subtask.status === 'done',
    })),
  }
}
