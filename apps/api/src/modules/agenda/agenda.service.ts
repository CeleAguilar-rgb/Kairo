import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { DeleteEventInput, EventInput } from '@kairo/shared'
import { ProjectsService } from '../projects/projects.service'
import { AgendaRepository } from './agenda.repository'
import { addDays, wallTimeToMinutes } from './agenda-utils'
import type { events } from '../../db/schema/agenda'

type EventRow = typeof events.$inferSelect
type ProjectRef = { id: string; name: string }

// El "token" de Deshacer de un borrado no vive guardado en el servidor
// (decisión #37, mismo motivo que la 36 en Recordatorios: una Server Action
// no sobrevive entre llamadas). Es la acción exacta a deshacer, codificada
// en el string mismo: qué campo cambió y a qué valor regresarlo, así no
// hace falta adivinar ni guardar una foto de cómo estaba antes.
type UndoAction =
  | { type: 'restore'; id: string }
  | { type: 'unskip'; id: string; occurrence: string }
  | { type: 'until'; id: string; previous: string | null }

function encodeUndo(action: UndoAction): string {
  return JSON.stringify(action)
}

function decodeUndo(token: string): UndoAction | null {
  try {
    const action = JSON.parse(token) as UndoAction
    if (action && typeof action === 'object' && 'type' in action && 'id' in action) return action
    return null
  } catch {
    return null
  }
}

@Injectable()
export class AgendaService {
  constructor(
    @Inject(AgendaRepository) private readonly repository: AgendaRepository,
    // El nombre del proyecto y si es de la persona se le piden a su service (modules.md: nunca se lee su tabla).
    @Inject(ProjectsService) private readonly projectsService: ProjectsService,
  ) {}

  async findAll(userId: string) {
    const rows = await this.repository.findAll(userId)
    const projects = await this.projectsService.summaries(
      userId,
      rows.map((row) => row.projectId),
    )
    return rows.map((row) => toEventRecord(row, projectOf(row, projects)))
  }

  // `until` solo lo pasa otro módulo (Escuela: las clases de una materia terminan con su periodo); el
  // formulario de eventos no lo manda, una serie nueva no tiene fin.
  async create(userId: string, input: EventInput, until: string | null = null) {
    await this.assertProject(userId, input.projectId)
    const row = await this.repository.create(userId, { ...toRow(input), until, skip: [] })
    return this.recordOf(userId, row)
  }

  // API pública para Escuela: los eventos de un proyecto se van a la papelera con él. No falla si no tiene.
  async deleteByProject(userId: string, projectId: string): Promise<void> {
    await this.repository.softDeleteByProject(userId, projectId)
  }

  // Edita el evento (si es una serie, toda la serie): until y skip no
  // cambian. Mover una sola vez de día es move(), no esto.
  async update(userId: string, id: string, input: EventInput) {
    const current = await this.repository.findOne(userId, id)
    if (!current) throw this.notFound()
    await this.assertProject(userId, input.projectId)
    const row = await this.repository.update(userId, id, toRow(input))
    if (!row) throw this.notFound()
    return this.recordOf(userId, row)
  }

  // Pasa el evento (o solo esa vez de una serie) a otro día, conservando su
  // hora. Una vez de una serie que se mueve deja de ser de la serie: se
  // salta ese día ahí y nace un evento suelto en el día nuevo.
  async move(userId: string, id: string, date: string, occurrence: string) {
    const current = await this.repository.findOne(userId, id)
    if (!current) throw this.notFound()

    if (current.repeat === 'none') {
      const row = await this.repository.update(userId, id, { date })
      if (!row) throw this.notFound()
      return this.recordOf(userId, row)
    }

    await this.repository.update(userId, id, { skip: [...current.skip, occurrence] })
    const row = await this.repository.create(userId, {
      title: current.title,
      kind: current.kind,
      date,
      allDay: current.allDay,
      startMin: current.startMin,
      endMin: current.endMin,
      place: current.place,
      projectId: current.projectId,
      notes: current.notes,
      repeat: 'none',
      until: null,
      skip: [],
      reminder: current.reminder,
    })
    return this.recordOf(userId, row)
  }

  // "Duplicar": un evento suelto igual, el día que se pida, con "(copia)" en el título.
  async duplicate(userId: string, id: string, occurrence: string) {
    const current = await this.repository.findOne(userId, id)
    if (!current) throw this.notFound()
    const row = await this.repository.create(userId, {
      title: `${current.title} (copia)`.slice(0, 120),
      kind: current.kind,
      date: occurrence,
      allDay: current.allDay,
      startMin: current.startMin,
      endMin: current.endMin,
      place: current.place,
      projectId: current.projectId,
      notes: current.notes,
      repeat: 'none',
      until: null,
      skip: [],
      reminder: current.reminder,
    })
    return this.recordOf(userId, row)
  }

  // Borra el evento entero, o solo esa vez, o esa y las siguientes. Va a la
  // papelera (si desaparece del todo) o se acorta (si sigue existiendo); el
  // token que devuelve sirve para deshacerlo con undo().
  async delete(userId: string, id: string, input: DeleteEventInput) {
    const current = await this.repository.findOne(userId, id)
    if (!current) throw this.notFound()

    if (current.repeat === 'none' || input.scope === 'all') {
      await this.repository.softDelete(userId, id)
      return { id, undoToken: encodeUndo({ type: 'restore', id }) }
    }

    if (input.scope === 'one') {
      await this.repository.update(userId, id, { skip: [...current.skip, input.occurrence] })
      return { id, undoToken: encodeUndo({ type: 'unskip', id, occurrence: input.occurrence }) }
    }

    // "Esta y las siguientes": la serie termina el día anterior. Si eso cae
    // antes de su primer día, no queda nada de ella: es como borrar todo.
    const until = addDays(input.occurrence, -1)
    if (until < current.date) {
      await this.repository.softDelete(userId, id)
      return { id, undoToken: encodeUndo({ type: 'restore', id }) }
    }
    await this.repository.update(userId, id, { until })
    return { id, undoToken: encodeUndo({ type: 'until', id, previous: current.until }) }
  }

  async undo(userId: string, token: string) {
    const action = decodeUndo(token)
    if (!action) throw this.notFound()

    switch (action.type) {
      case 'restore':
        await this.repository.restore(userId, action.id)
        return
      case 'unskip': {
        const current = await this.repository.findOne(userId, action.id)
        if (!current) throw this.notFound()
        await this.repository.update(userId, action.id, {
          skip: current.skip.filter((date) => date !== action.occurrence),
        })
        return
      }
      case 'until':
        await this.repository.update(userId, action.id, { until: action.previous })
        return
    }
  }

  // Un evento con el nombre de su proyecto.
  private async recordOf(userId: string, row: EventRow) {
    const projects = await this.projectsService.summaries(userId, [row.projectId])
    return toEventRecord(row, projectOf(row, projects))
  }

  // La llave foránea solo garantiza que el proyecto exista: que sea de ESTA persona lo revisa su service.
  private async assertProject(userId: string, projectId: string | null) {
    if (projectId !== null && !(await this.projectsService.exists(userId, projectId))) {
      throw new BadRequestException({ code: 'PROJECT_NOT_FOUND', message: 'No encontramos ese proyecto.' })
    }
  }

  private notFound() {
    return new NotFoundException({
      code: 'EVENT_NOT_FOUND',
      message: 'No encontramos ese evento.',
    })
  }
}

function projectOf(row: EventRow, projects: Map<string, ProjectRef>): ProjectRef | null {
  return row.projectId ? (projects.get(row.projectId) ?? null) : null
}

function toRow(input: EventInput) {
  return {
    title: input.title,
    kind: input.kind,
    date: input.date,
    allDay: input.allDay,
    startMin: input.allDay || !input.startTime ? null : wallTimeToMinutes(input.startTime),
    endMin: input.allDay || !input.endTime ? null : wallTimeToMinutes(input.endTime),
    place: input.location || null,
    projectId: input.projectId,
    notes: input.notes === '' ? null : input.notes,
    repeat: input.repeat,
    reminder: input.reminder,
  }
}

// `project` lo resuelve el service con el de Proyectos (decisión #41): el nombre
// por id, nunca leyendo su tabla. Sale null si el evento no tiene proyecto.
function toEventRecord(row: EventRow, project: ProjectRef | null) {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    date: row.date,
    allDay: row.allDay,
    startMin: row.startMin,
    endMin: row.endMin,
    notes: row.notes,
    place: row.place,
    project,
    repeat: row.repeat,
    reminder: row.reminder,
    until: row.until,
    skip: row.skip,
  }
}
