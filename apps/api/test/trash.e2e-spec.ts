import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { AppModule } from '../src/app.module'
import { DB } from '../src/common/db/db.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'
import { profiles } from '../src/db/schema/_shared'
import { projectObjectives, projects } from '../src/db/schema/projects'
import { tasks } from '../src/db/schema/tasks'
import { TrashService } from '../src/modules/trash/trash.service'
import { createTestUser, deleteTestUser, type TestUser } from './helpers/test-users'

function authHeader(user: TestUser) {
  return { Authorization: `Bearer ${user.accessToken}` }
}

// Mismo motivo que account.e2e-spec.ts: crear usuarios reales tarda más que el timeout default.
jest.setTimeout(30000)

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'

type TrashItemJson = { kind: string; id: string; group: string; name: string; detail: string | null; amountCents: number | null; deletedAt: string; contents: { kind: string; count: number }[] }

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

describe('Papelera (e2e)', () => {
  let app: INestApplication
  let db: PostgresJsDatabase
  let trashService: TrashService
  let userA: TestUser
  let userB: TestUser

  const get = (user: TestUser, url: string) => request(app.getHttpServer()).get(url).set(authHeader(user))
  const post = (user: TestUser, url: string, body: unknown = {}) => request(app.getHttpServer()).post(url).set(authHeader(user)).send(body as object)
  const del = (user: TestUser, url: string) => request(app.getHttpServer()).delete(url).set(authHeader(user))
  const listTrash = async (user: TestUser) => (await get(user, '/v1/trash').expect(200)).body as TrashItemJson[]

  const createProject = async (user: TestUser, overrides: Record<string, unknown> = {}) => (await post(user, '/v1/projects', newProject(overrides)).expect(201)).body as { id: string }
  const createTask = async (user: TestUser, overrides: Record<string, unknown> = {}) => (await post(user, '/v1/tasks', newTask(overrides)).expect(201)).body as { id: string }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('v1')
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()

    db = moduleRef.get(DB)
    trashService = moduleRef.get(TrashService)
    userA = await createTestUser()
    userB = await createTestUser()
    await post(userA, '/v1/me/onboarding', { name: 'Ana', avatarPath: 'star', sections: ['projects', 'tasks', 'finance'] }).expect(201)
    await post(userB, '/v1/me/onboarding', { name: 'Beto', avatarPath: 'moon', sections: ['projects', 'tasks', 'finance'] }).expect(201)
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
    await request(app.getHttpServer()).get('/v1/trash').expect(401)
    await request(app.getHttpServer()).delete('/v1/trash').expect(401)
  })

  it('lista lo borrado de cada módulo con la forma exacta que espera el front', async () => {
    const task = await createTask(userA, { title: 'Comprar despensa' })
    await del(userA, `/v1/tasks/${task.id}`).expect(204)

    const items = await listTrash(userA)
    const item = items.find((candidate) => candidate.id === task.id)
    expect(item).toEqual({ kind: 'task', id: task.id, group: 'task', name: 'Comprar despensa', detail: null, amountCents: null, deletedAt: expect.any(String), contents: [] })
  })

  it('no muestra ni deja tocar lo de otra persona', async () => {
    const task = await createTask(userA, { title: 'De Ana' })
    await del(userA, `/v1/tasks/${task.id}`).expect(204)

    expect((await listTrash(userB)).some((item) => item.id === task.id)).toBe(false)
    await post(userB, `/v1/trash/task/${task.id}/restore`).expect(404)
    await del(userB, `/v1/trash/task/${task.id}`).expect(404)
    await del(userB, '/v1/trash').expect(204)
    // Sigue en la papelera de Ana.
    expect((await listTrash(userA)).some((item) => item.id === task.id)).toBe(true)
  })

  it('borrar un proyecto se lleva sus tareas a la misma hora y salen dentro de él', async () => {
    const project = await createProject(userA)
    const t1 = await createTask(userA, { title: 'Revisar la arquitectura', projectId: project.id, subtasks: ['Parte 1'] })
    const t2 = await createTask(userA, { title: 'Propuesta de módulos', projectId: project.id })
    // Una tarea del proyecto borrada ANTES, por separado: no debe volver con él.
    const earlier = await createTask(userA, { title: 'Borrada antes', projectId: project.id })
    await del(userA, `/v1/tasks/${earlier.id}`).expect(204)

    await post(userA, `/v1/trash/project/${project.id}`).expect(204)

    await get(userA, `/v1/projects/${project.id}`).expect(404)
    const visible = (await get(userA, '/v1/tasks').expect(200)).body as { id: string }[]
    expect(visible.some((item) => [t1.id, t2.id].includes(item.id))).toBe(false)

    const items = await listTrash(userA)
    const projectItem = items.find((item) => item.id === project.id)
    expect(projectItem).toMatchObject({ kind: 'project', group: 'project', name: 'Bot de marketing', detail: 'work', contents: [{ kind: 'task', count: 2 }] })
    // Las tareas que se fueron con él no salen sueltas; la borrada antes, sí.
    expect(items.some((item) => item.id === t1.id || item.id === t2.id)).toBe(false)
    expect(items.some((item) => item.id === earlier.id)).toBe(true)

    // Restaurar devuelve el proyecto, sus objetivos y sus dos tareas (con su subtarea), no la borrada antes.
    await post(userA, `/v1/trash/project/${project.id}/restore`).expect(204)
    await get(userA, `/v1/projects/${project.id}`).expect(200)
    const back = (await get(userA, '/v1/tasks').expect(200)).body as { id: string; subtasks: unknown[] }[]
    expect(back.find((item) => item.id === t1.id)?.subtasks).toHaveLength(1)
    expect(back.some((item) => item.id === t2.id)).toBe(true)
    expect(back.some((item) => item.id === earlier.id)).toBe(false)
    const objectives = await db.select().from(projectObjectives).where(eq(projectObjectives.projectId, project.id))
    expect(objectives.every((row) => row.deletedAt === null)).toBe(true)
  })

  it('solo un proyecto se manda a la papelera desde aquí', async () => {
    const task = await createTask(userA)
    const response = await post(userA, `/v1/trash/task/${task.id}`).expect(400)
    expect(response.body.error.code).toBe('TRASH_NOT_SUPPORTED')
    await post(userA, `/v1/trash/project/${UNKNOWN_ID}`).expect(404)
  })

  it('borrar para siempre solo funciona con algo que ya está en la papelera, y se lleva lo suyo', async () => {
    const project = await createProject(userA, { name: 'Para siempre' })
    const task = await createTask(userA, { projectId: project.id })

    // Vivo: no se puede borrar de verdad saltándose la papelera (regla 11).
    await del(userA, `/v1/trash/project/${project.id}`).expect(404)
    await del(userA, `/v1/trash/task/${task.id}`).expect(404)

    await post(userA, `/v1/trash/project/${project.id}`).expect(204)
    await del(userA, `/v1/trash/project/${project.id}`).expect(204)

    expect(await db.select().from(projects).where(eq(projects.id, project.id))).toHaveLength(0)
    expect(await db.select().from(tasks).where(eq(tasks.id, task.id))).toHaveLength(0)
    expect((await listTrash(userA)).some((item) => item.id === project.id)).toBe(false)
  })

  it('valida el tipo y el id de la ruta', async () => {
    await post(userA, `/v1/trash/no-existe/${UNKNOWN_ID}/restore`).expect(400)
    await post(userA, '/v1/trash/task/no-es-uuid/restore').expect(400)
  })

  it('vaciar la papelera borra todo lo de la persona y nada de otra', async () => {
    const mine = await createTask(userA, { title: 'Mía' })
    const theirs = await createTask(userB, { title: 'De Beto' })
    await del(userA, `/v1/tasks/${mine.id}`).expect(204)
    await del(userB, `/v1/tasks/${theirs.id}`).expect(204)

    await del(userA, '/v1/trash').expect(204)

    expect(await listTrash(userA)).toEqual([])
    expect((await listTrash(userB)).some((item) => item.id === theirs.id)).toBe(true)
  })

  it('la tarea programada borra solo lo que lleva más de 30 días', async () => {
    const old = await createTask(userA, { title: 'Vieja' })
    const recent = await createTask(userA, { title: 'Reciente' })
    await db.update(tasks).set({ deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) }).where(eq(tasks.id, old.id))
    await del(userA, `/v1/tasks/${recent.id}`).expect(204)

    await trashService.purgeExpired()

    expect(await db.select().from(tasks).where(eq(tasks.id, old.id))).toHaveLength(0)
    expect(await db.select().from(tasks).where(eq(tasks.id, recent.id))).toHaveLength(1)
  })
})
