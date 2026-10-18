import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import {
  type DeleteEventInput,
  deleteEventSchema,
  type EventInput,
  eventSchema,
} from '@kairo/shared'
import { z } from 'zod'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { AgendaService } from './agenda.service'

// moveEventSchema y duplicateEventSchema no se comparten con el front: la
// pantalla solo manda la fecha nueva (moveEventSchema de packages/shared) o
// nada (duplicar); occurrence (qué vez se mueve o duplica) lo agrega
// actions.ts con el dato que ya tiene, antes de llamar a la API.
const moveSchema = z.object({ date: z.iso.date(), occurrence: z.iso.date() })
const duplicateSchema = z.object({ occurrence: z.iso.date() })
const undoSchema = z.object({ token: z.string() })

@Controller('events')
export class AgendaController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(AgendaService) private readonly agendaService: AgendaService) {}

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.agendaService.findAll(userId)
  }

  @Post()
  create(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(eventSchema)) body: EventInput,
  ) {
    return this.agendaService.create(userId, body)
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(eventSchema)) body: EventInput,
  ) {
    return this.agendaService.update(userId, id, body)
  }

  @Post(':id/move')
  move(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(moveSchema)) body: z.infer<typeof moveSchema>,
  ) {
    return this.agendaService.move(userId, id, body.date, body.occurrence)
  }

  @Post(':id/duplicate')
  duplicate(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(duplicateSchema)) body: z.infer<typeof duplicateSchema>,
  ) {
    return this.agendaService.duplicate(userId, id, body.occurrence)
  }

  // POST, no DELETE: borrar aquí necesita más que el id (scope y occurrence,
  // qué tanto de la serie se borra), y REST no espera cuerpo en un DELETE.
  @Post(':id/delete')
  delete(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(deleteEventSchema)) body: DeleteEventInput,
  ) {
    return this.agendaService.delete(userId, id, body)
  }

  @Post('undo')
  undo(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(undoSchema)) body: z.infer<typeof undoSchema>,
  ) {
    return this.agendaService.undo(userId, body.token)
  }
}
