import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common'
import {
  type CreateTaskInput,
  createTaskSchema,
  type UpdateTaskStatusInput,
  updateTaskStatusSchema,
} from '@kairo/shared'
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

  // Una subtarea es una fila de tasks como cualquier otra: el mismo PATCH
  // mueve una tarea en el tablero, la marca hecha desde el detalle, o
  // alterna una subtarea (se le manda su propio id).
  @Patch(':id')
  updateStatus(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) taskId: string,
    @Body(new ZodValidationPipe(updateTaskStatusSchema)) body: UpdateTaskStatusInput,
  ) {
    return this.tasksService.setStatus(userId, taskId, body.status)
  }

  // DELETE manda a la papelera (conventions.md), nunca borra de verdad.
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) taskId: string,
  ) {
    await this.tasksService.delete(userId, taskId)
  }

  @Post(':id/restore')
  restore(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) taskId: string,
  ) {
    return this.tasksService.restore(userId, taskId)
  }
}
