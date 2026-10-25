import { Body, Controller, Delete, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import {
  eraCreateSchema,
  type EraUpdateInput,
  eraUpdateSchema,
  type EventCreateInput,
  eventCreateSchema,
  type EventUpdateInput,
  eventUpdateSchema,
  type MoveInput,
  moveSchema,
} from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { TimelineService } from './timeline.service'

const uuid = () => new ParseUUIDPipe()

// La línea del tiempo: eras (crear, editar, mover, borrar/deshacer) y sus eventos.
@Controller('writings')
export class TimelineController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(TimelineService) private readonly timelineService: TimelineService) {}

  @Post('worlds/:worldId/eras')
  createEra(@CurrentUser() userId: string, @Param('worldId', uuid()) worldId: string, @Body(new ZodValidationPipe(eraCreateSchema)) body: { name: string }) {
    return this.timelineService.createEra(userId, worldId, body.name)
  }

  @Patch('eras/:id')
  updateEra(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(eraUpdateSchema)) body: EraUpdateInput) {
    return this.timelineService.updateEra(userId, id, body)
  }

  @Post('eras/:id/move')
  @HttpCode(204)
  async moveEra(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(moveSchema)) body: MoveInput) {
    await this.timelineService.moveEra(userId, id, body)
  }

  @Delete('eras/:id')
  @HttpCode(204)
  async deleteEra(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    await this.timelineService.deleteEra(userId, id)
  }

  @Post('eras/:id/restore')
  @HttpCode(204)
  async restoreEra(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    await this.timelineService.restoreEra(userId, id)
  }

  @Post('events')
  createEvent(@CurrentUser() userId: string, @Body(new ZodValidationPipe(eventCreateSchema)) body: EventCreateInput) {
    return this.timelineService.createEvent(userId, body)
  }

  @Patch('events/:id')
  updateEvent(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(eventUpdateSchema)) body: EventUpdateInput) {
    return this.timelineService.updateEvent(userId, id, body)
  }

  @Post('events/:id/move')
  @HttpCode(204)
  async moveEvent(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(moveSchema)) body: MoveInput) {
    await this.timelineService.moveEvent(userId, id, body)
  }

  @Delete('events/:id')
  @HttpCode(204)
  async deleteEvent(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    await this.timelineService.deleteEvent(userId, id)
  }

  @Post('events/:id/restore')
  @HttpCode(204)
  async restoreEvent(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    await this.timelineService.restoreEvent(userId, id)
  }
}
