import { Inject, Injectable } from '@nestjs/common'
import { FALLBACK_CATEGORY_KEY } from '@kairo/shared'
import { CardsRepository } from './cards.repository'
import { CategoriesRepository } from './categories.repository'
import { DebtsRepository } from './debts.repository'
import { toCard, toCategory, toDebt, toMembership, toSaving, toTransaction } from './finance-mappers'
import { MembershipsRepository } from './memberships.repository'
import { SavingsRepository } from './savings.repository'
import { SettingsRepository } from './settings.repository'
import { TransactionsRepository } from './transactions.repository'

// Las lecturas de Finanzas devuelven hechos crudos (decisión #38): las filas tal cual, más lo ahorrado y lo
// pagado, que sí salen de un SUM sobre TODOS los movimientos (no solo los de la ventana). Los totales del mes,
// el presupuesto, la gráfica de 6 meses y los textos ("Aparta $760 al mes…") los arma el Next.js de en medio
// con estas filas, igual que antes de la API.
@Injectable()
export class RecordsService {
  constructor(
    @Inject(CardsRepository) private readonly cardsRepository: CardsRepository,
    @Inject(CategoriesRepository) private readonly categoriesRepository: CategoriesRepository,
    @Inject(TransactionsRepository) private readonly transactionsRepository: TransactionsRepository,
    @Inject(SavingsRepository) private readonly savingsRepository: SavingsRepository,
    @Inject(DebtsRepository) private readonly debtsRepository: DebtsRepository,
    @Inject(MembershipsRepository) private readonly membershipsRepository: MembershipsRepository,
    @Inject(SettingsRepository) private readonly settingsRepository: SettingsRepository,
  ) {}

  // Todo lo que necesitan las cinco pestañas. `from` es el primer día que interesa de los movimientos (el
  // inicio de la ventana de 6 meses de la gráfica).
  async getRecords(userId: string, from: string) {
    await this.categoriesRepository.ensureDefaults(userId)

    const [cards, archivedCards, categories, transactions, savings, debts, savedTotals, debtTotals, memberships, settings] = await Promise.all([
      this.cardsRepository.findLive(userId),
      this.cardsRepository.findArchived(userId),
      this.categoriesRepository.findLive(userId),
      this.transactionsRepository.findFrom(userId, from),
      this.savingsRepository.findLive(userId),
      this.debtsRepository.findLive(userId),
      this.transactionsRepository.savedTotals(userId),
      this.transactionsRepository.debtTotals(userId),
      this.membershipsRepository.findLive(userId),
      this.settingsRepository.find(userId),
    ])

    // Un gasto cuya categoría ya no está (se borró) se cuenta en "Otros"; un ingreso, en "Otro". Los
    // movimientos no se tocan al borrar la categoría: por eso "Deshacer" no tiene que mover nada.
    const liveIds = new Set(categories.map((category) => category.id))
    const fallbackFor = {
      expense: categories.find((category) => category.key === FALLBACK_CATEGORY_KEY)?.id ?? null,
      income: categories.find((category) => category.key === 'income-other')?.id ?? null,
    }

    return {
      cards: cards.map(toCard),
      archivedCards: archivedCards.map(toCard),
      categories: categories.map(toCategory),
      transactions: transactions.map((row) => {
        if (row.kind !== 'expense' && row.kind !== 'income') return toTransaction(row, null)
        const categoryId = row.categoryId && liveIds.has(row.categoryId) ? row.categoryId : fallbackFor[row.kind]
        return toTransaction(row, categoryId)
      }),
      savings: savings.map((row) => toSaving(row, savedTotals.get(row.id) ?? 0)),
      debts: debts.map((row) => toDebt(row, debtTotals.get(row.id) ?? { paidCents: 0, lastPaymentOn: null })),
      memberships: memberships.map(toMembership),
      budgetAlerts: { at80: settings?.budgetAlertAt80 ?? true, overLimit: settings?.budgetAlertOver ?? true },
    }
  }

  // Lo mínimo que leen Inicio ("Próximos pagos"), la Agenda y la pestaña Membresías: las membresías (activas y
  // en pausa) y las tarjetas con las que se pagan.
  async getMemberships(userId: string) {
    const [cards, memberships] = await Promise.all([this.cardsRepository.findLive(userId), this.membershipsRepository.findLive(userId)])
    return { cards: cards.map(toCard), memberships: memberships.map(toMembership) }
  }
}
