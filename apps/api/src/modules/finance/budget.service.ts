import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { FALLBACK_CATEGORY_KEY, type BudgetAlertsInput, type BudgetLimitInput, type CategoryInput } from '@kairo/shared'
import { AccountService } from '../../account/account.service'
import { CategoriesRepository } from './categories.repository'
import { toCategory } from './finance-mappers'
import { encodeFinanceUndo } from './finance-undo'
import { firstOfNextMonth, monthStartOf, roundUpToFiftyPesos, todayIn } from './finance-utils'
import { SettingsRepository } from './settings.repository'
import { TransactionsRepository } from './transactions.repository'

// El límite de una categoría es mensual y vale para todos los meses (`categories.monthly_limit_cents`); lo
// gastado de cada mes se calcula de los movimientos, y el estado de cada fila (ok / cerca / pasado) lo arma el
// front con eso.
@Injectable()
export class BudgetService {
  constructor(
    @Inject(CategoriesRepository) private readonly categoriesRepository: CategoriesRepository,
    @Inject(TransactionsRepository) private readonly transactionsRepository: TransactionsRepository,
    @Inject(SettingsRepository) private readonly settingsRepository: SettingsRepository,
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {}

  // Pone, cambia o quita (null) el límite mensual de una categoría de gasto.
  async setLimit(userId: string, input: BudgetLimitInput) {
    await this.categoriesRepository.ensureDefaults(userId)
    const category = await this.categoriesRepository.findOne(userId, input.categoryId)
    if (!category || category.kind !== 'expense') throw this.categoryNotFound()
    const row = await this.categoriesRepository.setLimit(userId, category.id, input.limitCents)
    if (!row) throw this.categoryNotFound()
    return toCategory(row)
  }

  // Agrega una categoría de gasto nueva, con $500 de límite para empezar (se cambia en su fila), al final de
  // las de gasto.
  async addCategory(userId: string, input: CategoryInput) {
    await this.categoriesRepository.ensureDefaults(userId)
    if (await this.categoriesRepository.nameTaken(userId, 'expense', input.name)) {
      throw new BadRequestException({ code: 'CATEGORY_NAME_TAKEN', message: 'Ya tienes una categoría con ese nombre.' })
    }
    const position = (await this.categoriesRepository.lastPosition(userId, 'expense')) + 1
    const row = await this.categoriesRepository.create(userId, {
      name: input.name,
      kind: 'expense',
      color: input.color,
      monthlyLimitCents: 50_000,
      position,
    })
    return toCategory(row)
  }

  // Borra una categoría de gasto. "Otros" no se puede borrar: es adonde van a parar los gastos de las que se
  // borran. Los movimientos NO se mueven: la categoría va a la papelera y, al leer, un gasto cuya categoría ya
  // no está se cuenta en "Otros" (records.service.ts). Así "Deshacer" es solo devolver la categoría.
  async deleteCategory(userId: string, id: string) {
    const category = await this.categoriesRepository.findOne(userId, id)
    if (!category || category.kind !== 'expense') throw this.categoryNotFound()
    if (category.key === FALLBACK_CATEGORY_KEY) {
      throw new BadRequestException({ code: 'CATEGORY_NOT_DELETABLE', message: 'Esa categoría no se puede borrar.' })
    }
    await this.categoriesRepository.softDelete(userId, id)
    return { id, undoToken: encodeFinanceUndo({ type: 'category', id }) }
  }

  // Los dos avisos del presupuesto: al llegar al 80% y al pasarse. (Los avisos de verdad llegan con las tareas
  // programadas; aquí solo se guarda la preferencia.)
  async setAlerts(userId: string, input: BudgetAlertsInput) {
    const row = await this.settingsRepository.upsertAlerts(userId, { budgetAlertAt80: input.at80, budgetAlertOver: input.overLimit })
    return { at80: row.budgetAlertAt80, overLimit: row.budgetAlertOver }
  }

  // "Usar lo real": el límite de cada categoría pasa a lo que se gastó este mes (en la zona del perfil),
  // redondeado hacia arriba a $50. Las categorías sin gasto conservan su límite. El token de "Deshacer" guarda
  // los límites de antes. Lo gastado en categorías borradas se cuenta en "Otros", igual que en la pantalla.
  async adoptActual(userId: string) {
    await this.categoriesRepository.ensureDefaults(userId)
    const { profile } = await this.accountService.getMe(userId)
    const today = todayIn(profile.timezone)

    const [live, spent] = await Promise.all([
      this.categoriesRepository.findLive(userId),
      this.transactionsRepository.spentByCategory(userId, monthStartOf(today), firstOfNextMonth(today)),
    ])

    const expenseIds = new Set(live.filter((category) => category.kind === 'expense').map((category) => category.id))
    const fallback = live.find((category) => category.key === FALLBACK_CATEGORY_KEY)
    const spentBy = new Map<string, number>()
    for (const row of spent) {
      const id = row.categoryId && expenseIds.has(row.categoryId) ? row.categoryId : fallback?.id
      if (id) spentBy.set(id, (spentBy.get(id) ?? 0) + row.cents)
    }

    const before: { id: string; limitCents: number | null }[] = []
    for (const category of live) {
      const amount = spentBy.get(category.id)
      if (category.kind !== 'expense' || !amount) continue
      before.push({ id: category.id, limitCents: category.monthlyLimitCents })
      await this.categoriesRepository.setLimit(userId, category.id, roundUpToFiftyPesos(amount))
    }

    if (before.length === 0) {
      throw new BadRequestException({ code: 'NOTHING_TO_ADOPT', message: 'Todavía no hay gastos este mes para tomar de base.' })
    }
    return { undoToken: encodeFinanceUndo({ type: 'limits', before }) }
  }

  private categoryNotFound() {
    return new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'No encontramos esa categoría.' })
  }
}
