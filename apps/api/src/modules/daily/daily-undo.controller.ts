import { Body, Controller, Inject, Post } from '@nestjs/common'
import { z } from 'zod'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { DailyUndoService } from './daily-undo.service'

const undoSchema = z.object({ token: z.string() })

@Controller('daily')
export class DailyUndoController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(DailyUndoService) private readonly dailyUndoService: DailyUndoService) {}

  @Post('undo')
  async undo(@CurrentUser() userId: string, @Body(new ZodValidationPipe(undoSchema)) body: z.infer<typeof undoSchema>) {
    await this.dailyUndoService.undo(userId, body.token)
  }
}
