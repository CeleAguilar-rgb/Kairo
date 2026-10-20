import { Body, Controller, Delete, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common'
import {
  type DebtInput,
  debtSchema,
  type MoneyAmountInput,
  moneyAmountSchema,
  type SavingGoalInput,
  savingGoalSchema,
} from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { SavingsDebtsService } from './savings-debts.service'

@Controller('finance')
export class SavingsDebtsController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(SavingsDebtsService) private readonly savingsDebtsService: SavingsDebtsService) {}

  @Post('savings')
  createSaving(@CurrentUser() userId: string, @Body(new ZodValidationPipe(savingGoalSchema)) body: SavingGoalInput) {
    return this.savingsDebtsService.createSaving(userId, body)
  }

  @Post('savings/:id/deposit')
  deposit(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(moneyAmountSchema)) body: MoneyAmountInput,
  ) {
    return this.savingsDebtsService.moveSaving(userId, id, 'deposit', body)
  }

  @Post('savings/:id/withdraw')
  withdraw(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(moneyAmountSchema)) body: MoneyAmountInput,
  ) {
    return this.savingsDebtsService.moveSaving(userId, id, 'withdraw', body)
  }

  @Delete('savings/:id')
  deleteSaving(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.savingsDebtsService.deleteSaving(userId, id)
  }

  @Post('debts')
  createDebt(@CurrentUser() userId: string, @Body(new ZodValidationPipe(debtSchema)) body: DebtInput) {
    return this.savingsDebtsService.createDebt(userId, body)
  }

  @Post('debts/:id/pay')
  pay(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(moneyAmountSchema)) body: MoneyAmountInput,
  ) {
    return this.savingsDebtsService.payDebt(userId, id, body)
  }

  @Delete('debts/:id')
  deleteDebt(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.savingsDebtsService.deleteDebt(userId, id)
  }
}
