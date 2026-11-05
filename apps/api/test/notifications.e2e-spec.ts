import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { AppModule } from '../src/app.module.js'
import { DB } from '../src/common/db/db.module.js'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js'
import { profiles } from '../src/db/schema/_shared.js'
import { NotificationsService } from '../src/modules/notifications/notifications.service.js'
import { createTestUser, deleteTestUser, type TestUser } from './helpers/test-users.js'

function authHeader(user: TestUser) {
  return { Authorization: `Bearer ${user.accessToken}` }
}

// Mismo motivo que account.e2e-spec.ts: crear usuarios reales tarda más que el timeout default.
jest.setTimeout(30000)

type NotificationJson = { id: string; title: string; body: string | null; link: string | null; sourceType: string; createdAt: string; readAt: string | null }
type PanelJson = { items: NotificationJson[]; unread: number }

const subscription = (endpoint = 'https://push.example.com/abc') => ({ endpoint, keys: { p256dh: 'BPk3', auth: 'x9' } })

// Los avisos los crean las tareas programadas, no la persona: aquí se crean llamando a `notify()` directo, para dos
// usuarios de prueba (nunca para la cuenta real). Las tareas programadas en sí (que recorren a todas las personas) no
// se corren aquí: ver jobs.e2e-spec.ts.
describe('Avisos (e2e)', () => {
  let app: INestApplication
  let db: PostgresJsDatabase
  let notifications: NotificationsService
  let userA: TestUser
  let userB: TestUser

  const get = (user: TestUser, url: string) => request(app.getHttpServer()).get(url).set(authHeader(user))
  const post = (user: TestUser, url: string, body: unknown = {}) => request(app.getHttpServer()).post(url).set(authHeader(user)).send(body as object)
  const del = (user: TestUser, url: string, body: unknown = {}) => request(app.getHttpServer()).delete(url).set(authHeader(user)).send(body as object)
  const panel = async (user: TestUser) => (await get(user, '/v1/notifications').expect(200)).body as PanelJson
  const notify = (user: TestUser, dedupeKey: string, title = 'Tomar agua') =>
    notifications.notify(user.id, { title, body: null, link: '/recordatorios', sourceType: 'reminder', sourceId: null, dedupeKey })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('v1')
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()

    db = moduleRef.get(DB)
    notifications = moduleRef.get(NotificationsService)
    userA = await createTestUser()
    userB = await createTestUser()
    await post(userA, '/v1/me/onboarding', { name: 'Ana', avatarPath: 'star', sections: ['reminders'] }).expect(201)
    await post(userB, '/v1/me/onboarding', { name: 'Beto', avatarPath: 'moon', sections: ['reminders'] }).expect(201)
  })

  afterAll(async () => {
    await db.delete(profiles).where(eq(profiles.id, userA.id))
    await db.delete(profiles).where(eq(profiles.id, userB.id))
    await deleteTestUser(userA.id)
    await deleteTestUser(userB.id)
    await app.close()
    await db.$client.end()
  })

  it('rechaza peticiones sin token', async () => {
    await request(app.getHttpServer()).get('/v1/notifications').expect(401)
  })

  it('un aviso con la misma clave se crea una sola vez', async () => {
    expect(await notify(userA, 'test:uno')).toBe(true)
    expect(await notify(userA, 'test:uno')).toBe(false)

    const { items, unread } = await panel(userA)
    expect(items.filter((item) => item.title === 'Tomar agua')).toHaveLength(1)
    expect(unread).toBe(1)
    expect(items[0]).toEqual({
      id: expect.any(String),
      title: 'Tomar agua',
      body: null,
      link: '/recordatorios',
      sourceType: 'reminder',
      createdAt: expect.any(String),
      readAt: null,
    })
  })

  it('la misma clave en otra persona es otro aviso, y nadie ve los de otra', async () => {
    expect(await notify(userB, 'test:uno', 'Aviso de Beto')).toBe(true)
    expect((await panel(userA)).items.map((item) => item.title)).not.toContain('Aviso de Beto')
    expect((await panel(userB)).items.map((item) => item.title)).toEqual(['Aviso de Beto'])
  })

  it('marcar un aviso leído solo funciona con los propios', async () => {
    const [item] = (await panel(userB)).items
    await post(userA, `/v1/notifications/${item!.id}/read`).expect(404)
    expect((await panel(userB)).unread).toBe(1)

    await post(userB, `/v1/notifications/${item!.id}/read`).expect(204)
    const after = await panel(userB)
    expect(after.unread).toBe(0)
    expect(after.items[0]!.readAt).not.toBeNull()
  })

  it('"Marcar todo como leído" no toca los de otra persona', async () => {
    await notify(userA, 'test:dos', 'Otro aviso')
    await notify(userB, 'test:dos', 'Otro de Beto')
    await post(userA, '/v1/notifications/read-all').expect(204)

    expect((await panel(userA)).unread).toBe(0)
    expect((await panel(userB)).unread).toBe(1)
  })

  it('rechaza un id que no es uuid', async () => {
    await post(userA, '/v1/notifications/no-es-uuid/read').expect(400)
  })

  it('activar los avisos del navegador valida la suscripción y no la duplica', async () => {
    await post(userA, '/v1/notifications/push-subscriptions', { endpoint: 'http://push.example.com/x', keys: { p256dh: 'a', auth: 'b' } }).expect(400)
    await post(userA, '/v1/notifications/push-subscriptions', { endpoint: 'https://push.example.com/x' }).expect(400)

    await post(userA, '/v1/notifications/push-subscriptions', subscription()).expect(204)
    await post(userA, '/v1/notifications/push-subscriptions', { ...subscription(), keys: { p256dh: 'nueva', auth: 'otra' } }).expect(204)
    // La misma dirección en otra persona es otra suscripción (índice único por persona y endpoint).
    await post(userB, '/v1/notifications/push-subscriptions', subscription()).expect(204)

    const rows = await db.$client`select user_id, p256dh from app.push_subscriptions where endpoint = ${subscription().endpoint} and user_id in (${userA.id}, ${userB.id})`
    expect(rows).toHaveLength(2)
    expect(rows.find((row) => row.user_id === userA.id)?.p256dh).toBe('nueva')
  })

  it('desactivarlos solo borra la suscripción propia', async () => {
    await del(userA, '/v1/notifications/push-subscriptions', { endpoint: subscription().endpoint }).expect(204)
    const rows = await db.$client`select user_id from app.push_subscriptions where endpoint = ${subscription().endpoint} and user_id in (${userA.id}, ${userB.id})`
    expect(rows.map((row) => row.user_id)).toEqual([userB.id])
    // Se quita también la de Beto: con VAPID configurado, un aviso nuevo intentaría mandarle un push de verdad.
    await del(userB, '/v1/notifications/push-subscriptions', { endpoint: subscription().endpoint }).expect(204)
  })
})
