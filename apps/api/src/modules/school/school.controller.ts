import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import {
  type CreateSubjectBodyInput,
  createSubjectBodySchema,
  type SubjectGradesInput,
  subjectGradesSchema,
  type TermInput,
  termSchema,
} from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { SchoolService } from './school.service'

@Controller('school')
export class SchoolController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(SchoolService) private readonly schoolService: SchoolService) {}

  @Get('terms')
  listTerms(@CurrentUser() userId: string) {
    return this.schoolService.listTerms(userId)
  }

  @Post('terms')
  createTerm(@CurrentUser() userId: string, @Body(new ZodValidationPipe(termSchema)) body: TermInput) {
    return this.schoolService.createTerm(userId, body)
  }

  @Patch('terms/:id')
  updateTerm(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(termSchema)) body: TermInput,
  ) {
    return this.schoolService.updateTerm(userId, id, body)
  }

  @Get('subjects')
  listSubjects(@CurrentUser() userId: string) {
    return this.schoolService.listSubjects(userId)
  }

  @Post('subjects')
  createSubject(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(createSubjectBodySchema)) body: CreateSubjectBodyInput,
  ) {
    return this.schoolService.createSubject(userId, body)
  }

  @Patch('subjects/:id/grades')
  setGrades(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(subjectGradesSchema)) body: SubjectGradesInput,
  ) {
    return this.schoolService.setGrades(userId, id, body)
  }

  // DELETE manda a la papelera (conventions.md), nunca borra de verdad.
  @Delete('subjects/:id')
  @HttpCode(204)
  async removeSubject(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.schoolService.deleteSubject(userId, id)
  }
}
