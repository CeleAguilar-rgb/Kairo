import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { decodeDailyUndo } from './daily-undo'
import { GoalsRepository } from './goals.repository'
import { JournalRepository } from './journal.repository'
import { MealsRepository } from './meals.repository'
import { RoutinesRepository } from './routines.repository'

// Un solo endpoint de Deshacer para las 4 áreas de Día a día (el front también comparte una sola
// Server Action pública, undoRoutineAction). Depende de los repositorios directo, no de los otros
// services, para no crear referencias cruzadas entre ellos dentro del módulo.
@Injectable()
export class DailyUndoService {
  constructor(
    @Inject(RoutinesRepository) private readonly routinesRepository: RoutinesRepository,
    @Inject(MealsRepository) private readonly mealsRepository: MealsRepository,
    @Inject(JournalRepository) private readonly journalRepository: JournalRepository,
    @Inject(GoalsRepository) private readonly goalsRepository: GoalsRepository,
  ) {}

  async undo(userId: string, token: string) {
    const action = decodeDailyUndo(token)
    if (!action) throw new NotFoundException({ code: 'UNDO_EXPIRED', message: 'Ya no se puede deshacer.' })

    switch (action.type) {
      case 'routine':
        return this.routinesRepository.restoreRoutine(userId, action.id)
      case 'block':
        return this.routinesRepository.restoreBlock(userId, action.id)
      case 'journal':
        return this.journalRepository.restore(userId, action.id)
      case 'mealPlans':
        return this.mealsRepository.restoreMany(userId, action.ids)
      case 'goal':
        return this.goalsRepository.restore(userId, action.id)
    }
  }
}
