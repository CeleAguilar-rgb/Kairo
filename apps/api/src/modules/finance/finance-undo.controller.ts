import { Body, Controller, Inject, Post } from '@nestjs/common'
import { financeUndoTokenSchema } from '@kairo/shared'
import { z } from 'zod'
import { CurrentUser } from '../../auth/current-user.decorator.js'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { FinanceUndoService } from './finance-undo.service.js'

const undoSchema = z.object({ token: financeUndoTokenSchema })

@Controller('finance')
export class FinanceUndoController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(FinanceUndoService) private readonly financeUndoService: FinanceUndoService) {}

  @Post('undo')
  async undo(@CurrentUser() userId: string, @Body(new ZodValidationPipe(undoSchema)) body: z.infer<typeof undoSchema>) {
    await this.financeUndoService.undo(userId, body.token)
  }
}
