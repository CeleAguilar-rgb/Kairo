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

// Crear 2 usuarios reales en Supabase Auth tarda más que el timeout default
// de un hook (mismo motivo que account.e2e-spec.ts).
jest.setTimeout(30000)

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

type SessionJson = { id: string; kind: string; startedAt: string; minutes: number; taskId: string | null }

describe('Enfoque (e2e)', () => {
  let app: INestApplication
  let db: PostgresJsDatabase
  let userA: TestUser
  let userB: TestUser

  const get = (user: TestUser, url: string) => request(app.getHttpServer()).get(url).set(authHeader(user))
  const post = (user: TestUser, url: string, body: unknown = {}) => request(app.getHttpServer()).post(url).set(authHeader(user)).send(body as object)
  const del = (user: TestUser, url: string) => request(app.getHttpServer()).delete(url).set(authHeader(user))

  const session = (overrides: Record<string, unknown> = {}) => ({ kind: 'work', startedAt: minutesAgo(30), minutes: 25, taskId: null, ...overrides })
  const createTask = async (user: TestUser, title = 'Escribir la escena 2') =>
    (await post(user, '/v1/tasks', { title, projectId: null, status: 'todo', priority: 'medium', dueOn: null, subtasks: [], notes: null }).expect(201)).body as { id: string }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('v1')
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()

    db = moduleRef.get(DB)
    userA = await createTestUser()
    userB = await createTestUser()

    await post(userA, '/v1/me/onboarding', { name: 'Ana', avatarPath: 'star', sections: ['focus', 'tasks'] }).expect(201)
    await post(userB, '/v1/me/onboarding', { name: 'Beto', avatarPath: 'moon', sections: ['focus', 'tasks'] }).expect(201)
  })

  afterAll(async () => {
    // Todo cuelga de profiles con ON DELETE CASCADE: borrar el perfil se lleva sesiones y tareas.
    await db.delete(profiles).where(eq(profiles.id, userA.id))
    await db.delete(profiles).where(eq(profiles.id, userB.id))
    await deleteTestUser(userA.id)
    await deleteTestUser(userB.id)
    await app.close()
    // app.close() no cierra la conexión de Postgres (mismo motivo que account.e2e-spec.ts).
    await db.$client.end()
  })

  it('rechaza peticiones sin token o con un token inválido', async () => {
    await request(app.getHttpServer()).get(`/v1/focus/sessions?from=${minutesAgo(60)}`).expect(401)
    await request(app.getHttpServer()).post('/v1/focus/sessions').send(session()).expect(401)
    await request(app.getHttpServer()).get(`/v1/focus/sessions?from=${minutesAgo(60)}`).set({ Authorization: 'Bearer no-es-un-token' }).expect(401)
  })

  it('guarda una sesión de trabajo y la devuelve con la forma exacta que espera el front', async () => {
    const created = (await post(userA, '/v1/focus/sessions', session()).expect(201)).body as SessionJson
    expect(Object.keys(created).sort()).toEqual(['id', 'kind', 'minutes', 'startedAt', 'taskId'])
    expect(created).toMatchObject({ kind: 'work', minutes: 25, taskId: null })

    const list = (await get(userA, `/v1/focus/sessions?from=${minutesAgo(120)}`).expect(200)).body as SessionJson[]
    expect(list.some((item) => item.id === created.id)).toBe(true)
  })

  it('las sesiones salen en orden y solo desde el momento pedido', async () => {
    const early = (await post(userA, '/v1/focus/sessions', session({ startedAt: minutesAgo(600) })).expect(201)).body as SessionJson
    const late = (await post(userA, '/v1/focus/sessions', session({ startedAt: minutesAgo(10), minutes: 5, kind: 'break' })).expect(201)).body as SessionJson

    const recent = (await get(userA, `/v1/focus/sessions?from=${minutesAgo(300)}`).expect(200)).body as SessionJson[]
    expect(recent.some((item) => item.id === early.id)).toBe(false)
    expect(recent.some((item) => item.id === late.id)).toBe(true)
    const times = recent.map((item) => item.startedAt)
    expect(times).toEqual([...times].sort())
  })

  it('cada quien ve solo sus sesiones', async () => {
    const mine = (await post(userA, '/v1/focus/sessions', session({ minutes: 50 })).expect(201)).body as SessionJson
    const ofB = (await get(userB, `/v1/focus/sessions?from=${minutesAgo(600)}`).expect(200)).body as SessionJson[]
    expect(ofB.some((item) => item.id === mine.id)).toBe(false)
  })

  it('una sesión con tarea la guarda; la tarea de otra persona o inexistente se rechaza', async () => {
    const task = await createTask(userA)
    const withTask = (await post(userA, '/v1/focus/sessions', session({ taskId: task.id })).expect(201)).body as SessionJson
    expect(withTask.taskId).toBe(task.id)

    const taskOfB = await createTask(userB, 'Secreta de Beto')
    await post(userA, '/v1/focus/sessions', session({ taskId: taskOfB.id })).expect(400)
    await post(userA, '/v1/focus/sessions', session({ taskId: UNKNOWN_ID })).expect(400)
  })

  it('borrar la tarea no pierde los minutos: la sesión se queda sin tarea', async () => {
    const task = await createTask(userA, 'Tarea que se va')
    const created = (await post(userA, '/v1/focus/sessions', session({ taskId: task.id })).expect(201)).body as SessionJson
    await del(userA, `/v1/tasks/${task.id}`).expect(204)

    const list = (await get(userA, `/v1/focus/sessions?from=${minutesAgo(120)}`).expect(200)).body as SessionJson[]
    expect(list.some((item) => item.id === created.id)).toBe(true)
  })

  it('las validaciones rechazan entradas inválidas', async () => {
    await post(userA, '/v1/focus/sessions', session({ minutes: 0 })).expect(400)
    await post(userA, '/v1/focus/sessions', session({ minutes: 181 })).expect(400)
    await post(userA, '/v1/focus/sessions', session({ minutes: 12.5 })).expect(400)
    await post(userA, '/v1/focus/sessions', session({ kind: 'nap' })).expect(400)
    await post(userA, '/v1/focus/sessions', session({ startedAt: 'ayer' })).expect(400)
    await post(userA, '/v1/focus/sessions', session({ taskId: 'no-es-uuid' })).expect(400)
    await post(userA, '/v1/focus/sessions', { kind: 'work', minutes: 25 }).expect(400)
    await get(userA, '/v1/focus/sessions').expect(400)
    await get(userA, '/v1/focus/sessions?from=hoy').expect(400)
  })

  it('no acepta una sesión que empieza en el futuro', async () => {
    await post(userA, '/v1/focus/sessions', session({ startedAt: new Date(Date.now() + 60 * 60_000).toISOString() })).expect(400)
  })

  it('el userId no se puede mandar en el cuerpo: se ignora y la sesión es de quien tiene el token', async () => {
    const created = (await post(userA, '/v1/focus/sessions', { ...session(), userId: userB.id }).expect(201)).body as SessionJson
    const ofB = (await get(userB, `/v1/focus/sessions?from=${minutesAgo(600)}`).expect(200)).body as SessionJson[]
    expect(ofB.some((item) => item.id === created.id)).toBe(false)
  })
})
