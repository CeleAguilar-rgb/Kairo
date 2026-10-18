import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { eq } from 'drizzle-orm'
// En modo ESM, más seguro importar los globals de Jest en vez de asumirlos
// como globales (recomendación oficial de Jest para tests ESM).
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { AppModule } from '../src/app.module'
import { DB } from '../src/common/db/db.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'
import { profiles } from '../src/db/schema/_shared'
import { createTestUser, deleteTestUser, type TestUser } from './helpers/test-users'

function authHeader(user: TestUser) {
  return { Authorization: `Bearer ${user.accessToken}` }
}

// Mañana a las 9, en UTC-6 (America/Mexico_City, el perfil de los usuarios de
// prueba): siempre en el futuro sin importar cuándo corra el test.
function tomorrowAt9() {
  const now = new Date()
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return { date: tomorrow.toISOString().slice(0, 10), time: '09:00' }
}

const newReminder = (overrides: Record<string, unknown> = {}) => ({
  title: 'Recordatorio de prueba',
  ...tomorrowAt9(),
  repeat: 'none',
  ...overrides,
})

// Crear 2 usuarios reales en Supabase Auth tarda más que el timeout default
// de un hook (mismo motivo que account.e2e-spec.ts).
jest.setTimeout(30000)

describe('Reminders (e2e)', () => {
  let app: INestApplication
  let db: PostgresJsDatabase
  let userA: TestUser
  let userB: TestUser

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('v1')
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()

    db = moduleRef.get(DB)
    userA = await createTestUser()
    userB = await createTestUser()

    await request(app.getHttpServer())
      .post('/v1/me/onboarding')
      .set(authHeader(userA))
      .send({ name: 'Ana', avatarPath: 'star', sections: ['reminders'] })
      .expect(201)

    await request(app.getHttpServer())
      .post('/v1/me/onboarding')
      .set(authHeader(userB))
      .send({ name: 'Beto', avatarPath: 'moon', sections: ['reminders'] })
      .expect(201)
  })

  afterAll(async () => {
    await db.delete(profiles).where(eq(profiles.id, userA.id))
    await db.delete(profiles).where(eq(profiles.id, userB.id))
    await deleteTestUser(userA.id)
    await deleteTestUser(userB.id)
    await app.close()
    // app.close() no cierra la conexión de Postgres (mismo motivo que account.e2e-spec.ts).
    await db.$client.end()
  })

  describe('crear', () => {
    it('crea un recordatorio manual, con precision y source fijos (decisión #36)', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/reminders')
        .set(authHeader(userA))
        .send(newReminder({ title: 'Cita con el dentista' }))
        .expect(201)

      expect(res.body.title).toBe('Cita con el dentista')
      expect(res.body.precision).toBe('time')
      expect(res.body.source).toEqual({ kind: 'manual', label: '' })
      expect(res.body.doneAt).toBeNull()
    })

    it('rechaza un título vacío', () => {
      return request(app.getHttpServer())
        .post('/v1/reminders')
        .set(authHeader(userA))
        .send(newReminder({ title: '' }))
        .expect(400)
    })

    it('rechaza una hora que ya pasó', () => {
      return request(app.getHttpServer())
        .post('/v1/reminders')
        .set(authHeader(userA))
        .send(newReminder({ date: '2020-01-01', time: '09:00' }))
        .expect(400)
    })
  })

  describe('aislamiento entre usuarios', () => {
    it('cada quien ve solo sus propios recordatorios', async () => {
      await request(app.getHttpServer())
        .post('/v1/reminders')
        .set(authHeader(userB))
        .send(newReminder({ title: 'Recordatorio de Beto' }))
        .expect(201)

      const resA = await request(app.getHttpServer()).get('/v1/reminders').set(authHeader(userA)).expect(200)
      const resB = await request(app.getHttpServer()).get('/v1/reminders').set(authHeader(userB)).expect(200)

      expect(resA.body.some((r: { title: string }) => r.title === 'Recordatorio de Beto')).toBe(false)
      expect(resB.body.some((r: { title: string }) => r.title === 'Recordatorio de Beto')).toBe(true)
    })

    it('no se puede completar el recordatorio de otro usuario', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/reminders')
        .set(authHeader(userA))
        .send(newReminder({ title: 'Solo de Ana' }))
        .expect(201)

      await request(app.getHttpServer())
        .post(`/v1/reminders/${created.body.id}/complete`)
        .set(authHeader(userB))
        .expect(404)
    })
  })

  describe('completar, deshacer y posponer', () => {
    it('completar quita el recordatorio de la lista de pendientes', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/reminders')
        .set(authHeader(userA))
        .send(newReminder({ title: 'Para completar' }))
        .expect(201)

      const completed = await request(app.getHttpServer())
        .post(`/v1/reminders/${created.body.id}/complete`)
        .set(authHeader(userA))
        .expect(201)
      expect(completed.body.reminder.doneAt).not.toBeNull()
      expect(completed.body.next).toBeNull()

      const list = await request(app.getHttpServer()).get('/v1/reminders').set(authHeader(userA)).expect(200)
      expect(list.body.some((r: { id: string }) => r.id === created.body.id)).toBe(false)
    })

    it('deshacer completar lo regresa a pendientes', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/reminders')
        .set(authHeader(userA))
        .send(newReminder({ title: 'Para deshacer' }))
        .expect(201)

      await request(app.getHttpServer())
        .post(`/v1/reminders/${created.body.id}/complete`)
        .set(authHeader(userA))
        .expect(201)

      await request(app.getHttpServer())
        .post(`/v1/reminders/${created.body.id}/uncomplete`)
        .set(authHeader(userA))
        .expect(201)

      const list = await request(app.getHttpServer()).get('/v1/reminders').set(authHeader(userA)).expect(200)
      expect(list.body.some((r: { id: string }) => r.id === created.body.id)).toBe(true)
    })

    it('completar uno que se repite hace nacer la siguiente vez, y deshacer la borra', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/reminders')
        .set(authHeader(userA))
        .send(newReminder({ title: 'Se repite cada día', repeat: 'daily' }))
        .expect(201)

      const completed = await request(app.getHttpServer())
        .post(`/v1/reminders/${created.body.id}/complete`)
        .set(authHeader(userA))
        .expect(201)
      expect(completed.body.next).not.toBeNull()
      const nextId = completed.body.next.id

      let list = await request(app.getHttpServer()).get('/v1/reminders').set(authHeader(userA)).expect(200)
      expect(list.body.some((r: { id: string }) => r.id === nextId)).toBe(true)

      await request(app.getHttpServer())
        .post(`/v1/reminders/${created.body.id}/uncomplete`)
        .set(authHeader(userA))
        .expect(201)

      list = await request(app.getHttpServer()).get('/v1/reminders').set(authHeader(userA)).expect(200)
      expect(list.body.some((r: { id: string }) => r.id === created.body.id)).toBe(true)
      expect(list.body.some((r: { id: string }) => r.id === nextId)).toBe(false)
    })

    it('posponer cambia cuándo toca, y deshacer lo regresa a su hora original', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/reminders')
        .set(authHeader(userA))
        .send(newReminder({ title: 'Para posponer' }))
        .expect(201)

      const snoozed = await request(app.getHttpServer())
        .post(`/v1/reminders/${created.body.id}/snooze`)
        .set(authHeader(userA))
        .send({ until: '1h' })
        .expect(201)
      expect(snoozed.body.snoozedTo).not.toBeNull()

      const unsnoozed = await request(app.getHttpServer())
        .post(`/v1/reminders/${created.body.id}/unsnooze`)
        .set(authHeader(userA))
        .expect(201)
      expect(unsnoozed.body.snoozedTo).toBeNull()
    })
  })
})
