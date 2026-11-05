import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import type { FocusSessionInput } from '@kairo/shared'
import type { focusSessions } from '../../db/schema/focus.js'
import { TasksService } from '../tasks/tasks.service.js'
import { FocusRepository } from './focus.repository.js'

type SessionRow = typeof focusSessions.$inferSelect

// Un reloj con el celular dormido puede mandar la sesión unos segundos "en el futuro": se tolera un minuto.
const FUTURE_TOLERANCE_MS = 60_000

// Enfoque guarda lo suyo (los tramos del pomodoro) y le pregunta a Tareas si la tarea es de la persona
// (modules.md: nunca lee su tabla). Los puntos del día y los minutos por semana o proyecto los arma el Next.js.
@Injectable()
export class FocusService {
  constructor(
    @Inject(FocusRepository) private readonly repository: FocusRepository,
    @Inject(TasksService) private readonly tasksService: TasksService,
  ) {}

  async record(userId: string, input: FocusSessionInput) {
    const startedAt = new Date(input.startedAt)
    if (startedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      throw new BadRequestException({ code: 'FOCUS_IN_FUTURE', message: 'Esa sesión todavía no empieza.' })
    }
    // La llave foránea solo garantiza que la tarea exista: que sea de ESTA persona lo revisa su service.
    if (input.taskId !== null && (await this.tasksService.findByIds(userId, [input.taskId])).length === 0) {
      throw new BadRequestException({ code: 'TASK_NOT_FOUND', message: 'No encontramos esa tarea.' })
    }
    return toSession(await this.repository.create(userId, { kind: input.kind, startedAt, minutes: input.minutes, taskId: input.taskId }))
  }

  async listSince(userId: string, from: string) {
    return (await this.repository.findSince(userId, new Date(from))).map(toSession)
  }
}

// Lo que sale hacia el front: nunca de quién es ni si está en la papelera.
function toSession(row: SessionRow) {
  return { id: row.id, kind: row.kind, startedAt: row.startedAt.toISOString(), minutes: row.minutes, taskId: row.taskId }
}
