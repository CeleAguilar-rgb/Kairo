import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { EraUpdateInput, EventCreateInput, EventUpdateInput, MoveInput } from '@kairo/shared'
import { publicFields, assertIdsIn, badRequest } from './writings-utils'
import { TimelineRepository, type EventPatch } from './timeline.repository'
import { WorldsService } from './worlds.service'

// La línea del tiempo (EscritosLinea.dc.html): eras que se editan y se reordenan con flechas, y eventos con quién
// participa, dónde pasa, notas sueltas, causas y consecuencias. Quién y dónde se revisan contra el mismo mundo.
@Injectable()
export class TimelineService {
  constructor(
    @Inject(TimelineRepository) private readonly repository: TimelineRepository,
    @Inject(WorldsService) private readonly worlds: WorldsService,
  ) {}

  // --- Eras ---------------------------------------------------------------------------------------------

  async createEra(userId: string, worldId: string, name: string) {
    await this.worlds.assertWorld(userId, worldId)
    return publicFields(await this.repository.createEra(userId, worldId, name))
  }

  async updateEra(userId: string, id: string, input: EraUpdateInput) {
    const row = await this.repository.updateEra(userId, id, input)
    if (!row) throw eraNotFound()
    return publicFields(row)
  }

  // ← / →: cambia de lugar con la vecina. La primera no sube y la última no baja (no es error: no pasa nada).
  async moveEra(userId: string, id: string, input: MoveInput) {
    const era = await this.repository.findEra(userId, id)
    if (!era) throw eraNotFound()
    const eras = await this.repository.findEras(userId, era.worldId)
    const ids = swapped(
      eras.map((item) => item.id),
      id,
      input.direction,
    )
    if (ids) await this.repository.reorderEras(userId, ids)
  }

  async deleteEra(userId: string, id: string) {
    const row = await this.repository.softDeleteEra(userId, id)
    if (!row) throw eraNotFound()
  }

  async restoreEra(userId: string, id: string) {
    const row = await this.repository.restoreEra(userId, id)
    if (!row) throw undoExpired()
  }

  // --- Eventos ----------------------------------------------------------------------------------------

  async createEvent(userId: string, input: EventCreateInput) {
    const era = await this.repository.findEra(userId, input.eraId)
    if (!era) throw badRequest('ERA_NOT_FOUND', 'No encontramos esa era.')
    return publicFields(await this.repository.createEvent(userId, era.id, input.title))
  }

  async updateEvent(userId: string, id: string, input: EventUpdateInput) {
    const event = await this.repository.findEvent(userId, id)
    if (!event) throw eventNotFound()
    const era = await this.repository.findEra(userId, event.eraId)
    if (!era) throw eventNotFound()

    const patch: EventPatch = { ...input }
    // Cambiar de era: tiene que ser otra era del MISMO mundo, y el evento queda al final de ella.
    if (input.eraId && input.eraId !== event.eraId) {
      const target = await this.repository.findEra(userId, input.eraId)
      if (!target || target.worldId !== era.worldId) throw badRequest('ERA_NOT_FOUND', 'Esa era no existe en este mundo.')
      patch.position = await this.repository.nextEventPosition(userId, target.id)
    }
    if (input.who || input.where) {
      const refs = await this.worlds.refs(userId, era.worldId)
      assertIdsIn([...(input.who ?? []), ...(input.where ?? [])], [refs.characters, refs.notes])
    }
    const row = await this.repository.updateEvent(userId, id, patch)
    if (!row) throw eventNotFound()
    return publicFields(row)
  }

  async moveEvent(userId: string, id: string, input: MoveInput) {
    const event = await this.repository.findEvent(userId, id)
    if (!event) throw eventNotFound()
    const events = await this.repository.findEvents(userId, [event.eraId])
    const ids = swapped(
      events.map((item) => item.id),
      id,
      input.direction,
    )
    if (ids) await this.repository.reorderEvents(userId, ids)
  }

  async deleteEvent(userId: string, id: string) {
    const row = await this.repository.softDeleteEvent(userId, id)
    if (!row) throw eventNotFound()
  }

  async restoreEvent(userId: string, id: string) {
    const row = await this.repository.restoreEvent(userId, id)
    if (!row) throw undoExpired()
  }
}

// El orden nuevo después de mover `id` un lugar hacia arriba o abajo; null si ya estaba en la orilla.
function swapped(ids: string[], id: string, direction: 'up' | 'down'): string[] | null {
  const index = ids.indexOf(id)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || target < 0 || target >= ids.length) return null
  const next = [...ids]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

function eraNotFound() {
  return new NotFoundException({ code: 'ERA_NOT_FOUND', message: 'No encontramos esa era.' })
}

function eventNotFound() {
  return new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'No encontramos ese evento.' })
}

function undoExpired() {
  return new NotFoundException({ code: 'UNDO_EXPIRED', message: 'Ya no se puede deshacer.' })
}
