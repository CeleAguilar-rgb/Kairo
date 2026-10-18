import { Body, Controller, Get, Inject, Patch, Post, Query } from '@nestjs/common'
import {
  type CopyWeekInput,
  copyWeekSchema,
  type MealRefInput,
  mealRefSchema,
  type MealSlotInput,
  mealSlotSchema,
  type WeekInput,
  weekSchema,
} from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { MealsService } from './meals.service'

@Controller('meal-plans')
export class MealsController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(MealsService) private readonly mealsService: MealsService) {}

  @Get()
  findWeek(@CurrentUser() userId: string, @Query(new ZodValidationPipe(weekSchema)) query: WeekInput) {
    return this.mealsService.findWeek(userId, query.week)
  }

  // Nest serializa un `null` suelto como cuerpo vacío (no como JSON "null"), por eso va envuelto: el
  // dish vacío borra el platillo y { plan: null } es la única forma de decirlo sin ambigüedad.
  @Patch()
  async save(@CurrentUser() userId: string, @Body(new ZodValidationPipe(mealSlotSchema)) body: MealSlotInput) {
    return { plan: await this.mealsService.save(userId, body) }
  }

  @Post('remove')
  remove(@CurrentUser() userId: string, @Body(new ZodValidationPipe(mealRefSchema)) body: MealRefInput) {
    return this.mealsService.remove(userId, body)
  }

  @Post('repeat-weekdays')
  repeatWeekdays(@CurrentUser() userId: string, @Body(new ZodValidationPipe(mealSlotSchema)) body: MealSlotInput) {
    return this.mealsService.repeatWeekdays(userId, body)
  }

  @Post('toggle-done')
  toggleDone(@CurrentUser() userId: string, @Body(new ZodValidationPipe(mealRefSchema)) body: MealRefInput) {
    return this.mealsService.toggleDone(userId, body)
  }

  @Post('copy-week')
  copyWeek(@CurrentUser() userId: string, @Body(new ZodValidationPipe(copyWeekSchema)) body: CopyWeekInput) {
    return this.mealsService.copyWeek(userId, body)
  }

  @Post('clear-week')
  clearWeek(@CurrentUser() userId: string, @Body(new ZodValidationPipe(weekSchema)) body: WeekInput) {
    return this.mealsService.clearWeek(userId, body)
  }
}
