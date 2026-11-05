import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { CardsRepository } from './cards.repository.js'
import { CategoriesRepository } from './categories.repository.js'
import { DebtsRepository } from './debts.repository.js'
import { decodeFinanceUndo } from './finance-undo.js'
import { MembershipsRepository } from './memberships.repository.js'
import { SavingsRepository } from './savings.repository.js'
import { TransactionsRepository } from './transactions.repository.js'

// Un solo endpoint de Deshacer para todo Finanzas (el front también comparte una sola Server Action pública,
// undoFinanceAction). Depende de los repositorios directo, no de los otros services, para no crear referencias
// cruzadas entre ellos dentro del módulo (mismo criterio que DailyUndoService).
@Injectable()
export class FinanceUndoService {
  constructor(
    @Inject(TransactionsRepository) private readonly transactionsRepository: TransactionsRepository,
    @Inject(SavingsRepository) private readonly savingsRepository: SavingsRepository,
    @Inject(DebtsRepository) private readonly debtsRepository: DebtsRepository,
    @Inject(MembershipsRepository) private readonly membershipsRepository: MembershipsRepository,
    @Inject(CardsRepository) private readonly cardsRepository: CardsRepository,
    @Inject(CategoriesRepository) private readonly categoriesRepository: CategoriesRepository,
  ) {}

  async undo(userId: string, token: string) {
    const action = decodeFinanceUndo(token)
    if (!action) throw new NotFoundException({ code: 'UNDO_EXPIRED', message: 'Ya no se puede deshacer.' })

    switch (action.type) {
      case 'transaction':
        return this.transactionsRepository.restore(userId, action.id)
      case 'saving':
        return this.savingsRepository.restore(userId, action.id)
      case 'debt':
        return this.debtsRepository.restore(userId, action.id)
      case 'membership':
        return this.membershipsRepository.restore(userId, action.id)
      case 'card':
        return this.cardsRepository.restoreWithMemberships(userId, action.id, action.membershipIds)
      case 'category':
        return this.categoriesRepository.restore(userId, action.id)
      case 'limits':
        for (const item of action.before) await this.categoriesRepository.setLimit(userId, item.id, item.limitCents)
        return
    }
  }
}
