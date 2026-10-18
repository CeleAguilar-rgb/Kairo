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

const newEvent = (overrides: Record<string, unknown> = {}) => ({
  title: 'Evento de prueba',
  kind: 'work',
  date: '2027-03-01',
  allDay: false,
  startTime: '09:00',
  endTime: '10:00',
  location: null,
  projectId: null,
  repeat: 'none',
  reminder: 'none',
  notes: '',
  ...overrides,
})

// Crear 2 usuarios reales en Supabase Auth tarda más que el timeout default
// de un hook (mismo motivo que account.e2e-spec.ts).
jest.setTimeout(30000)

describe('Agenda (e2e)', () => {
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
      .send({ name: 'Ana', avatarPath: 'star', sections: ['agenda'] })
      .expect(201)

    await request(app.getHttpServer())
      .post('/v1/me/onboarding')
      .set(authHeader(userB))
      .send({ name: 'Beto', avatarPath: 'moon', sections: ['agenda'] })
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
    it('crea un evento, sin resolver proyecto todavía (decisión #37)', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/events')
        .set(authHeader(userA))
        .send(newEvent({ title: 'Junta de equipo' }))
        .expect(201)

      expect(res.body.title).toBe('Junta de equipo')
      expect(res.body.startMin).toBe(540)
      expect(res.body.endMin).toBe(600)
      expect(res.body.project).toBeNull()
      expect(res.body.until).toBeNull()
      expect(res.body.skip).toEqual([])
    })

    it('rechaza un título vacío', () => {
      return request(app.getHttpServer())
        .post('/v1/events')
        .set(authHeader(userA))
        .send(newEvent({ title: '' }))
        .expect(400)
    })

    it('rechaza que termine antes de empezar', () => {
      return request(app.getHttpServer())
        .post('/v1/events')
        .set(authHeader(userA))
        .send(newEvent({ startTime: '10:00', endTime: '09:00' }))
        .expect(400)
    })
  })

  describe('aislamiento entre usuarios', () => {
    it('cada quien ve solo sus propios eventos', async () => {
      await request(app.getHttpServer())
        .post('/v1/events')
        .set(authHeader(userB))
        .send(newEvent({ title: 'Evento de Beto' }))
        .expect(201)

      const resA = await request(app.getHttpServer()).get('/v1/events').set(authHeader(userA)).expect(200)
      const resB = await request(app.getHttpServer()).get('/v1/events').set(authHeader(userB)).expect(200)

      expect(resA.body.some((e: { title: string }) => e.title === 'Evento de Beto')).toBe(false)
      expect(resB.body.some((e: { title: string }) => e.title === 'Evento de Beto')).toBe(true)
    })

    it('no se puede editar ni borrar el evento de otro usuario', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/events')
        .set(authHeader(userA))
        .send(newEvent({ title: 'Solo de Ana' }))
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/v1/events/${created.body.id}`)
        .set(authHeader(userB))
        .send(newEvent({ title: 'Hackeado' }))
        .expect(404)

      await request(app.getHttpServer())
        .post(`/v1/events/${created.body.id}/delete`)
        .set(authHeader(userB))
        .send({ scope: 'all', occurrence: '2027-03-01' })
        .expect(404)
    })
  })

  describe('editar y mover', () => {
    it('editar cambia los campos y conserva until/skip', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/events')
        .set(authHeader(userA))
        .send(newEvent({ title: 'Original', repeat: 'daily' }))
        .expect(201)

      await request(app.getHttpServer())
        .post(`/v1/events/${created.body.id}/delete`)
        .set(authHeader(userA))
        .send({ scope: 'one', occurrence: '2027-03-02' })
        .expect(201)

      const edited = await request(app.getHttpServer())
        .patch(`/v1/events/${created.body.id}`)
        .set(authHeader(userA))
        .send(newEvent({ title: 'Editado', repeat: 'daily' }))
        .expect(200)

      expect(edited.body.title).toBe('Editado')
      expect(edited.body.skip).toEqual(['2027-03-02'])
    })

    it('mover un evento suelto le cambia la fecha', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/events')
        .set(authHeader(userA))
        .send(newEvent({ title: 'Para mover' }))
        .expect(201)

      const moved = await request(app.getHttpServer())
        .post(`/v1/events/${created.body.id}/move`)
        .set(authHeader(userA))
        .send({ date: '2027-03-15', occurrence: '2027-03-01' })
        .expect(201)

      expect(moved.body.date).toBe('2027-03-15')
    })

    it('mover una vez de una serie la salta ahí y nace un evento suelto en el día nuevo', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/events')
        .set(authHeader(userA))
        .send(newEvent({ title: 'Serie semanal', repeat: 'weekly' }))
        .expect(201)

      const moved = await request(app.getHttpServer())
        .post(`/v1/events/${created.body.id}/move`)
        .set(authHeader(userA))
        .send({ date: '2027-03-20', occurrence: '2027-03-08' })
        .expect(201)

      expect(moved.body.id).not.toBe(created.body.id)
      expect(moved.body.date).toBe('2027-03-20')
      expect(moved.body.repeat).toBe('none')

      const list = await request(app.getHttpServer()).get('/v1/events').set(authHeader(userA)).expect(200)
      const original = list.body.find((e: { id: string }) => e.id === created.body.id)
      expect(original.skip).toEqual(['2027-03-08'])
    })
  })

  describe('duplicar', () => {
    it('crea una copia suelta con "(copia)" en el título', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/events')
        .set(authHeader(userA))
        .send(newEvent({ title: 'Para duplicar', repeat: 'daily' }))
        .expect(201)

      const copy = await request(app.getHttpServer())
        .post(`/v1/events/${created.body.id}/duplicate`)
        .set(authHeader(userA))
        .send({ occurrence: '2027-03-05' })
        .expect(201)

      expect(copy.body.id).not.toBe(created.body.id)
      expect(copy.body.title).toBe('Para duplicar (copia)')
      expect(copy.body.date).toBe('2027-03-05')
      expect(copy.body.repeat).toBe('none')
    })
  })

  describe('papelera (borrar y deshacer)', () => {
    it('borrar un evento suelto lo manda a la papelera, y deshacer lo trae de vuelta', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/events')
        .set(authHeader(userA))
        .send(newEvent({ title: 'Para borrar' }))
        .expect(201)

      const deleted = await request(app.getHttpServer())
        .post(`/v1/events/${created.body.id}/delete`)
        .set(authHeader(userA))
        .send({ scope: 'all', occurrence: '2027-03-01' })
        .expect(201)

      let list = await request(app.getHttpServer()).get('/v1/events').set(authHeader(userA)).expect(200)
      expect(list.body.some((e: { id: string }) => e.id === created.body.id)).toBe(false)

      await request(app.getHttpServer())
        .post('/v1/events/undo')
        .set(authHeader(userA))
        .send({ token: deleted.body.undoToken })
        .expect(201)

      list = await request(app.getHttpServer()).get('/v1/events').set(authHeader(userA)).expect(200)
      expect(list.body.some((e: { id: string }) => e.id === created.body.id)).toBe(true)
    })

    it('borrar "solo este" de una serie la salta esa vez, y deshacer la destaja', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/events')
        .set(authHeader(userA))
        .send(newEvent({ title: 'Serie diaria', repeat: 'daily' }))
        .expect(201)

      const deleted = await request(app.getHttpServer())
        .post(`/v1/events/${created.body.id}/delete`)
        .set(authHeader(userA))
        .send({ scope: 'one', occurrence: '2027-03-10' })
        .expect(201)

      let list = await request(app.getHttpServer()).get('/v1/events').set(authHeader(userA)).expect(200)
      let row = list.body.find((e: { id: string }) => e.id === created.body.id)
      expect(row.skip).toEqual(['2027-03-10'])

      await request(app.getHttpServer())
        .post('/v1/events/undo')
        .set(authHeader(userA))
        .send({ token: deleted.body.undoToken })
        .expect(201)

      list = await request(app.getHttpServer()).get('/v1/events').set(authHeader(userA)).expect(200)
      row = list.body.find((e: { id: string }) => e.id === created.body.id)
      expect(row.skip).toEqual([])
    })

    it('borrar "esta y las siguientes" acorta la serie, y deshacer la regresa a sin fin', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/events')
        .set(authHeader(userA))
        .send(newEvent({ title: 'Serie mensual', repeat: 'monthly' }))
        .expect(201)

      const deleted = await request(app.getHttpServer())
        .post(`/v1/events/${created.body.id}/delete`)
        .set(authHeader(userA))
        .send({ scope: 'next', occurrence: '2027-05-01' })
        .expect(201)

      let list = await request(app.getHttpServer()).get('/v1/events').set(authHeader(userA)).expect(200)
      let row = list.body.find((e: { id: string }) => e.id === created.body.id)
      expect(row.until).toBe('2027-04-30')

      await request(app.getHttpServer())
        .post('/v1/events/undo')
        .set(authHeader(userA))
        .send({ token: deleted.body.undoToken })
        .expect(201)

      list = await request(app.getHttpServer()).get('/v1/events').set(authHeader(userA)).expect(200)
      row = list.body.find((e: { id: string }) => e.id === created.body.id)
      expect(row.until).toBeNull()
    })

    it('borrar "esta y las siguientes" desde el primer día borra la serie entera', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/events')
        .set(authHeader(userA))
        .send(newEvent({ title: 'Serie que desaparece', repeat: 'weekly' }))
        .expect(201)

      await request(app.getHttpServer())
        .post(`/v1/events/${created.body.id}/delete`)
        .set(authHeader(userA))
        .send({ scope: 'next', occurrence: '2027-03-01' })
        .expect(201)

      const list = await request(app.getHttpServer()).get('/v1/events').set(authHeader(userA)).expect(200)
      expect(list.body.some((e: { id: string }) => e.id === created.body.id)).toBe(false)
    })
  })
})
