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
import { createTestUser, deleteTestUser, type TestUser } from './helpers/test-users.js'

function authHeader(user: TestUser) {
  return { Authorization: `Bearer ${user.accessToken}` }
}

// Mismo motivo que account.e2e-spec.ts: crear usuarios reales tarda más que el timeout default.
jest.setTimeout(30000)

type HitJson = { kind: string; id: string; title: string; detail: string | null; date: string | null; amountCents: number | null; parentId: string | null }

const newProject = (overrides: Record<string, unknown> = {}) => ({
  name: 'Bot de marketing',
  kind: 'work',
  status: 'active',
  description: '',
  startedOn: null,
  goalOn: null,
  objectives: ['Arquitectura'],
  links: [],
  cover: 'luna',
  ...overrides,
})

const newTask = (overrides: Record<string, unknown> = {}) => ({ title: 'Una tarea', projectId: null, status: 'todo', priority: 'medium', dueOn: null, subtasks: [], notes: null, ...overrides })

describe('Buscar (e2e)', () => {
  let app: INestApplication
  let db: PostgresJsDatabase
  let userA: TestUser
  let userB: TestUser

  const get = (user: TestUser, url: string) => request(app.getHttpServer()).get(url).set(authHeader(user))
  const post = (user: TestUser, url: string, body: unknown = {}) => request(app.getHttpServer()).post(url).set(authHeader(user)).send(body as object)
  const del = (user: TestUser, url: string) => request(app.getHttpServer()).delete(url).set(authHeader(user))
  const search = async (user: TestUser, q: string) => (await get(user, `/v1/search?q=${encodeURIComponent(q)}`).expect(200)).body as HitJson[]
  const createTask = async (user: TestUser, overrides: Record<string, unknown> = {}) => (await post(user, '/v1/tasks', newTask(overrides)).expect(201)).body as { id: string }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('v1')
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()

    db = moduleRef.get(DB)
    userA = await createTestUser()
    userB = await createTestUser()
    await post(userA, '/v1/me/onboarding', { name: 'Ana', avatarPath: 'star', sections: ['projects', 'tasks'] }).expect(201)
    await post(userB, '/v1/me/onboarding', { name: 'Beto', avatarPath: 'moon', sections: ['projects', 'tasks'] }).expect(201)
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
    await request(app.getHttpServer()).get('/v1/search?q=hola').expect(401)
  })

  it('encuentra tareas y proyectos de la persona, sin importar mayúsculas, con la forma exacta', async () => {
    const project = (await post(userA, '/v1/projects', newProject({ name: 'Ingeniería o maestría' })).expect(201)).body as { id: string }
    const task = await createTask(userA, { title: 'Revisar requisitos de inscripción', projectId: project.id, dueOn: '2026-11-05' })

    const hits = await search(userA, 'INSCRIP')
    expect(hits).toContainEqual({ kind: 'task', id: task.id, title: 'Revisar requisitos de inscripción', detail: 'todo', date: '2026-11-05', amountCents: null, parentId: project.id })
    expect((await search(userA, 'maestr')).some((hit) => hit.kind === 'project' && hit.id === project.id)).toBe(true)
  })

  it('no encuentra lo de otra persona ni lo que está en la papelera', async () => {
    const theirs = await createTask(userB, { title: 'Secreto de Beto' })
    const trashed = await createTask(userA, { title: 'Secreto borrado' })
    await del(userA, `/v1/tasks/${trashed.id}`).expect(204)

    const hits = await search(userA, 'secreto')
    expect(hits.some((hit) => hit.id === theirs.id || hit.id === trashed.id)).toBe(false)
  })

  it('trata % y _ como letras, no como comodines', async () => {
    const percent = await createTask(userA, { title: 'Subir al 100% el avance' })
    await createTask(userA, { title: 'Subir al 1000 el avance' })

    const hits = await search(userA, '100%')
    expect(hits.map((hit) => hit.id)).toEqual([percent.id])
  })

  it('valida la búsqueda', async () => {
    await get(userA, '/v1/search?q=a').expect(400)
    await get(userA, '/v1/search').expect(400)
    await get(userA, `/v1/search?q=${'x'.repeat(81)}`).expect(400)
  })
})
