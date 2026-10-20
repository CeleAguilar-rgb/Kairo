import { Body, Controller, Delete, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import { type CardInput, cardSchema, type MembershipInput, membershipSchema } from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { MembershipsService } from './memberships.service'

@Controller('finance')
export class MembershipsController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(MembershipsService) private readonly membershipsService: MembershipsService) {}

  @Post('memberships')
  create(@CurrentUser() userId: string, @Body(new ZodValidationPipe(membershipSchema)) body: MembershipInput) {
    return this.membershipsService.save(userId, null, body)
  }

  @Patch('memberships/:id')
  update(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(membershipSchema)) body: MembershipInput,
  ) {
    return this.membershipsService.save(userId, id, body)
  }

  @Delete('memberships/:id')
  delete(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.membershipsService.delete(userId, id)
  }

  @Post('cards')
  createCard(@CurrentUser() userId: string, @Body(new ZodValidationPipe(cardSchema)) body: CardInput) {
    return this.membershipsService.createCard(userId, body)
  }

  @Delete('cards/:id')
  deleteCard(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.membershipsService.deleteCard(userId, id)
  }
}
