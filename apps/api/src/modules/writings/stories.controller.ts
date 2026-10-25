import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'
import {
  type ChapterMetaInput,
  chapterMetaSchema,
  type PageCreateInput,
  pageCreateSchema,
  type PageSaveInput,
  pageSaveSchema,
  type StoryCreateInput,
  storyCreateSchema,
  type StoryUpdateInput,
  storyUpdateSchema,
  writingDaysQuerySchema,
} from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { StoriesService } from './stories.service'

const uuid = () => new ParseUUIDPipe()

// Historias y cuadernos, sus páginas (el editor guarda solo mientras se escribe) y las palabras de cada día.
@Controller('writings')
export class StoriesController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(StoriesService) private readonly storiesService: StoriesService) {}

  @Post('stories')
  createStory(@CurrentUser() userId: string, @Body(new ZodValidationPipe(storyCreateSchema)) body: StoryCreateInput) {
    return this.storiesService.createStory(userId, body)
  }

  @Patch('stories/:id')
  updateStory(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(storyUpdateSchema)) body: StoryUpdateInput) {
    return this.storiesService.updateStory(userId, id, body)
  }

  @Delete('stories/:id')
  @HttpCode(204)
  async deleteStory(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    await this.storiesService.deleteStory(userId, id)
  }

  @Post('stories/:id/restore')
  @HttpCode(204)
  async restoreStory(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    await this.storiesService.restoreStory(userId, id)
  }

  @Post('pages')
  createPage(@CurrentUser() userId: string, @Body(new ZodValidationPipe(pageCreateSchema)) body: PageCreateInput) {
    return this.storiesService.createPage(userId, body)
  }

  @Get('pages/:id')
  getPage(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    return this.storiesService.getPage(userId, id)
  }

  @Patch('pages/:id')
  savePage(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(pageSaveSchema)) body: PageSaveInput) {
    return this.storiesService.savePage(userId, id, body)
  }

  @Patch('pages/:id/meta')
  setChapterMeta(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(chapterMetaSchema)) body: ChapterMetaInput) {
    return this.storiesService.setChapterMeta(userId, id, body)
  }

  @Delete('pages/:id')
  @HttpCode(204)
  async deletePage(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    await this.storiesService.deletePage(userId, id)
  }

  @Post('pages/:id/restore')
  @HttpCode(204)
  async restorePage(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    await this.storiesService.restorePage(userId, id)
  }

  // Las palabras escritas desde un día (la gráfica de la semana).
  @Get('days')
  days(@CurrentUser() userId: string, @Query(new ZodValidationPipe(writingDaysQuerySchema)) query: { from: string }) {
    return this.storiesService.listWritingDays(userId, query.from)
  }
}
