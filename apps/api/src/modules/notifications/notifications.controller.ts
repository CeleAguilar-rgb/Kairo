import { Body, Controller, Delete, Get, Headers, HttpCode, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common'
import { type PushSubscriptionInput, pushSubscriptionSchema, type PushUnsubscribeInput, pushUnsubscribeSchema } from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { NotificationsService } from './notifications.service'

// El panel de avisos (Atajos.dc.html) y activar los avisos en el navegador (Web Push).
@Controller('notifications')
export class NotificationsController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(NotificationsService) private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.notificationsService.list(userId)
  }

  // "Marcar todo como leído".
  @Post('read-all')
  @HttpCode(204)
  async markAllRead(@CurrentUser() userId: string) {
    await this.notificationsService.markAllRead(userId)
  }

  // Picar un aviso lo marca leído.
  @Post(':id/read')
  @HttpCode(204)
  async markRead(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.notificationsService.markRead(userId, id)
  }

  @Post('push-subscriptions')
  @HttpCode(204)
  async subscribe(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(pushSubscriptionSchema)) body: PushSubscriptionInput,
    @Headers('user-agent') userAgent: string | undefined,
  ) {
    await this.notificationsService.subscribe(userId, body, userAgent ?? null)
  }

  @Delete('push-subscriptions')
  @HttpCode(204)
  async unsubscribe(@CurrentUser() userId: string, @Body(new ZodValidationPipe(pushUnsubscribeSchema)) body: PushUnsubscribeInput) {
    await this.notificationsService.unsubscribe(userId, body.endpoint)
  }
}
