import { Body, Controller, Delete, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import { type TransactionInput, transactionSchema } from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { TransactionsService } from './transactions.service'

@Controller('finance/transactions')
export class TransactionsController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(TransactionsService) private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body(new ZodValidationPipe(transactionSchema)) body: TransactionInput) {
    return this.transactionsService.create(userId, body)
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(transactionSchema)) body: TransactionInput,
  ) {
    return this.transactionsService.update(userId, id, body)
  }

  @Delete(':id')
  delete(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.transactionsService.delete(userId, id)
  }
}
