import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { FINANCE_CURRENCY, type DebtInput, type MoneyAmountInput, type SavingGoalInput } from '@kairo/shared'
import { AccountService } from '../../account/account.service'
import { CardsRepository } from './cards.repository'
import { DebtsRepository } from './debts.repository'
import { toDebt, toSaving, toTransaction } from './finance-mappers'
import { encodeFinanceUndo } from './finance-undo'
import { firstOfNextMonth, formatMoney, todayIn } from './finance-utils'
import { SavingsRepository } from './savings.repository'
import { TransactionsRepository } from './transactions.repository'

// Ahorros y deudas no guardan un saldo: aportar, retirar y pagar crean un movimiento, y lo ahorrado y lo
// pagado se calculan de ellos (SUM). Así el Resumen, los Movimientos y esta pestaña siempre dicen lo mismo.
@Injectable()
export class SavingsDebtsService {
  constructor(
    @Inject(SavingsRepository) private readonly savingsRepository: SavingsRepository,
    @Inject(DebtsRepository) private readonly debtsRepository: DebtsRepository,
    @Inject(TransactionsRepository) private readonly transactionsRepository: TransactionsRepository,
    @Inject(CardsRepository) private readonly cardsRepository: CardsRepository,
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {}

  // --- Ahorros ----------------------------------------------------------------------------------------

  // Un ahorro nace con lo ahorrado en cero: se llena aportando.
  async createSaving(userId: string, input: SavingGoalInput) {
    const row = await this.savingsRepository.create(userId, {
      name: input.name,
      targetCents: input.targetCents,
      currency: FINANCE_CURRENCY,
      dueOn: input.dueOn,
    })
    return toSaving(row, 0)
  }

  // "Aportar" y "Retirar": un movimiento a ese ahorro, de hoy (en la zona del perfil) y de la primera cuenta de
  // débito. No se puede retirar más de lo que hay.
  async moveSaving(userId: string, id: string, direction: 'deposit' | 'withdraw', input: MoneyAmountInput) {
    const saving = await this.savingsRepository.findOne(userId, id)
    if (!saving) throw this.savingNotFound()

    if (direction === 'withdraw') {
      const available = await this.transactionsRepository.savedOf(userId, saving.id)
      if (input.amountCents > available) {
        throw new BadRequestException({ code: 'SAVING_INSUFFICIENT', message: `Solo tienes ${formatMoney(available)} en este ahorro.` })
      }
    }

    const card = await this.cardsRepository.firstDebit(userId)
    const row = await this.transactionsRepository.create(userId, {
      kind: direction === 'deposit' ? 'saving_deposit' : 'saving_withdrawal',
      amountCents: input.amountCents,
      currency: FINANCE_CURRENCY,
      concept: saving.name,
      note: '',
      occurredOn: await this.todayOf(userId),
      categoryId: null,
      cardId: card?.id ?? null,
      savingId: saving.id,
      debtId: null,
      repeatMonthly: false,
    })
    return toTransaction(row)
  }

  // Va a la papelera: el aviso trae "Deshacer".
  async deleteSaving(userId: string, id: string) {
    const removed = await this.savingsRepository.softDelete(userId, id)
    if (!removed) throw this.savingNotFound()
    return { id, undoToken: encodeFinanceUndo({ type: 'saving', id }) }
  }

  // --- Deudas -----------------------------------------------------------------------------------------

  // Con pago por mes, su próximo pago es el primer día del mes que viene.
  async createDebt(userId: string, input: DebtInput) {
    const row = await this.debtsRepository.create(userId, {
      name: input.name,
      kind: input.kind,
      totalCents: input.totalCents,
      currency: FINANCE_CURRENCY,
      annualInterestPct: input.annualInterestPct,
      monthlyPaymentCents: input.monthlyPaymentCents,
      nextPaymentOn: input.monthlyPaymentCents ? firstOfNextMonth(await this.todayOf(userId)) : null,
    })
    return toDebt(row, { paidCents: 0, lastPaymentOn: null })
  }

  // "Registrar pago": si el monto pasa de lo que falta, se paga solo lo que falta; al llegar a cero la deuda
  // queda liquidada y se avisa (`liquidated`).
  async payDebt(userId: string, id: string, input: MoneyAmountInput) {
    const debt = await this.debtsRepository.findOne(userId, id)
    if (!debt) throw this.debtNotFound()

    const remaining = debt.totalCents - (await this.transactionsRepository.paidOf(userId, debt.id))
    if (remaining <= 0) throw new BadRequestException({ code: 'DEBT_ALREADY_PAID', message: 'Esa deuda ya está pagada.' })
    const amountCents = Math.min(input.amountCents, remaining)

    const card = await this.cardsRepository.firstDebit(userId)
    const row = await this.transactionsRepository.create(userId, {
      kind: 'debt_payment',
      amountCents,
      currency: FINANCE_CURRENCY,
      concept: `Pago ${debt.name}`,
      note: '',
      occurredOn: await this.todayOf(userId),
      categoryId: null,
      cardId: card?.id ?? null,
      savingId: null,
      debtId: debt.id,
      repeatMonthly: false,
    })
    return { transaction: toTransaction(row), liquidated: amountCents >= remaining }
  }

  async deleteDebt(userId: string, id: string) {
    const removed = await this.debtsRepository.softDelete(userId, id)
    if (!removed) throw this.debtNotFound()
    return { id, undoToken: encodeFinanceUndo({ type: 'debt', id }) }
  }

  // Finanzas necesita el "hoy" de la zona del perfil; se lo pide al service de Cuenta (regla de modules.md:
  // nunca lee su tabla directo).
  private async todayOf(userId: string): Promise<string> {
    const { profile } = await this.accountService.getMe(userId)
    return todayIn(profile.timezone)
  }

  private savingNotFound() {
    return new NotFoundException({ code: 'SAVING_NOT_FOUND', message: 'No encontramos ese ahorro.' })
  }

  private debtNotFound() {
    return new NotFoundException({ code: 'DEBT_NOT_FOUND', message: 'No encontramos esa deuda.' })
  }
}
