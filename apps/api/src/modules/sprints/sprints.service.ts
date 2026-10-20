import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { AddSprintTaskInput, CloseSprintInput, StartSprintInput } from '@kairo/shared'
import { AccountService } from '../../account/account.service'
import type { sprints } from '../../db/schema/sprints'
import { ProjectsService } from '../projects/projects.service'
import { TasksService } from '../tasks/tasks.service'
import { addDays, isUniqueViolation, todayIn } from './sprints-utils'
import { SprintsRepository } from './sprints.repository'

type SprintRow = typeof sprints.$inferSelect

// Los sprints de un proyecto: uno activo a la vez, de una o dos semanas. Este módulo no toca la tabla de
// Tareas (modules.md): qué tareas entraron a un sprint vive en `sprint_tasks`, y lo que necesita saber de una
// tarea (si existe, de qué proyecto es, si está hecha) se lo pide a TasksService.
@Injectable()
export class SprintsService {
  constructor(
    @Inject(SprintsRepository) private readonly repository: SprintsRepository,
    @Inject(ProjectsService) private readonly projectsService: ProjectsService,
    @Inject(TasksService) private readonly tasksService: TasksService,
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {}

  // El sprint activo (con los ids de sus tareas) y los cerrados (con cuántas tuvo y cuántas estaban hechas al
  // cerrarlos). El título y el estado de cada tarea los pone el Next.js de en medio con la lista de Tareas.
  async list(userId: string, projectId: string) {
    await this.assertProject(userId, projectId)
    const [active, closed] = await Promise.all([this.repository.findActive(userId, projectId), this.repository.findClosed(userId, projectId)])
    const [taskIds, stats] = await Promise.all([
      active ? this.repository.taskIdsOf(userId, active.id) : Promise.resolve<string[]>([]),
      this.repository.closedStats(userId, closed.map((sprint) => sprint.id)),
    ])
    return {
      active: active ? { ...toSprint(active), taskIds } : null,
      closed: closed.map((sprint) => ({ ...toSprint(sprint), doneCount: stats.get(sprint.id)?.done ?? 0, totalCount: stats.get(sprint.id)?.total ?? 0 })),
    }
  }

  // "Empezar Sprint N": solo si el proyecto no tiene uno activo. Empieza hoy (en la zona del perfil).
  async start(userId: string, projectId: string, input: StartSprintInput) {
    await this.assertProject(userId, projectId)
    if (await this.repository.findActive(userId, projectId)) throw this.alreadyActive()

    const today = await this.todayOf(userId)
    const number = (await this.repository.lastNumber(userId, projectId)) + 1
    try {
      const row = await this.repository.create(userId, projectId, {
        number,
        goal: input.goal,
        startsOn: today,
        endsOn: addDays(today, input.weeks * 7 - 1),
      })
      return { ...toSprint(row), taskIds: [] as string[] }
    } catch (error) {
      // Dos peticiones a la vez: el índice único (un sprint activo por proyecto) deja pasar solo una.
      if (isUniqueViolation(error)) throw this.alreadyActive()
      throw error
    }
  }

  // "Cerrar Sprint N": cierra el activo y abre el siguiente el día después de que terminaba (o hoy, si ya pasó).
  // Las tareas hechas se quedan en el sprint cerrado; las sin terminar pasan al siguiente (y empiezan en "Por
  // hacer") o regresan al backlog, según se elija.
  async close(userId: string, projectId: string, input: CloseSprintInput) {
    await this.assertProject(userId, projectId)
    const active = await this.repository.findActive(userId, projectId)
    if (!active) throw this.noActive()

    const taskIds = await this.repository.taskIdsOf(userId, active.id)
    // Las que están en la papelera no salen aquí: no se cuentan ni se pasan al siguiente.
    const tasks = await this.tasksService.findByIds(userId, taskIds)
    const done = tasks.filter((task) => task.status === 'done')
    const open = tasks.filter((task) => task.status !== 'done')

    const today = await this.todayOf(userId)
    const afterEnd = addDays(active.endsOn, 1)
    const startsOn = afterEnd > today ? afterEnd : today
    const carry = input.move === 'next' ? open : []

    let next: SprintRow | undefined
    try {
      next = await this.repository.closeAndStartNext(userId, active.id, projectId, {
        notes: input.notes === '' ? null : input.notes,
        allTaskIds: taskIds,
        doneTaskIds: done.map((task) => task.id),
        next: { number: active.number + 1, goal: input.nextGoal, startsOn, endsOn: addDays(startsOn, input.weeks * 7 - 1) },
        carryTaskIds: carry.map((task) => task.id),
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw this.alreadyActive()
      throw error
    }
    if (!next) throw this.noActive()

    // Las que pasan al siguiente empiezan en "Por hacer". Es lo único que se hace fuera de la transacción (es
    // de la tabla de Tareas): si fallara, el sprint ya quedó bien y la tarea solo conserva su estado anterior.
    for (const task of carry) {
      if (task.status !== 'todo') await this.tasksService.setStatus(userId, task.id, 'todo')
    }

    return {
      active: { ...toSprint(next), taskIds: carry.map((task) => task.id) },
      closed: { number: active.number, doneCount: done.length, totalCount: tasks.length },
      openCount: open.length,
    }
  }

  // Mete una tarea del backlog al sprint activo (en "Por hacer" no: conserva su estado, que el tablero muestra).
  async addTask(userId: string, projectId: string, input: AddSprintTaskInput) {
    await this.assertProject(userId, projectId)
    const active = await this.repository.findActive(userId, projectId)
    if (!active) throw new BadRequestException({ code: 'NO_ACTIVE_SPRINT', message: 'Empieza un sprint para agregar tareas.' })

    const [task] = await this.tasksService.findByIds(userId, [input.taskId])
    if (!task) throw new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'No encontramos esa tarea.' })
    if (task.project?.id !== projectId) {
      throw new BadRequestException({ code: 'TASK_NOT_IN_PROJECT', message: 'Esa tarea no es de este proyecto.' })
    }
    if (task.status === 'done') {
      throw new BadRequestException({ code: 'TASK_ALREADY_DONE', message: 'Esa tarea ya está hecha.' })
    }

    await this.repository.addTask(userId, active.id, task.id)
    return { sprintId: active.id, taskId: task.id }
  }

  // El proyecto tiene que existir y ser de esta persona (se lo pregunta a su service).
  private async assertProject(userId: string, projectId: string) {
    if (!(await this.projectsService.exists(userId, projectId))) {
      throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'No encontramos ese proyecto.' })
    }
  }

  private async todayOf(userId: string): Promise<string> {
    const { profile } = await this.accountService.getMe(userId)
    return todayIn(profile.timezone)
  }

  private alreadyActive() {
    return new ConflictException({ code: 'SPRINT_ALREADY_ACTIVE', message: 'Este proyecto ya tiene un sprint activo.' })
  }

  private noActive() {
    return new NotFoundException({ code: 'NO_ACTIVE_SPRINT', message: 'Este proyecto no tiene un sprint activo.' })
  }
}

function toSprint(row: SprintRow) {
  return { id: row.id, number: row.number, goal: row.goal, startsOn: row.startsOn, endsOn: row.endsOn, notes: row.notes }
}
