import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common'
import {
  type AddSprintTaskInput,
  addSprintTaskSchema,
  type CloseSprintInput,
  closeSprintSchema,
  type StartSprintInput,
  startSprintSchema,
} from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { SprintsService } from './sprints.service'

@Controller('projects/:projectId/sprints')
export class SprintsController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(SprintsService) private readonly sprintsService: SprintsService) {}

  @Get()
  list(@CurrentUser() userId: string, @Param('projectId', new ParseUUIDPipe()) projectId: string) {
    return this.sprintsService.list(userId, projectId)
  }

  @Post('start')
  start(
    @CurrentUser() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body(new ZodValidationPipe(startSprintSchema)) body: StartSprintInput,
  ) {
    return this.sprintsService.start(userId, projectId, body)
  }

  @Post('close')
  close(
    @CurrentUser() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body(new ZodValidationPipe(closeSprintSchema)) body: CloseSprintInput,
  ) {
    return this.sprintsService.close(userId, projectId, body)
  }

  @Post('tasks')
  addTask(
    @CurrentUser() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body(new ZodValidationPipe(addSprintTaskSchema)) body: AddSprintTaskInput,
  ) {
    return this.sprintsService.addTask(userId, projectId, body)
  }
}
