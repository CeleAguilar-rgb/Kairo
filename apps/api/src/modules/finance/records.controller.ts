import { Controller, Get, Inject, Query } from '@nestjs/common'
import { type FinanceRecordsQuery, financeRecordsQuerySchema } from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { RecordsService } from './records.service'

@Controller('finance')
export class RecordsController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(RecordsService) private readonly recordsService: RecordsService) {}

  @Get('records')
  records(@CurrentUser() userId: string, @Query(new ZodValidationPipe(financeRecordsQuerySchema)) query: FinanceRecordsQuery) {
    return this.recordsService.getRecords(userId, query.from)
  }

  @Get('memberships')
  memberships(@CurrentUser() userId: string) {
    return this.recordsService.getMemberships(userId)
  }
}
