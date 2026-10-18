import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common'
import {
  type CreateReminderInput,
  createReminderSchema,
  type SnoozeReminderInput,
  snoozeReminderSchema,
} from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { RemindersService } from './reminders.service'

@Controller('reminders')
export class RemindersController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(RemindersService) private readonly remindersService: RemindersService) {}

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.remindersService.findAll(userId)
  }

  @Post()
  create(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(createReminderSchema)) body: CreateReminderInput,
  ) {
    return this.remindersService.create(userId, body)
  }

  @Post(':id/complete')
  complete(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.remindersService.complete(userId, id)
  }

  @Post(':id/uncomplete')
  uncomplete(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.remindersService.uncomplete(userId, id)
  }

  @Post(':id/snooze')
  snooze(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(snoozeReminderSchema)) body: SnoozeReminderInput,
  ) {
    return this.remindersService.snooze(userId, id, body)
  }

  @Post(':id/unsnooze')
  unsnooze(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.remindersService.unsnooze(userId, id)
  }
}
