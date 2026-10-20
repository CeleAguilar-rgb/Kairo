import { Body, Controller, Delete, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common'
import {
  type BudgetAlertsInput,
  budgetAlertsSchema,
  type BudgetLimitInput,
  budgetLimitSchema,
  type CategoryInput,
  categorySchema,
} from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { BudgetService } from './budget.service'

@Controller('finance/budget')
export class BudgetController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(BudgetService) private readonly budgetService: BudgetService) {}

  @Post('limit')
  setLimit(@CurrentUser() userId: string, @Body(new ZodValidationPipe(budgetLimitSchema)) body: BudgetLimitInput) {
    return this.budgetService.setLimit(userId, body)
  }

  @Post('categories')
  addCategory(@CurrentUser() userId: string, @Body(new ZodValidationPipe(categorySchema)) body: CategoryInput) {
    return this.budgetService.addCategory(userId, body)
  }

  @Delete('categories/:id')
  deleteCategory(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.budgetService.deleteCategory(userId, id)
  }

  @Post('alerts')
  setAlerts(@CurrentUser() userId: string, @Body(new ZodValidationPipe(budgetAlertsSchema)) body: BudgetAlertsInput) {
    return this.budgetService.setAlerts(userId, body)
  }

  @Post('adopt-actual')
  adoptActual(@CurrentUser() userId: string) {
    return this.budgetService.adoptActual(userId)
  }
}
