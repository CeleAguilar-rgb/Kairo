import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common'
import { type CreateTaskInput, createTaskSchema } from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { TasksService } from './tasks.service'

@Controller('tasks')
export class TasksController {
  // @Inject() explícito: mismo motivo que en account.controller.ts.
  constructor(@Inject(TasksService) private readonly tasksService: TasksService) {}

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.tasksService.findAll(userId)
  }

  @Post()
  create(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(createTaskSchema)) body: CreateTaskInput,
  ) {
    return this.tasksService.create(userId, body)
  }

  // Acción que no es CRUD (conventions.md): POST .../complete, no un PATCH
  // genérico de status.
  @Post(':id/complete')
  complete(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) taskId: string,
  ) {
    return this.tasksService.complete(userId, taskId)
  }
}
