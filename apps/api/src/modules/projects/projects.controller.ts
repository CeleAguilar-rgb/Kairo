import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import {
  type ProjectGoalDateInput,
  projectGoalDateSchema,
  type ProjectInput,
  type ProjectLinkInput,
  projectLinkSchema,
  type ProjectNotesInput,
  projectNotesSchema,
  projectSchema,
} from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { ProjectsService } from './projects.service'

@Controller('projects')
export class ProjectsController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(ProjectsService) private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.projectsService.findAll(userId)
  }

  @Post()
  create(@CurrentUser() userId: string, @Body(new ZodValidationPipe(projectSchema)) body: ProjectInput) {
    return this.projectsService.create(userId, body)
  }

  @Get(':id')
  findOne(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.projectsService.findOne(userId, id)
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(projectSchema)) body: ProjectInput,
  ) {
    return this.projectsService.update(userId, id, body)
  }

  @Patch(':id/notes')
  setNotes(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(projectNotesSchema)) body: ProjectNotesInput,
  ) {
    return this.projectsService.setNotes(userId, id, body.notes)
  }

  @Patch(':id/goal')
  setGoalDate(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(projectGoalDateSchema)) body: ProjectGoalDateInput,
  ) {
    return this.projectsService.setGoalDate(userId, id, body.goalOn)
  }

  @Post(':id/links')
  addLink(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(projectLinkSchema)) body: ProjectLinkInput,
  ) {
    return this.projectsService.addLink(userId, id, body)
  }

  @Post(':id/objectives/:objectiveId/toggle')
  toggleObjective(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('objectiveId', new ParseUUIDPipe()) objectiveId: string,
  ) {
    return this.projectsService.toggleObjective(userId, id, objectiveId)
  }
}
