import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import {
  type ConfirmCoverUploadInput,
  confirmCoverUploadSchema,
  type SignCoverUploadInput,
  signCoverUploadSchema,
  templateCreateSchema,
  type TemplateUpdateInput,
  templateUpdateSchema,
  type WorldInput,
  worldSchema,
  type WorldUpdateInput,
  worldUpdateSchema,
} from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { WorldsService } from './worlds.service'

// Mundos, sus plantillas y la biblioteca completa de Escritos. El userId sale siempre del token (@CurrentUser) y
// los ids de la ruta se validan como uuid antes de llegar al service.
@Controller('writings')
export class WorldsController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(WorldsService) private readonly worldsService: WorldsService) {}

  // Todo lo de Escritos menos el contenido de capítulos y fichas: el Next.js arma cada pestaña con esto.
  @Get('library')
  library(@CurrentUser() userId: string) {
    return this.worldsService.library(userId)
  }

  @Post('worlds')
  createWorld(@CurrentUser() userId: string, @Body(new ZodValidationPipe(worldSchema)) body: WorldInput) {
    return this.worldsService.createWorld(userId, body)
  }

  @Patch('worlds/:id')
  updateWorld(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body(new ZodValidationPipe(worldUpdateSchema)) body: WorldUpdateInput) {
    return this.worldsService.updateWorld(userId, id, body)
  }

  // DELETE manda a la papelera (conventions.md), nunca borra de verdad; restore es su "Deshacer".
  @Delete('worlds/:id')
  @HttpCode(204)
  async deleteWorld(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.worldsService.deleteWorld(userId, id)
  }

  @Post('worlds/:id/restore')
  @HttpCode(204)
  async restoreWorld(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.worldsService.restoreWorld(userId, id)
  }

  @Post('worlds/:id/map/sign-upload')
  signMap(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body(new ZodValidationPipe(signCoverUploadSchema)) body: SignCoverUploadInput) {
    return this.worldsService.signMapUpload(userId, id, body)
  }

  @Post('worlds/:id/map/confirm')
  confirmMap(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body(new ZodValidationPipe(confirmCoverUploadSchema)) body: ConfirmCoverUploadInput) {
    return this.worldsService.confirmMapUpload(userId, id, body.path)
  }

  // --- Plantillas ------------------------------------------------------------------------------------------

  // "Nueva sección": una plantilla extra del mundo, con su pestaña.
  @Post('worlds/:id/templates')
  createSection(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body(new ZodValidationPipe(templateCreateSchema)) body: { name: string }) {
    return this.worldsService.createSection(userId, id, body.name)
  }

  @Patch('templates/:id')
  updateTemplate(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body(new ZodValidationPipe(templateUpdateSchema)) body: TemplateUpdateInput) {
    return this.worldsService.updateTemplate(userId, id, body)
  }

  @Delete('templates/:id')
  @HttpCode(204)
  async deleteTemplate(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.worldsService.deleteTemplate(userId, id)
  }

  @Post('templates/:id/restore')
  @HttpCode(204)
  async restoreTemplate(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.worldsService.restoreTemplate(userId, id)
  }
}
