import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { NOTIFICATION_DAYS, type PushSubscriptionInput } from '@kairo/shared'
import webpush from 'web-push'
import { AccountService } from '../../account/account.service'
import { env } from '../../common/env'
import { type NewNotification, NotificationsRepository } from './notifications.repository'
import { isQuietTime } from './quiet-hours'

type NotificationRow = Awaited<ReturnType<NotificationsRepository['findSince']>>[number]

const DAY_MS = 24 * 60 * 60 * 1000

// Web Push solo si están las tres variables (env.ts). Sin ellas, los avisos salen solo en el panel.
const pushReady = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT)
if (pushReady) webpush.setVapidDetails(env.VAPID_SUBJECT!, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!)

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    @Inject(NotificationsRepository) private readonly repository: NotificationsRepository,
    // La zona horaria y las horas de silencio del perfil (para no mandar push de noche).
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {}

  // El panel de avisos: los de las últimas dos semanas y cuántos faltan por leer.
  async list(userId: string, now = new Date()) {
    const [rows, unread] = await Promise.all([this.repository.findSince(userId, new Date(now.getTime() - NOTIFICATION_DAYS * DAY_MS)), this.repository.countUnread(userId)])
    return { items: rows.map(toNotification), unread }
  }

  markAllRead(userId: string) {
    return this.repository.markAllRead(userId)
  }

  async markRead(userId: string, id: string) {
    if (!(await this.repository.markRead(userId, id))) {
      throw new NotFoundException({ code: 'NOTIFICATION_NOT_FOUND', message: 'No encontramos ese aviso.' })
    }
  }

  subscribe(userId: string, input: PushSubscriptionInput, userAgent: string | null) {
    return this.repository.upsertSubscription(userId, input, userAgent?.slice(0, 300) ?? null)
  }

  unsubscribe(userId: string, endpoint: string) {
    return this.repository.deleteSubscription(userId, endpoint)
  }

  // API pública para las tareas programadas: crea el aviso UNA vez (por `dedupeKey`) y, si se creó y no es hora de
  // silencio, lo manda también a los navegadores donde la persona activó los avisos. Devuelve si se creó.
  async notify(userId: string, input: NewNotification, now = new Date()): Promise<boolean> {
    const row = await this.repository.insertOnce(userId, input)
    if (!row) return false
    if (!pushReady) return true
    const { profile } = await this.accountService.getMe(userId)
    if (isQuietTime(now, profile.timezone, profile.quietFrom, profile.quietTo)) return true
    await this.push(userId, { title: input.title, body: input.body ?? '', link: input.link ?? '/' })
    return true
  }

  // "Mejor esfuerzo": si el servicio de push falla, el aviso ya quedó en el panel. Una suscripción que el servicio
  // da por muerta (404/410: la persona quitó el permiso o borró el navegador) se borra.
  private async push(userId: string, payload: { title: string; body: string; link: string }) {
    const subscriptions = await this.repository.subscriptionsOf(userId)
    const gone: string[] = []
    const used: string[] = []
    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload), { TTL: 60 * 60 })
          used.push(subscription.id)
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) gone.push(subscription.id)
          else this.logger.warn(`No se pudo mandar un push (${status ?? 'sin respuesta'}).`)
        }
      }),
    )
    await this.repository.deleteSubscriptionsById(gone)
    await this.repository.markSubscriptionsUsed(used)
  }
}

function toNotification(row: NotificationRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    link: row.link,
    sourceType: row.sourceType,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
  }
}
