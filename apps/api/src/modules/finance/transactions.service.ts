import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { FINANCE_CURRENCY, type TransactionInput } from '@kairo/shared'
import { CardsRepository } from './cards.repository'
import { CategoriesRepository } from './categories.repository'
import { DebtsRepository } from './debts.repository'
import { toTransaction } from './finance-mappers'
import { encodeFinanceUndo } from './finance-undo'
import { formatMoney } from './finance-utils'
import { SavingsRepository } from './savings.repository'
import { TransactionsRepository, type NewTransaction } from './transactions.repository'

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(TransactionsRepository) private readonly repository: TransactionsRepository,
    @Inject(CardsRepository) private readonly cardsRepository: CardsRepository,
    @Inject(CategoriesRepository) private readonly categoriesRepository: CategoriesRepository,
    @Inject(SavingsRepository) private readonly savingsRepository: SavingsRepository,
    @Inject(DebtsRepository) private readonly debtsRepository: DebtsRepository,
  ) {}

  async create(userId: string, input: TransactionInput) {
    const data = await this.resolve(userId, input, null)
    const row = await this.repository.create(userId, data)
    return toTransaction(row)
  }

  async update(userId: string, id: string, input: TransactionInput) {
    const existing = await this.repository.findOne(userId, id)
    if (!existing) throw this.notFound()
    const data = await this.resolve(userId, input, existing.id)
    const row = await this.repository.update(userId, id, data)
    if (!row) throw this.notFound()
    return toTransaction(row)
  }

  // Va a la papelera: el aviso trae "Deshacer".
  async delete(userId: string, id: string) {
    const removed = await this.repository.softDelete(userId, id)
    if (!removed) throw this.notFound()
    return { id, undoToken: encodeFinanceUndo({ type: 'transaction', id }) }
  }

  // Aparte de la forma (que ya validó Zod), revisa que todo lo que el movimiento nombra EXISTA y sea de esta
  // persona (cuenta, categoría del tipo correcto, ahorro, deuda: un id ajeno es un "no existe", nunca un
  // "no tienes permiso") y que no se retire más de lo ahorrado ni se pague de más una deuda. Lo que no aplica
  // al tipo del movimiento se guarda como nulo. `ignoreId` deja fuera de las cuentas al movimiento que se está
  // corrigiendo, para que no cuente contra sí mismo.
  private async resolve(userId: string, input: TransactionInput, ignoreId: string | null): Promise<NewTransaction> {
    const isCategorized = input.kind === 'expense' || input.kind === 'income'
    const isSaving = input.kind === 'saving_deposit' || input.kind === 'saving_withdrawal'
    const isDebt = input.kind === 'debt_payment'

    if (input.cardId !== null && !(await this.cardsRepository.findOne(userId, input.cardId))) {
      throw new BadRequestException({ code: 'CARD_NOT_FOUND', message: 'Elige una cuenta.' })
    }

    if (isCategorized) {
      const category = input.categoryId ? await this.categoriesRepository.findOne(userId, input.categoryId) : undefined
      // El tipo de la categoría (gasto / ingreso) se llama igual que el del movimiento.
      if (!category || category.kind !== input.kind) {
        throw new BadRequestException({ code: 'CATEGORY_INVALID', message: 'Elige una categoría.' })
      }
    }

    if (isSaving) {
      const saving = input.savingId ? await this.savingsRepository.findOne(userId, input.savingId) : undefined
      if (!saving) throw new BadRequestException({ code: 'SAVING_NOT_FOUND', message: 'Elige a qué ahorro va.' })
      if (input.kind === 'saving_withdrawal') {
        const available = await this.repository.savedOf(userId, saving.id, ignoreId)
        if (input.amountCents > available) {
          throw new BadRequestException({ code: 'SAVING_INSUFFICIENT', message: `Solo tienes ${formatMoney(available)} en ese ahorro.` })
        }
      }
    }

    if (isDebt) {
      const debt = input.debtId ? await this.debtsRepository.findOne(userId, input.debtId) : undefined
      if (!debt) throw new BadRequestException({ code: 'DEBT_NOT_FOUND', message: 'Elige qué deuda pagas.' })
      const remaining = debt.totalCents - (await this.repository.paidOf(userId, debt.id, ignoreId))
      if (input.amountCents > remaining) {
        throw new BadRequestException({ code: 'DEBT_OVERPAID', message: `Solo te faltan ${formatMoney(Math.max(0, remaining))} de esa deuda.` })
      }
    }

    return {
      kind: input.kind,
      amountCents: input.amountCents,
      currency: FINANCE_CURRENCY,
      concept: input.concept,
      note: input.note,
      occurredOn: input.occurredOn,
      categoryId: isCategorized ? input.categoryId : null,
      cardId: input.cardId,
      savingId: isSaving ? input.savingId : null,
      debtId: isDebt ? input.debtId : null,
      repeatMonthly: input.repeatMonthly,
    }
  }

  private notFound() {
    return new NotFoundException({ code: 'TRANSACTION_NOT_FOUND', message: 'No encontramos ese movimiento.' })
  }
}
