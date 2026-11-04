import { Inject, Injectable } from '@nestjs/common'
import { chargesOn, FALLBACK_CATEGORY_KEY } from '@kairo/shared'
import { AccountService } from '../../account/account.service'
import { NotificationsService } from '../notifications/notifications.service'
import { CategoriesRepository } from './categories.repository'
import { addDays, firstOfNextMonth, formatMoney, monthStartOf, spentPerCategory, todayIn } from './finance-utils'
import { MembershipsRepository } from './memberships.repository'
import { SettingsRepository } from './settings.repository'
import { TransactionsRepository } from './transactions.repository'

type Membership = Awaited<ReturnType<MembershipsRepository['findActiveOfEveryone']>>[number]

// API pública de Finanzas para las tareas programadas (src/jobs). Corre una vez al día, para todas las personas;
// "hoy" es el día en la zona horaria de cada perfil. Todo es idempotente: correrlo dos veces el mismo día no anota
// dos cobros ni manda dos avisos.
@Injectable()
export class FinanceJobs {
  constructor(
    @Inject(MembershipsRepository) private readonly membershipsRepository: MembershipsRepository,
    @Inject(TransactionsRepository) private readonly transactionsRepository: TransactionsRepository,
    @Inject(CategoriesRepository) private readonly categoriesRepository: CategoriesRepository,
    @Inject(SettingsRepository) private readonly settingsRepository: SettingsRepository,
    @Inject(AccountService) private readonly accountService: AccountService,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  async runDaily(now = new Date()) {
    const timezones = new Map<string, string | null>()
    // La zona de cada persona, una sola vez por vuelta. null = sin perfil (no debería pasar; se salta).
    const todayOf = async (userId: string) => {
      if (!timezones.has(userId)) {
        const timezone = await this.accountService
          .getMe(userId)
          .then(({ profile }) => profile.timezone)
          .catch(() => null)
        timezones.set(userId, timezone)
      }
      const timezone = timezones.get(userId)
      return timezone ? todayIn(timezone, now) : null
    }

    const memberships = await this.membershipsRepository.findActiveOfEveryone()
    let charged = 0
    let upcoming = 0
    for (const membership of memberships) {
      const today = await todayOf(membership.userId)
      if (!today) continue
      if (chargesOn(membership, today) && (await this.chargeMembership(membership, today))) charged++
      if (membership.notify && chargesOn(membership, addDays(today, 1)) && (await this.notifyTomorrowCharge(membership, addDays(today, 1)))) upcoming++
    }

    let budget = 0
    for (const userId of await this.categoriesRepository.usersWithLimits()) {
      const today = await todayOf(userId)
      if (today) budget += await this.budgetAlerts(userId, today, now)
    }

    return { charged, upcoming, budget }
  }

  // Decisión #40: el cobro de una membresía se anota solo como gasto el día que toca, en "Membresías" (o "Otros" si la
  // persona la borró). Si ya se anotó (o se anotó y la persona lo borró), nada.
  private async chargeMembership(membership: Membership, today: string): Promise<boolean> {
    if (await this.transactionsRepository.hasMembershipCharge(membership.userId, membership.id, today)) return false
    const category =
      (await this.categoriesRepository.findByKey(membership.userId, 'memberships')) ??
      (await this.categoriesRepository.findByKey(membership.userId, FALLBACK_CATEGORY_KEY))
    await this.transactionsRepository.createMembershipCharge(membership.userId, membership.id, {
      kind: 'expense',
      amountCents: membership.amountCents,
      currency: membership.currency,
      concept: membership.name,
      note: '',
      occurredOn: today,
      categoryId: category?.id ?? null,
      cardId: membership.cardId,
      savingId: null,
      debtId: null,
      repeatMonthly: false,
    })
    return true
  }

  private notifyTomorrowCharge(membership: Membership, tomorrow: string) {
    return this.notificationsService.notify(membership.userId, {
      title: `Mañana se cobra ${membership.name}`,
      body: `${formatMoney(membership.amountCents, membership.currency)} de tu membresía.`,
      link: '/finanzas/membresias',
      sourceType: 'membership',
      sourceId: membership.id,
      dedupeKey: `membership:${membership.id}:${tomorrow}`,
    })
  }

  // Los dos avisos del presupuesto (finance_settings; sin fila, los dos prendidos). Uno por categoría y por mes: la
  // clave lleva el mes, así el mes siguiente vuelve a avisar. Si ya se pasó, solo se avisa eso (el del 80% sobra).
  private async budgetAlerts(userId: string, today: string, now: Date): Promise<number> {
    const settings = await this.settingsRepository.find(userId)
    const at80 = settings?.budgetAlertAt80 ?? true
    const over = settings?.budgetAlertOver ?? true
    if (!at80 && !over) return 0

    const [live, spent] = await Promise.all([
      this.categoriesRepository.findLive(userId),
      this.transactionsRepository.spentByCategory(userId, monthStartOf(today), firstOfNextMonth(today)),
    ])
    const spentBy = spentPerCategory(live, spent, FALLBACK_CATEGORY_KEY)
    const month = today.slice(0, 7)

    let sent = 0
    for (const category of live) {
      const limit = category.monthlyLimitCents
      const cents = spentBy.get(category.id) ?? 0
      if (category.kind !== 'expense' || !limit || cents < limit * 0.8) continue
      const isOver = cents > limit
      if (isOver ? !over : !at80) continue
      const created = await this.notificationsService.notify(
        userId,
        {
          title: isOver ? `Te pasaste del presupuesto de ${category.name}` : `Llevas el 80% de ${category.name}`,
          body: `${formatMoney(cents)} de ${formatMoney(limit)} este mes.`,
          link: '/finanzas/presupuesto',
          sourceType: 'budget',
          sourceId: category.id,
          dedupeKey: `${isOver ? 'budgetOver' : 'budget80'}:${category.id}:${month}`,
        },
        now,
      )
      if (created) sent++
    }
    return sent
  }
}
