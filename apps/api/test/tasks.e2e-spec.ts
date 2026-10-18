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

const newTask = (overrides: Record<string, unknown> = {}) => ({
  title: 'Tarea de prueba',
  projectId: null,
  status: 'todo',
  priority: 'medium',
  dueOn: null,
  subtasks: [],
  notes: null,
  ...overrides,
})

// Crear 2 usuarios reales en Supabase Auth tarda más que el timeout default
// de un hook (mismo motivo que account.e2e-spec.ts).
jest.setTimeout(30000)

describe('Tasks (e2e)', () => {
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
      .send({ name: 'Ana', avatarPath: 'star', sections: ['tasks'] })
      .expect(201)

    await request(app.getHttpServer())
      .post('/v1/me/onboarding')
      .set(authHeader(userB))
      .send({ name: 'Beto', avatarPath: 'moon', sections: ['tasks'] })
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
    it('crea una tarea con subtareas, sin resolver proyecto todavía (decisión #35)', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/tasks')
        .set(authHeader(userA))
        .send(newTask({ title: 'Terminar el reporte', subtasks: ['Juntar datos', 'Escribir conclusiones'] }))
        .expect(201)

      expect(res.body.title).toBe('Terminar el reporte')
      expect(res.body.project).toBeNull()
      expect(res.body.subtasks).toHaveLength(2)
      expect(res.body.subtasks[0]).toMatchObject({ title: 'Juntar datos', done: false })
    })

    it('rechaza una tarea sin título', () => {
      return request(app.getHttpServer())
        .post('/v1/tasks')
        .set(authHeader(userA))
        .send(newTask({ title: '' }))
        .expect(400)
    })
  })

  describe('aislamiento entre usuarios', () => {
    it('cada quien ve solo sus propias tareas', async () => {
      await request(app.getHttpServer())
        .post('/v1/tasks')
        .set(authHeader(userB))
        .send(newTask({ title: 'Tarea de Beto' }))
        .expect(201)

      const resA = await request(app.getHttpServer()).get('/v1/tasks').set(authHeader(userA)).expect(200)
      const resB = await request(app.getHttpServer()).get('/v1/tasks').set(authHeader(userB)).expect(200)

      expect(resA.body.some((t: { title: string }) => t.title === 'Tarea de Beto')).toBe(false)
      expect(resB.body.some((t: { title: string }) => t.title === 'Tarea de Beto')).toBe(true)
    })

    it('no se puede cambiar el estado de la tarea de otro usuario', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/tasks')
        .set(authHeader(userA))
        .send(newTask({ title: 'Solo de Ana' }))
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/v1/tasks/${created.body.id}`)
        .set(authHeader(userB))
        .send({ status: 'done' })
        .expect(404)
    })
  })

  describe('subtareas (filas de tasks con parentTaskId)', () => {
    it('cerrar la tarea cierra también sus subtareas', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/tasks')
        .set(authHeader(userA))
        .send(newTask({ title: 'Con subtareas', subtasks: ['Paso 1', 'Paso 2'] }))
        .expect(201)

      const res = await request(app.getHttpServer())
        .patch(`/v1/tasks/${created.body.id}`)
        .set(authHeader(userA))
        .send({ status: 'done' })
        .expect(200)

      expect(res.body.status).toBe('done')
      expect(res.body.subtasks.every((s: { done: boolean }) => s.done)).toBe(true)
    })

    it('alternar una subtarea no cambia el estado de su tarea padre', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/tasks')
        .set(authHeader(userA))
        .send(newTask({ title: 'Otra con subtareas', subtasks: ['Solo una'] }))
        .expect(201)
      const subtaskId = created.body.subtasks[0].id

      await request(app.getHttpServer())
        .patch(`/v1/tasks/${subtaskId}`)
        .set(authHeader(userA))
        .send({ status: 'done' })
        .expect(200)

      const list = await request(app.getHttpServer()).get('/v1/tasks').set(authHeader(userA)).expect(200)
      const parent = list.body.find((t: { id: string }) => t.id === created.body.id)
      expect(parent.status).toBe('todo')
      expect(parent.subtasks[0].done).toBe(true)
    })
  })

  describe('papelera (borrar y deshacer)', () => {
    it('borrar una tarea se la lleva de la lista junto con sus subtareas', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/tasks')
        .set(authHeader(userA))
        .send(newTask({ title: 'Para borrar', subtasks: ['Se va con ella'] }))
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/v1/tasks/${created.body.id}`)
        .set(authHeader(userA))
        .expect(204)

      const list = await request(app.getHttpServer()).get('/v1/tasks').set(authHeader(userA)).expect(200)
      expect(list.body.some((t: { id: string }) => t.id === created.body.id)).toBe(false)
    })

    it('restaurar devuelve la tarea con sus subtareas de nuevo', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/tasks')
        .set(authHeader(userA))
        .send(newTask({ title: 'Para deshacer', subtasks: ['Vuelve conmigo'] }))
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/v1/tasks/${created.body.id}`)
        .set(authHeader(userA))
        .expect(204)

      const restored = await request(app.getHttpServer())
        .post(`/v1/tasks/${created.body.id}/restore`)
        .set(authHeader(userA))
        .expect(201)

      expect(restored.body.title).toBe('Para deshacer')
      expect(restored.body.subtasks).toHaveLength(1)

      const list = await request(app.getHttpServer()).get('/v1/tasks').set(authHeader(userA)).expect(200)
      expect(list.body.some((t: { id: string }) => t.id === created.body.id)).toBe(true)
    })

    it('no se puede borrar la tarea de otro usuario', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/tasks')
        .set(authHeader(userA))
        .send(newTask({ title: 'Intocable' }))
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/v1/tasks/${created.body.id}`)
        .set(authHeader(userB))
        .expect(404)
    })

    it('rechaza restaurar una tarea que no está en la papelera', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/tasks')
        .set(authHeader(userA))
        .send(newTask({ title: 'Nunca se borró' }))
        .expect(201)

      await request(app.getHttpServer())
        .post(`/v1/tasks/${created.body.id}/restore`)
        .set(authHeader(userA))
        .expect(404)
    })
  })
})
