import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { DeleteEventInput, EventInput } from '@kairo/shared'
import { AgendaRepository } from './agenda.repository'
import { addDays, wallTimeToMinutes } from './agenda-utils'
import type { events } from '../../db/schema/agenda'

type EventRow = typeof events.$inferSelect

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
  constructor(@Inject(AgendaRepository) private readonly repository: AgendaRepository) {}

  async findAll(userId: string) {
    const rows = await this.repository.findAll(userId)
    return rows.map(toEventRecord)
  }

  async create(userId: string, input: EventInput) {
    const row = await this.repository.create(userId, { ...toRow(input), until: null, skip: [] })
    return toEventRecord(row)
  }

  // Edita el evento (si es una serie, toda la serie): until y skip no
  // cambian. Mover una sola vez de día es move(), no esto.
  async update(userId: string, id: string, input: EventInput) {
    const current = await this.repository.findOne(userId, id)
    if (!current) throw this.notFound()
    const row = await this.repository.update(userId, id, toRow(input))
    if (!row) throw this.notFound()
    return toEventRecord(row)
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
      return toEventRecord(row)
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
    return toEventRecord(row)
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
    return toEventRecord(row)
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

  private notFound() {
    return new NotFoundException({
      code: 'EVENT_NOT_FOUND',
      message: 'No encontramos ese evento.',
    })
  }
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

// project siempre null: Proyectos no tiene tabla ni service en la API
// todavía (decisión #37, mismo patrón que la 35 en Tareas y la 36 en
// Recordatorios).
function toEventRecord(row: EventRow) {
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
    project: null,
    repeat: row.repeat,
    reminder: row.reminder,
    until: row.until,
    skip: row.skip,
  }
}
