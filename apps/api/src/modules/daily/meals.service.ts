import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { CopyWeekInput, MealRefInput, MealSlotInput, WeekInput } from '@kairo/shared'
import { AccountService } from '../../account/account.service'
import type { mealPlans } from '../../db/schema/daily'
import { addDays, diffDays, mondayOf, todayIn } from './daily-utils'
import { encodeDailyUndo } from './daily-undo'
import { MealsRepository } from './meals.repository'

type PlanRow = typeof mealPlans.$inferSelect

@Injectable()
export class MealsService {
  constructor(
    @Inject(MealsRepository) private readonly repository: MealsRepository,
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {}

  async findWeek(userId: string, weekStart: string) {
    const rows = await this.repository.findInRange(userId, weekStart, addDays(weekStart, 6))
    return rows.map(toMealPlan)
  }

  // dish vacío (tras trim en el schema) borra el platillo del día.
  async save(userId: string, input: MealSlotInput) {
    if (input.dish === '') {
      await this.repository.softDeleteOne(userId, input.date, input.meal)
      return null
    }
    const today = await this.todayOf(userId)
    const current = await this.repository.findOne(userId, input.date, input.meal)
    const row = await this.repository.upsert(userId, input.date, input.meal, {
      dish: input.dish,
      prep: input.prep,
      note: input.note || null,
      done: current?.done ?? input.date < today,
    })
    if (!row) throw new Error('No se pudo guardar el platillo.')
    return toMealPlan(row)
  }

  async remove(userId: string, input: MealRefInput) {
    await this.repository.softDeleteOne(userId, input.date, input.meal)
  }

  // Aplica el mismo platillo a los 5 días de esa semana (lunes a viernes), sin pisar la nota de cada día.
  async repeatWeekdays(userId: string, input: MealSlotInput) {
    if (input.dish.trim() === '') {
      throw new BadRequestException({ code: 'DISH_REQUIRED', message: 'Escribe el platillo para repetirlo.' })
    }
    const today = await this.todayOf(userId)
    const monday = mondayOf(input.date)
    const rows: PlanRow[] = []
    for (let offset = 0; offset < 5; offset++) {
      const day = addDays(monday, offset)
      const current = await this.repository.findOne(userId, day, input.meal)
      const row = await this.repository.upsert(userId, day, input.meal, {
        dish: input.dish,
        prep: input.prep,
        note: current?.note ?? null,
        done: current?.done ?? day < today,
      })
      if (row) rows.push(row)
    }
    return rows.map(toMealPlan)
  }

  async toggleDone(userId: string, input: MealRefInput) {
    const current = await this.repository.findOne(userId, input.date, input.meal)
    if (!current) throw new NotFoundException({ code: 'MEAL_NOT_FOUND', message: 'Esa comida ya no está en el menú.' })
    const row = await this.repository.setDone(userId, input.date, input.meal, !current.done)
    if (!row) throw new NotFoundException({ code: 'MEAL_NOT_FOUND', message: 'Esa comida ya no está en el menú.' })
    return toMealPlan(row)
  }

  async copyWeek(userId: string, input: CopyWeekInput) {
    const source = await this.repository.findInRange(userId, input.from, addDays(input.from, 6))
    if (source.length === 0) throw new BadRequestException({ code: 'SOURCE_WEEK_EMPTY', message: 'La semana anterior no tiene menú para copiar.' })

    const rows: PlanRow[] = []
    for (const plan of source) {
      const destDate = addDays(input.to, diffDays(input.from, plan.planDate))
      const row = await this.repository.upsert(userId, destDate, plan.meal, {
        dish: plan.dish,
        prep: plan.prep,
        note: null,
        done: false,
      })
      if (row) rows.push(row)
    }
    return rows.map(toMealPlan)
  }

  async clearWeek(userId: string, input: WeekInput) {
    const ids = await this.repository.softDeleteInRange(userId, input.week, addDays(input.week, 6))
    return { ids, undoToken: encodeDailyUndo({ type: 'mealPlans', ids }) }
  }

  async restore(userId: string, ids: string[]) {
    await this.repository.restoreMany(userId, ids)
  }

  private async todayOf(userId: string): Promise<string> {
    const { profile } = await this.accountService.getMe(userId)
    return todayIn(profile.timezone)
  }
}

// has_event no se guarda: Agenda no tiene datos reales todavía para derivarlo al leer (decisión #39),
// así que por ahora siempre va en false, igual que project en Tareas/Agenda.
function toMealPlan(row: PlanRow) {
  return {
    id: row.id,
    planDate: row.planDate,
    meal: row.meal,
    dish: row.dish,
    done: row.done,
    prep: row.prep,
    note: row.note,
    hasEvent: false,
  }
}
