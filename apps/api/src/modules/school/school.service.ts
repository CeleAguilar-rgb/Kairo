import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { CreateSubjectBodyInput, EventInput, SubjectGradesInput, TermInput } from '@kairo/shared'
import { AccountService } from '../../account/account.service'
import type { schoolTerms, subjects } from '../../db/schema/school'
import { AgendaService } from '../agenda/agenda.service'
import { AttachmentsService } from '../attachments/attachments.service'
import { ProjectsService } from '../projects/projects.service'
import { SprintsService } from '../sprints/sprints.service'
import { TasksService } from '../tasks/tasks.service'
import { firstOnOrAfter, gradeFromColumn, gradeToColumn, todayIn } from './school-utils'
import { SchoolRepository, type GradeColumns } from './school.repository'

type TermRow = typeof schoolTerms.$inferSelect
type SubjectRow = typeof subjects.$inferSelect
type ProjectRef = { id: string; name: string }

// Escuela solo guarda lo suyo (el periodo y lo propio de una materia, decisión #43) y orquesta a otros tres
// módulos: la materia ES un proyecto `school` (Proyectos), sus clases son eventos semanales (Agenda) y sus
// entregas son tareas del proyecto (Tareas). Cada pieza se pide al service público del otro módulo, nunca a su
// tabla (modules.md). Las clases y las entregas no se devuelven aquí: el Next.js de en medio las arma con las
// listas de Agenda y de Tareas (decisión #38).
@Injectable()
export class SchoolService {
  constructor(
    @Inject(SchoolRepository) private readonly repository: SchoolRepository,
    @Inject(ProjectsService) private readonly projectsService: ProjectsService,
    @Inject(AgendaService) private readonly agendaService: AgendaService,
    @Inject(TasksService) private readonly tasksService: TasksService,
    @Inject(SprintsService) private readonly sprintsService: SprintsService,
    @Inject(AttachmentsService) private readonly attachmentsService: AttachmentsService,
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {}

  // --- Periodos ---------------------------------------------------------------------------------------

  async listTerms(userId: string) {
    const rows = await this.repository.findTerms(userId)
    const projects = await this.projectsService.summaries(
      userId,
      rows.map((row) => row.prepProjectId),
    )
    return rows.map((row) => toTerm(row, projects))
  }

  async createTerm(userId: string, input: TermInput) {
    await this.assertPrepProject(userId, input.prepProjectId)
    const row = await this.repository.createTerm(userId, input)
    return this.termOf(userId, row)
  }

  async updateTerm(userId: string, id: string, input: TermInput) {
    await this.assertPrepProject(userId, input.prepProjectId)
    const row = await this.repository.updateTerm(userId, id, input)
    if (!row) throw this.termNotFound()
    return this.termOf(userId, row)
  }

  // --- Materias ---------------------------------------------------------------------------------------

  // Solo las materias cuyo proyecto sigue vivo (el nombre sale del proyecto). Sus clases y entregas, no.
  async listSubjects(userId: string) {
    const rows = await this.repository.findSubjects(userId)
    const projects = await this.projectsService.summaries(
      userId,
      rows.map((row) => row.projectId),
    )
    return rows.flatMap((row) => {
      const project = projects.get(row.projectId)
      return project ? [toSubject(row, project)] : []
    })
  }

  // Crear una materia son tres cosas en tres módulos y no caben en una transacción (cada módulo es dueño de sus
  // tablas): el proyecto, la fila propia y una serie semanal por cada día de clase. Si algo falla a medias, lo ya
  // creado se manda a la papelera para que no quede una materia a medias.
  async createSubject(userId: string, input: CreateSubjectBodyInput) {
    const term = input.termId ? await this.repository.findTerm(userId, input.termId) : undefined
    if (input.termId && !term) {
      throw new BadRequestException({ code: 'TERM_NOT_FOUND', message: 'No encontramos ese periodo.' })
    }

    // Las clases empiezan hoy o cuando empiece el periodo, lo que llegue después, y terminan con el periodo.
    const today = await this.todayOf(userId)
    const from = term && term.startsOn > today ? term.startsOn : today

    const project = await this.projectsService.create(userId, {
      name: input.name,
      kind: 'school',
      status: 'active',
      description: '',
      startedOn: term?.startsOn ?? null,
      goalOn: term?.endsOn ?? null,
      objectives: [],
      links: [],
      cover: null,
    })

    let subjectId: string | null = null
    try {
      const row = await this.repository.createSubject(userId, {
        projectId: project.id,
        termId: term?.id ?? null,
        teacher: input.teacher === '' ? null : input.teacher,
        color: input.color,
      })
      subjectId = row.id
      for (const day of input.days) {
        const date = firstOnOrAfter(from, day)
        const event: EventInput = {
          title: input.name,
          kind: 'school',
          date,
          allDay: false,
          startTime: input.startsAt,
          endTime: input.endsAt,
          location: input.room === '' ? null : input.room,
          projectId: project.id,
          repeat: 'weekly',
          reminder: 'none',
          notes: '',
        }
        // Si la primera clase cae después del fin del periodo (se agregó una materia a uno ya terminado), la
        // serie no termina: sería una serie que acaba antes de empezar.
        await this.agendaService.create(userId, event, term && date <= term.endsOn ? term.endsOn : null)
      }
      return toSubject(row, { id: project.id, name: project.name })
    } catch (error) {
      await this.eraseSubject(userId, project.id, subjectId).catch(() => undefined)
      throw error
    }
  }

  // Una casilla de calificaciones a la vez (o las que lleguen): solo se tocan las que vienen en el cuerpo.
  async setGrades(userId: string, id: string, input: SubjectGradesInput) {
    const columns: GradeColumns = {}
    if (input.midterm1 !== undefined) columns.midterm1 = gradeToColumn(input.midterm1)
    if (input.midterm2 !== undefined) columns.midterm2 = gradeToColumn(input.midterm2)
    if (input.final !== undefined) columns.final = gradeToColumn(input.final)

    const row = await this.repository.setGrades(userId, id, columns)
    if (!row) throw this.subjectNotFound()
    const projects = await this.projectsService.summaries(userId, [row.projectId])
    const project = projects.get(row.projectId)
    if (!project) throw this.subjectNotFound()
    return toSubject(row, project)
  }

  // Borrar una materia manda a la papelera todo lo suyo (design.md, "Borrar": entregas, clases del horario y
  // calificaciones). Si se interrumpe a la mitad, volver a pedirlo termina el trabajo: cada paso es idempotente y
  // la fila de la materia es lo último, así que sigue a la vista mientras falte algo.
  async deleteSubject(userId: string, id: string): Promise<void> {
    const subject = await this.repository.findSubject(userId, id)
    if (!subject) throw this.subjectNotFound()
    await this.eraseSubject(userId, subject.projectId, subject.id)
  }

  // De lo que cuelga del proyecto a lo que lo sostiene.
  private async eraseSubject(userId: string, projectId: string, subjectId: string | null) {
    await this.tasksService.deleteByProject(userId, projectId)
    await this.agendaService.deleteByProject(userId, projectId)
    await this.sprintsService.deleteByProject(userId, projectId)
    await this.attachmentsService.deleteByProject(userId, projectId)
    await this.projectsService.softDelete(userId, projectId)
    if (subjectId) await this.repository.softDeleteSubject(userId, subjectId)
  }

  // La llave foránea solo garantiza que el proyecto exista: que sea de ESTA persona lo revisa su service.
  private async assertPrepProject(userId: string, projectId: string | null) {
    if (projectId !== null && !(await this.projectsService.exists(userId, projectId))) {
      throw new BadRequestException({ code: 'PROJECT_NOT_FOUND', message: 'No encontramos ese proyecto.' })
    }
  }

  private async termOf(userId: string, row: TermRow) {
    const projects = await this.projectsService.summaries(userId, [row.prepProjectId])
    return toTerm(row, projects)
  }

  private async todayOf(userId: string): Promise<string> {
    const { profile } = await this.accountService.getMe(userId)
    return todayIn(profile.timezone)
  }

  private termNotFound() {
    return new NotFoundException({ code: 'TERM_NOT_FOUND', message: 'No encontramos ese periodo.' })
  }

  private subjectNotFound() {
    return new NotFoundException({ code: 'SUBJECT_NOT_FOUND', message: 'No encontramos esa materia.' })
  }
}

function toTerm(row: TermRow, projects: Map<string, ProjectRef>) {
  return {
    id: row.id,
    name: row.name,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    prepProject: row.prepProjectId ? (projects.get(row.prepProjectId) ?? null) : null,
  }
}

function toSubject(row: SubjectRow, project: ProjectRef) {
  return {
    id: row.id,
    projectId: row.projectId,
    termId: row.termId,
    name: project.name,
    teacher: row.teacher,
    color: row.color,
    grades: { midterm1: gradeFromColumn(row.midterm1), midterm2: gradeFromColumn(row.midterm2), final: gradeFromColumn(row.final) },
  }
}
