import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common'
import { type FocusSessionInput, focusSessionSchema, type FocusSessionsQuery, focusSessionsQuerySchema } from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { FocusService } from './focus.service'

@Controller('focus')
export class FocusController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(FocusService) private readonly focusService: FocusService) {}

  // Un tramo del pomodoro que terminó.
  @Post('sessions')
  record(@CurrentUser() userId: string, @Body(new ZodValidationPipe(focusSessionSchema)) body: FocusSessionInput) {
    return this.focusService.record(userId, body)
  }

  // Las sesiones desde un momento (los puntos de hoy y los minutos de la semana salen de aquí).
  @Get('sessions')
  list(@CurrentUser() userId: string, @Query(new ZodValidationPipe(focusSessionsQuerySchema)) query: FocusSessionsQuery) {
    return this.focusService.listSince(userId, query.from)
  }
}
