import { Inject, Injectable } from '@nestjs/common'
import type { NotificationSource, PushSubscriptionInput } from '@kairo/shared'
import { and, count, desc, eq, gte, inArray, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module.js'
import { notifications, pushSubscriptions } from '../../db/schema/account.js'

export type NewNotification = {
  title: string
  body: string | null
  link: string | null
  sourceType: NotificationSource
  sourceId: string | null
  // El mismo aviso dos veces choca con el índice único y no se crea (ver db/schema/account.ts).
  dedupeKey: string
}

@Injectable()
export class NotificationsRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  findSince(userId: string, since: Date) {
    return this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.deletedAt), gte(notifications.createdAt, since)))
      .orderBy(desc(notifications.createdAt))
      .limit(100)
  }

  async countUnread(userId: string) {
    const [row] = await this.db
      .select({ total: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.deletedAt), isNull(notifications.readAt)))
    return row?.total ?? 0
  }

  // Devuelve la fila solo si se creó (si ya existía ese aviso, nada).
  async insertOnce(userId: string, input: NewNotification) {
    const [row] = await this.db
      .insert(notifications)
      .values({ userId, ...input })
      .onConflictDoNothing({ target: [notifications.userId, notifications.dedupeKey] })
      .returning()
    return row
  }

  async markAllRead(userId: string) {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), isNull(notifications.deletedAt)))
  }

  async markRead(userId: string, id: string) {
    const [row] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId), isNull(notifications.deletedAt)))
      .returning({ id: notifications.id })
    return row
  }

  // Activar los avisos en un navegador: si ya estaba (mismo endpoint), solo se actualizan sus llaves.
  async upsertSubscription(userId: string, input: PushSubscriptionInput, userAgent: string | null) {
    const values = { endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent, deletedAt: null, updatedAt: new Date() }
    await this.db
      .insert(pushSubscriptions)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: [pushSubscriptions.userId, pushSubscriptions.endpoint], set: values })
  }

  // Una suscripción no es contenido de la persona: desactivarla la borra de verdad (no va a la papelera).
  async deleteSubscription(userId: string, endpoint: string) {
    await this.db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
  }

  subscriptionsOf(userId: string) {
    return this.db
      .select({ id: pushSubscriptions.id, endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth })
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), isNull(pushSubscriptions.deletedAt)))
  }

  async markSubscriptionsUsed(ids: string[]) {
    if (ids.length) await this.db.update(pushSubscriptions).set({ lastUsedAt: new Date() }).where(inArray(pushSubscriptions.id, ids))
  }

  // El servicio de push dijo que esa suscripción ya no existe (404/410): se borra.
  async deleteSubscriptionsById(ids: string[]) {
    if (ids.length) await this.db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, ids))
  }
}
