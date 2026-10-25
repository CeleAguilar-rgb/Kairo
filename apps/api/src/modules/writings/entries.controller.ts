import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import {
  type CharacterCreateInput,
  characterCreateSchema,
  type CharacterUpdateInput,
  characterUpdateSchema,
  type ConfirmCoverUploadInput,
  confirmCoverUploadSchema,
  type NoteCreateInput,
  noteCreateSchema,
  type NoteUpdateInput,
  noteUpdateSchema,
  type SignCoverUploadInput,
  signCoverUploadSchema,
} from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { EntriesService } from './entries.service'

const uuid = () => new ParseUUIDPipe()

// Personajes y notas del mundo (especies, lugares, secciones extra): crear, leer con su página completa, editar
// la ficha, borrar/deshacer y subir foto o portada (dos pasos con URL firmada, security.md #7).
@Controller('writings')
export class EntriesController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(EntriesService) private readonly entriesService: EntriesService) {}

  // --- Personajes -----------------------------------------------------------------------------------------

  @Post('worlds/:worldId/characters')
  createCharacter(@CurrentUser() userId: string, @Param('worldId', uuid()) worldId: string, @Body(new ZodValidationPipe(characterCreateSchema)) body: CharacterCreateInput) {
    return this.entriesService.createCharacter(userId, worldId, body.name)
  }

  @Get('characters/:id')
  getCharacter(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    return this.entriesService.getCharacter(userId, id)
  }

  @Patch('characters/:id')
  updateCharacter(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(characterUpdateSchema)) body: CharacterUpdateInput) {
    return this.entriesService.updateCharacter(userId, id, body)
  }

  @Delete('characters/:id')
  @HttpCode(204)
  async deleteCharacter(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    await this.entriesService.deleteCharacter(userId, id)
  }

  @Post('characters/:id/restore')
  @HttpCode(204)
  async restoreCharacter(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    await this.entriesService.restoreCharacter(userId, id)
  }

  @Post('characters/:id/image/sign-upload')
  signImage(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(signCoverUploadSchema)) body: SignCoverUploadInput) {
    return this.entriesService.signCharacterImage(userId, id, body)
  }

  @Post('characters/:id/image/confirm')
  confirmImage(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(confirmCoverUploadSchema)) body: ConfirmCoverUploadInput) {
    return this.entriesService.confirmCharacterImage(userId, id, body.path)
  }

  @Delete('characters/:id/image')
  removeImage(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    return this.entriesService.removeCharacterImage(userId, id)
  }

  @Post('characters/:id/cover/sign-upload')
  signCharacterCover(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(signCoverUploadSchema)) body: SignCoverUploadInput) {
    return this.entriesService.signCharacterCover(userId, id, body)
  }

  @Post('characters/:id/cover/confirm')
  confirmCharacterCover(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(confirmCoverUploadSchema)) body: ConfirmCoverUploadInput) {
    return this.entriesService.confirmCharacterCover(userId, id, body.path)
  }

  // --- Notas del mundo ---------------------------------------------------------------------------------------

  @Post('worlds/:worldId/notes')
  createNote(@CurrentUser() userId: string, @Param('worldId', uuid()) worldId: string, @Body(new ZodValidationPipe(noteCreateSchema)) body: NoteCreateInput) {
    return this.entriesService.createNote(userId, worldId, body)
  }

  @Get('notes/:id')
  getNote(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    return this.entriesService.getNote(userId, id)
  }

  @Patch('notes/:id')
  updateNote(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(noteUpdateSchema)) body: NoteUpdateInput) {
    return this.entriesService.updateNote(userId, id, body)
  }

  @Delete('notes/:id')
  @HttpCode(204)
  async deleteNote(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    await this.entriesService.deleteNote(userId, id)
  }

  @Post('notes/:id/restore')
  @HttpCode(204)
  async restoreNote(@CurrentUser() userId: string, @Param('id', uuid()) id: string) {
    await this.entriesService.restoreNote(userId, id)
  }

  @Post('notes/:id/cover/sign-upload')
  signNoteCover(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(signCoverUploadSchema)) body: SignCoverUploadInput) {
    return this.entriesService.signNoteCover(userId, id, body)
  }

  @Post('notes/:id/cover/confirm')
  confirmNoteCover(@CurrentUser() userId: string, @Param('id', uuid()) id: string, @Body(new ZodValidationPipe(confirmCoverUploadSchema)) body: ConfirmCoverUploadInput) {
    return this.entriesService.confirmNoteCover(userId, id, body.path)
  }
}
