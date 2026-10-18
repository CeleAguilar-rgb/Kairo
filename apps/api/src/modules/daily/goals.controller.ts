import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import {
  type AddGoalProgressInput,
  addGoalProgressSchema,
  type GoalInput,
  goalSchema,
  type MilestoneInput,
  milestoneSchema,
} from '@kairo/shared'
import { z } from 'zod'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { GoalsService } from './goals.service'

const pauseSchema = z.object({ paused: z.boolean() })

@Controller('goals')
export class GoalsController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(GoalsService) private readonly goalsService: GoalsService) {}

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.goalsService.findAll(userId)
  }

  @Post()
  create(@CurrentUser() userId: string, @Body(new ZodValidationPipe(goalSchema)) body: GoalInput) {
    return this.goalsService.create(userId, body)
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(goalSchema)) body: GoalInput,
  ) {
    return this.goalsService.update(userId, id, body)
  }

  @Delete(':id')
  delete(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.goalsService.delete(userId, id)
  }

  @Post(':id/milestones')
  addMilestone(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(milestoneSchema)) body: MilestoneInput,
  ) {
    return this.goalsService.addMilestone(userId, id, body.text)
  }

  @Post(':id/milestones/:milestoneId/toggle')
  toggleMilestone(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('milestoneId', new ParseUUIDPipe()) milestoneId: string,
  ) {
    return this.goalsService.toggleMilestone(userId, id, milestoneId)
  }

  @Post(':id/progress')
  addProgress(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(addGoalProgressSchema)) body: AddGoalProgressInput,
  ) {
    return this.goalsService.addProgress(userId, id, body.amount)
  }

  @Post(':id/achieve')
  achieve(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.goalsService.achieve(userId, id)
  }

  @Post(':id/pause')
  setPaused(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(pauseSchema)) body: z.infer<typeof pauseSchema>,
  ) {
    return this.goalsService.setPaused(userId, id, body.paused)
  }
}
