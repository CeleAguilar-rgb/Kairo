import { Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common'
import { isoDateSchema, journalEntrySchema } from '@kairo/shared'
import { z } from 'zod'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { JournalService } from './journal.service'

// summary ("Tu día en resumen") no se comparte con el formulario: lo arma journal-actions.ts con el
// avance real de la rutina de hoy (mezclado con los extras que siguen de ejemplo, decisión #39), la
// pantalla del Diario no lo pide ni lo ve.
const saveSchema = journalEntrySchema.and(z.object({ summary: z.array(z.string()).max(10) }))

@Controller('journal-entries')
export class JournalController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(JournalService) private readonly journalService: JournalService) {}

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.journalService.findAll(userId)
  }

  @Post()
  save(@CurrentUser() userId: string, @Body(new ZodValidationPipe(saveSchema)) body: z.infer<typeof saveSchema>) {
    return this.journalService.save(userId, body)
  }

  @Delete(':date')
  delete(@CurrentUser() userId: string, @Param('date', new ZodValidationPipe(isoDateSchema)) date: string) {
    return this.journalService.delete(userId, date)
  }
}
