import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { CreateTaskInput } from '@kairo/shared'
import { TasksRepository } from './tasks.repository'

@Injectable()
export class TasksService {
  constructor(@Inject(TasksRepository) private readonly repository: TasksRepository) {}

  findAll(userId: string) {
    return this.repository.findActive(userId)
  }

  // position = cuántas tareas activas ya tiene: la nueva siempre se agrega
  // al final de la lista. Reordenar (drag) es de una fase posterior.
  async create(userId: string, input: CreateTaskInput) {
    const position = await this.repository.countActive(userId)
    return this.repository.create(userId, { ...input, position })
  }

  async complete(userId: string, taskId: string) {
    const task = await this.repository.complete(userId, taskId)
    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'No encontramos esa tarea.',
      })
    }
    return task
  }
}
