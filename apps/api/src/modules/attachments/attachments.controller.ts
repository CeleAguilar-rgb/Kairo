import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common'
import {
  confirmAttachmentUploadSchema,
  type ConfirmAttachmentUploadInput,
  signAttachmentUploadSchema,
  type SignAttachmentUploadInput,
} from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { AttachmentsService } from './attachments.service'

@Controller('projects/:projectId/attachments')
export class AttachmentsController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(
    @Inject(AttachmentsService)
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Get()
  list(
    @CurrentUser() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ) {
    return this.attachmentsService.list(userId, projectId)
  }

  @Post('sign-upload')
  signUpload(
    @CurrentUser() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body(new ZodValidationPipe(signAttachmentUploadSchema))
    body: SignAttachmentUploadInput,
  ) {
    return this.attachmentsService.signUpload(userId, projectId, body)
  }

  @Post('confirm')
  confirmUpload(
    @CurrentUser() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body(new ZodValidationPipe(confirmAttachmentUploadSchema))
    body: ConfirmAttachmentUploadInput,
  ) {
    return this.attachmentsService.confirmUpload(
      userId,
      projectId,
      body.path,
      body.name,
    )
  }

  @Get(':id/download')
  download(
    @CurrentUser() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.attachmentsService.downloadUrl(userId, projectId, id)
  }

  @Delete(':id')
  remove(
    @CurrentUser() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.attachmentsService.remove(userId, projectId, id)
  }

  @Post(':id/restore')
  restore(
    @CurrentUser() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.attachmentsService.restore(userId, projectId, id)
  }
}
