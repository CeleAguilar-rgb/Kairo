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
import { sprints } from '../src/db/schema/sprints'
import { createTestUser, deleteTestUser, type TestUser } from './helpers/test-users'

function authHeader(user: TestUser) {
  return { Authorization: `Bearer ${user.accessToken}` }
}

// Crear 2 usuarios reales en Supabase Auth tarda más que el timeout default
// de un hook (mismo motivo que account.e2e-spec.ts).
jest.setTimeout(30000)

// El perfil nace con America/Mexico_City: "hoy" para la API es el de esa zona.
const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10)
}

const newProject = (overrides: Record<string, unknown> = {}) => ({
  name: 'Dashboard personal',
  kind: 'personal',
  status: 'active',
  description: 'Un solo lugar para organizar mi vida.',
  startedOn: '2026-10-01',
  goalOn: '2026-12-01',
  objectives: ['Ver todo de un vistazo', 'Programarlo bien'],
  links: [{ title: 'Canvas', url: 'https://example.com/canvas' }],
  cover: 'luna',
  ...overrides,
})

const newTask = (overrides: Record<string, unknown> = {}) => ({
  title: 'Una tarea',
  projectId: null,
  status: 'todo',
  priority: 'medium',
  dueOn: null,
  subtasks: [],
  notes: null,
  ...overrides,
})

const newEvent = (overrides: Record<string, unknown> = {}) => ({
  title: 'Junta',
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

const newGoal = (overrides: Record<string, unknown> = {}) => ({
  title: 'Terminar el proyecto',
  area: 'work',
  kind: 'project',
  target: null,
  unit: '',
  blockId: null,
  projectId: null,
  dueOn: null,
  why: '',
  ...overrides,
})

type Objective = { id: string; text: string; done: boolean }
type ProjectJson = { id: string; name: string; coverPath: string | null; description: string | null; notes: string | null; goalOn: string | null; objectives: Objective[]; links: { id: string; title: string; url: string }[] }
type SprintJson = { id: string; number: number; goal: string; startsOn: string; endsOn: string; notes: string | null; taskIds?: string[]; doneCount?: number; totalCount?: number }

describe('Proyectos y Sprints (e2e)', () => {
  let app: INestApplication
  let db: PostgresJsDatabase
  let userA: TestUser
  let userB: TestUser

  const get = (user: TestUser, url: string) => request(app.getHttpServer()).get(url).set(authHeader(user))
  const post = (user: TestUser, url: string, body: unknown = {}) => request(app.getHttpServer()).post(url).set(authHeader(user)).send(body as object)
  const patch = (user: TestUser, url: string, body: unknown) => request(app.getHttpServer()).patch(url).set(authHeader(user)).send(body as object)

  async function createProject(user: TestUser, overrides: Record<string, unknown> = {}): Promise<ProjectJson> {
    return (await post(user, '/v1/projects', newProject(overrides)).expect(201)).body
  }

  async function createTask(user: TestUser, overrides: Record<string, unknown> = {}) {
    return (await post(user, '/v1/tasks', newTask(overrides)).expect(201)).body as { id: string; status: string; project: { id: string; name: string } | null }
  }

  async function taskStatus(user: TestUser, id: string): Promise<string | undefined> {
    const all = (await get(user, '/v1/tasks').expect(200)).body as { id: string; status: string }[]
    return all.find((task) => task.id === id)?.status
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('v1')
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()

    db = moduleRef.get(DB)
    userA = await createTestUser()
    userB = await createTestUser()

    await post(userA, '/v1/me/onboarding', { name: 'Ana', avatarPath: 'star', sections: ['projects', 'tasks', 'agenda', 'daily'] }).expect(201)
    await post(userB, '/v1/me/onboarding', { name: 'Beto', avatarPath: 'moon', sections: ['projects', 'tasks', 'agenda', 'daily'] }).expect(201)
  })

  afterAll(async () => {
    // Todo cuelga de profiles con ON DELETE CASCADE: borrar el perfil se lleva proyectos, sprints y tareas.
    await db.delete(profiles).where(eq(profiles.id, userA.id))
    await db.delete(profiles).where(eq(profiles.id, userB.id))
    await deleteTestUser(userA.id)
    await deleteTestUser(userB.id)
    await app.close()
    // app.close() no cierra la conexión de Postgres (mismo motivo que account.e2e-spec.ts).
    await db.$client.end()
  })

  describe('proyectos', () => {
    it('crea un proyecto con sus objetivos y enlaces, y una portada ilustrada', async () => {
      const project = await createProject(userA)
      expect(project).toMatchObject({ name: 'Dashboard personal', kind: 'personal', status: 'active', coverPath: 'preset:luna', startedOn: '2026-10-01', goalOn: '2026-12-01', notes: null })
      expect(project.objectives.map((item) => item.text)).toEqual(['Ver todo de un vistazo', 'Programarlo bien'])
      expect(project.objectives.every((item) => item.done === false)).toBe(true)
      expect(project.links).toMatchObject([{ title: 'Canvas', url: 'https://example.com/canvas' }])
    })

    it('una descripción vacía se guarda como nula y sin portada queda sin portada', async () => {
      const project = await createProject(userA, { description: '', cover: null, startedOn: null, goalOn: null })
      expect(project.description).toBeNull()
      expect(project.coverPath).toBeNull()
    })

    it('rechaza datos inválidos', async () => {
      await post(userA, '/v1/projects', newProject({ name: '' })).expect(400)
      await post(userA, '/v1/projects', newProject({ goalOn: '2026-09-01' })).expect(400)
      await post(userA, '/v1/projects', newProject({ cover: 'no-existe' })).expect(400)
      await post(userA, '/v1/projects', newProject({ kind: 'otra' })).expect(400)
      await post(userA, '/v1/projects', newProject({ links: [{ title: 'Malo', url: 'javascript:alert(1)' }] })).expect(400)
      await post(userA, '/v1/projects', newProject({ objectives: Array.from({ length: 31 }, (_, i) => `Objetivo ${i}`) })).expect(400)
    })

    it('la base misma rechaza una fecha meta anterior al inicio', async () => {
      // El esquema de Zod ya lo rechaza; aquí se comprueba el CHECK de la tabla con un UPDATE directo.
      const project = await createProject(userA)
      await expect(db.$client`update app.projects set goal_on = '2020-01-01' where id = ${project.id}`).rejects.toThrow()
    })

    it('cada quien ve solo sus proyectos, y el de otro no se puede leer ni editar', async () => {
      const mine = await createProject(userB, { name: 'Solo de Beto' })
      const a = (await get(userA, '/v1/projects').expect(200)).body as ProjectJson[]
      const b = (await get(userB, '/v1/projects').expect(200)).body as ProjectJson[]
      expect(a.some((item) => item.id === mine.id)).toBe(false)
      expect(b.some((item) => item.id === mine.id)).toBe(true)

      await get(userA, `/v1/projects/${mine.id}`).expect(404)
      await patch(userA, `/v1/projects/${mine.id}`, newProject({ name: 'Hackeado' })).expect(404)
      await patch(userA, `/v1/projects/${mine.id}/notes`, { notes: 'x' }).expect(404)
      await patch(userA, `/v1/projects/${mine.id}/goal`, { goalOn: '2027-01-01' }).expect(404)
      await get(userA, `/v1/projects/${UNKNOWN_ID}`).expect(404)
      await get(userA, '/v1/projects/no-es-uuid').expect(400)
    })

    it('editar reemplaza las listas: lo que conserva su texto conserva su estado y lo demás se va', async () => {
      const project = await createProject(userA, { objectives: ['Uno', 'Dos', 'Tres'], links: [{ title: 'A', url: 'https://a.example.com' }, { title: 'B', url: 'https://b.example.com' }] })
      const [uno, dos] = project.objectives
      await post(userA, `/v1/projects/${project.id}/objectives/${dos!.id}/toggle`).expect(201)

      const edited = (
        await patch(userA, `/v1/projects/${project.id}`, newProject({ name: 'Renombrado', objectives: ['Tres', 'Dos', 'Nuevo'], links: [{ title: 'B', url: 'https://b.example.com' }, { title: 'C', url: 'https://c.example.com' }] })).expect(200)
      ).body as ProjectJson
      expect(edited.name).toBe('Renombrado')
      expect(edited.objectives.map((item) => item.text)).toEqual(['Tres', 'Dos', 'Nuevo'])
      // "Dos" sigue cumplido y conserva su fila; "Uno" desapareció de la lista.
      expect(edited.objectives.find((item) => item.text === 'Dos')).toMatchObject({ id: dos!.id, done: true })
      expect(edited.objectives.some((item) => item.id === uno!.id)).toBe(false)
      expect(edited.links.map((item) => item.title)).toEqual(['B', 'C'])

      const reread = (await get(userA, `/v1/projects/${project.id}`).expect(200)).body as ProjectJson
      expect(reread.objectives.map((item) => item.text)).toEqual(['Tres', 'Dos', 'Nuevo'])
    })

    it('lo que se quita al editar va a la papelera, no se borra de verdad', async () => {
      const project = await createProject(userA, { objectives: ['Se queda', 'Se va'], links: [] })
      await patch(userA, `/v1/projects/${project.id}`, newProject({ objectives: ['Se queda'], links: [] })).expect(200)
      const rows = (await db.$client`select text, deleted_at is not null as trashed from app.project_objectives where project_id = ${project.id} order by position`) as unknown as { text: string; trashed: boolean }[]
      expect(rows).toEqual(expect.arrayContaining([{ text: 'Se va', trashed: true }, { text: 'Se queda', trashed: false }]))
    })

    it('guarda las notas (vacías = nulas) y la fecha meta', async () => {
      const project = await createProject(userA)
      expect((await patch(userA, `/v1/projects/${project.id}/notes`, { notes: 'Ideas sueltas' }).expect(200)).body.notes).toBe('Ideas sueltas')
      expect((await patch(userA, `/v1/projects/${project.id}/notes`, { notes: '   ' }).expect(200)).body.notes).toBeNull()
      await patch(userA, `/v1/projects/${project.id}/notes`, { notes: 'x'.repeat(5001) }).expect(400)

      expect((await patch(userA, `/v1/projects/${project.id}/goal`, { goalOn: '2027-02-01' }).expect(200)).body.goalOn).toBe('2027-02-01')
      const early = await patch(userA, `/v1/projects/${project.id}/goal`, { goalOn: '2026-09-30' }).expect(400)
      expect(early.body.error.code).toBe('GOAL_BEFORE_START')
      expect((await patch(userA, `/v1/projects/${project.id}/goal`, { goalOn: null }).expect(200)).body.goalOn).toBeNull()
    })

    it('agrega un enlace al final de la lista (solo https) y no en el proyecto de otra persona', async () => {
      const project = await createProject(userA)
      const added = (await post(userA, `/v1/projects/${project.id}/links`, { title: 'Notion', url: 'https://notion.so/algo' }).expect(201)).body
      expect(added).toMatchObject({ title: 'Notion', url: 'https://notion.so/algo' })
      const reread = (await get(userA, `/v1/projects/${project.id}`).expect(200)).body as ProjectJson
      expect(reread.links.map((item) => item.title)).toEqual(['Canvas', 'Notion'])

      await post(userA, `/v1/projects/${project.id}/links`, { title: 'Malo', url: 'javascript:alert(1)' }).expect(400)
      await post(userA, `/v1/projects/${project.id}/links`, { title: '', url: 'https://example.com' }).expect(400)
      await post(userB, `/v1/projects/${project.id}/links`, { title: 'Intruso', url: 'https://example.com' }).expect(404)
    })

    it('marca y desmarca un objetivo, y el de otro proyecto o persona no se toca', async () => {
      const project = await createProject(userA)
      const other = await createProject(userA, { name: 'Otro proyecto' })
      const objective = project.objectives[0]!
      expect((await post(userA, `/v1/projects/${project.id}/objectives/${objective.id}/toggle`).expect(201)).body).toMatchObject({ id: objective.id, done: true })
      expect((await post(userA, `/v1/projects/${project.id}/objectives/${objective.id}/toggle`).expect(201)).body.done).toBe(false)

      // El id del objetivo existe y es de Ana, pero no de ESE proyecto.
      await post(userA, `/v1/projects/${other.id}/objectives/${objective.id}/toggle`).expect(404)
      await post(userB, `/v1/projects/${project.id}/objectives/${objective.id}/toggle`).expect(404)
    })

    it('el contrato con el front: la forma exacta de la lista y del detalle', async () => {
      const keys = (value: object) => Object.keys(value).sort()
      const list = (await get(userA, '/v1/projects').expect(200)).body as ProjectJson[]
      expect(keys(list[0]!)).toEqual(['coverPath', 'coverUrl', 'description', 'goalOn', 'id', 'kind', 'name', 'startedOn', 'status'])
      const detail = (await get(userA, `/v1/projects/${list[0]!.id}`).expect(200)).body as ProjectJson
      expect(keys(detail)).toEqual(['coverPath', 'coverUrl', 'description', 'goalOn', 'id', 'kind', 'links', 'name', 'notes', 'objectives', 'startedOn', 'status'])
      if (detail.objectives[0]) expect(keys(detail.objectives[0])).toEqual(['done', 'id', 'text'])
      if (detail.links[0]) expect(keys(detail.links[0])).toEqual(['id', 'title', 'url'])
    })
  })

  describe('lo que cruza a Tareas, Agenda y Metas', () => {
    let projectA: ProjectJson
    let projectB: ProjectJson

    beforeAll(async () => {
      projectA = await createProject(userA, { name: 'Proyecto de Ana' })
      projectB = await createProject(userB, { name: 'Proyecto de Beto' })
    })

    it('una tarea con proyecto sale con su nombre, y sin proyecto sale null', async () => {
      const task = await createTask(userA, { projectId: projectA.id })
      expect(task.project).toEqual({ id: projectA.id, name: 'Proyecto de Ana' })
      const free = await createTask(userA)
      expect(free.project).toBeNull()

      const all = (await get(userA, '/v1/tasks').expect(200)).body as { id: string; project: { id: string; name: string } | null }[]
      expect(all.find((item) => item.id === task.id)?.project).toEqual({ id: projectA.id, name: 'Proyecto de Ana' })
      expect(all.find((item) => item.id === free.id)?.project).toBeNull()
    })

    it('el nombre del proyecto se actualiza en las tareas cuando se renombra', async () => {
      const project = await createProject(userA, { name: 'Antes' })
      const task = await createTask(userA, { projectId: project.id })
      await patch(userA, `/v1/projects/${project.id}`, newProject({ name: 'Después' })).expect(200)
      const all = (await get(userA, '/v1/tasks').expect(200)).body as { id: string; project: { name: string } | null }[]
      expect(all.find((item) => item.id === task.id)?.project?.name).toBe('Después')
    })

    it('una tarea no puede apuntar al proyecto de otra persona ni a uno que no existe', async () => {
      const foreign = await post(userA, '/v1/tasks', newTask({ projectId: projectB.id })).expect(400)
      expect(foreign.body.error.code).toBe('PROJECT_NOT_FOUND')
      await post(userA, '/v1/tasks', newTask({ projectId: UNKNOWN_ID })).expect(400)
    })

    it('un evento con proyecto sale con su nombre; el de otra persona se rechaza', async () => {
      const created = (await post(userA, '/v1/events', newEvent({ projectId: projectA.id })).expect(201)).body
      expect(created.project).toEqual({ id: projectA.id, name: 'Proyecto de Ana' })
      const all = (await get(userA, '/v1/events').expect(200)).body as { id: string; project: unknown }[]
      expect(all.find((item) => item.id === created.id)?.project).toEqual({ id: projectA.id, name: 'Proyecto de Ana' })

      const foreign = await post(userA, '/v1/events', newEvent({ projectId: projectB.id })).expect(400)
      expect(foreign.body.error.code).toBe('PROJECT_NOT_FOUND')
      await patch(userA, `/v1/events/${created.id}`, newEvent({ projectId: projectB.id })).expect(400)
      const cleared = (await patch(userA, `/v1/events/${created.id}`, newEvent({ projectId: null })).expect(200)).body
      expect(cleared.project).toBeNull()
    })

    it('una meta de tipo Proyecto solo acepta un proyecto propio', async () => {
      const goal = (await post(userA, '/v1/goals', newGoal({ projectId: projectA.id })).expect(201)).body
      expect(goal.projectId).toBe(projectA.id)

      const foreign = await post(userA, '/v1/goals', newGoal({ projectId: projectB.id })).expect(400)
      expect(foreign.body.error.code).toBe('PROJECT_NOT_FOUND')
      // Metas acepta texto libre como id: uno que no es uuid no debe llegar hasta Postgres (500).
      await post(userA, '/v1/goals', newGoal({ projectId: 'proyecto-inventado' })).expect(400)
      await patch(userA, `/v1/goals/${goal.id}`, newGoal({ projectId: projectB.id })).expect(400)
    })
  })

  describe('sprints', () => {
    let project: ProjectJson
    let tasks: { id: string }[]

    beforeAll(async () => {
      project = await createProject(userA, { name: 'Proyecto con sprints' })
      tasks = await Promise.all(['Tarea 1', 'Tarea 2', 'Tarea 3', 'Tarea 4'].map((title) => createTask(userA, { title, projectId: project.id })))
    })

    const list = async (user: TestUser, projectId = project.id) =>
      (await get(user, `/v1/projects/${projectId}/sprints`).expect(200)).body as { active: SprintJson | null; closed: SprintJson[] }

    it('un proyecto sin sprints devuelve todo vacío', async () => {
      expect(await list(userA)).toEqual({ active: null, closed: [] })
    })

    it('sin sprint activo no se pueden agregar tareas ni cerrar nada', async () => {
      const add = await post(userA, `/v1/projects/${project.id}/sprints/tasks`, { taskId: tasks[0]!.id }).expect(400)
      expect(add.body.error.code).toBe('NO_ACTIVE_SPRINT')
      const close = await post(userA, `/v1/projects/${project.id}/sprints/close`, { move: 'next', weeks: 2, notes: '', nextGoal: '' }).expect(404)
      expect(close.body.error.code).toBe('NO_ACTIVE_SPRINT')
    })

    it('empieza un sprint hoy con su meta y la duración elegida; solo hay uno activo a la vez', async () => {
      const started = (await post(userA, `/v1/projects/${project.id}/sprints/start`, { goal: 'Terminar el tablero', weeks: 2 }).expect(201)).body as SprintJson
      expect(started).toMatchObject({ number: 1, goal: 'Terminar el tablero', startsOn: TODAY, endsOn: addDays(TODAY, 13), notes: null, taskIds: [] })

      const again = await post(userA, `/v1/projects/${project.id}/sprints/start`, { goal: '', weeks: 1 }).expect(409)
      expect(again.body.error.code).toBe('SPRINT_ALREADY_ACTIVE')
      await post(userA, `/v1/projects/${project.id}/sprints/start`, { goal: '', weeks: 3 }).expect(400)
      expect((await list(userA)).active?.id).toBe(started.id)
    })

    it('la base misma impide un segundo sprint activo en el mismo proyecto', async () => {
      await expect(
        db.insert(sprints).values({ userId: userA.id, projectId: project.id, number: 99, startsOn: TODAY, endsOn: TODAY, status: 'active' }),
      ).rejects.toThrow()
    })

    it('agrega tareas del proyecto al sprint (sin repetirlas) y rechaza las que no son del proyecto, ajenas o hechas', async () => {
      for (const task of tasks) {
        await post(userA, `/v1/projects/${project.id}/sprints/tasks`, { taskId: task.id }).expect(201)
      }
      // Meter la misma dos veces no falla ni la duplica.
      await post(userA, `/v1/projects/${project.id}/sprints/tasks`, { taskId: tasks[0]!.id }).expect(201)
      expect(((await list(userA)).active?.taskIds ?? []).sort()).toEqual(tasks.map((task) => task.id).sort())

      const loose = await createTask(userA, { title: 'Sin proyecto' })
      const wrongProject = await post(userA, `/v1/projects/${project.id}/sprints/tasks`, { taskId: loose.id }).expect(400)
      expect(wrongProject.body.error.code).toBe('TASK_NOT_IN_PROJECT')

      const theirTask = await createTask(userB, { title: 'De Beto' })
      await post(userA, `/v1/projects/${project.id}/sprints/tasks`, { taskId: theirTask.id }).expect(404)
      await post(userA, `/v1/projects/${project.id}/sprints/tasks`, { taskId: UNKNOWN_ID }).expect(404)

      const done = await createTask(userA, { title: 'Ya hecha', projectId: project.id, status: 'done' })
      const alreadyDone = await post(userA, `/v1/projects/${project.id}/sprints/tasks`, { taskId: done.id }).expect(400)
      expect(alreadyDone.body.error.code).toBe('TASK_ALREADY_DONE')
    })

    it('cerrar pasa lo sin terminar al siguiente sprint (en "Por hacer"), guarda las notas y la foto de lo hecho', async () => {
      // Tarea 1 hecha, Tarea 2 en curso, Tareas 3 y 4 por hacer.
      await patch(userA, `/v1/tasks/${tasks[0]!.id}`, { status: 'done' }).expect(200)
      await patch(userA, `/v1/tasks/${tasks[1]!.id}`, { status: 'in_progress' }).expect(200)

      const closed = (await post(userA, `/v1/projects/${project.id}/sprints/close`, { move: 'next', weeks: 1, notes: 'Salió bien', nextGoal: 'Pulir detalles' }).expect(201)).body as {
        active: SprintJson
        closed: { number: number; doneCount: number; totalCount: number }
        openCount: number
      }
      expect(closed.closed).toEqual({ number: 1, doneCount: 1, totalCount: 4 })
      expect(closed.openCount).toBe(3)
      expect(closed.active).toMatchObject({ number: 2, goal: 'Pulir detalles' })
      // Dura una semana y empieza el día después de que terminaba el anterior (13 días desde hoy).
      expect(closed.active.startsOn).toBe(addDays(TODAY, 14))
      expect(closed.active.endsOn).toBe(addDays(TODAY, 20))
      expect((closed.active.taskIds ?? []).sort()).toEqual([tasks[1]!.id, tasks[2]!.id, tasks[3]!.id].sort())

      // Las que pasaron empiezan en "Por hacer"; la hecha sigue hecha.
      expect(await taskStatus(userA, tasks[1]!.id)).toBe('todo')
      expect(await taskStatus(userA, tasks[0]!.id)).toBe('done')

      const after = await list(userA)
      expect(after.active).toMatchObject({ number: 2 })
      expect(after.closed).toHaveLength(1)
      expect(after.closed[0]).toMatchObject({ number: 1, notes: 'Salió bien', doneCount: 1, totalCount: 4 })
    })

    it('lo que se termine después NO cambia la historia del sprint cerrado', async () => {
      await patch(userA, `/v1/tasks/${tasks[1]!.id}`, { status: 'done' }).expect(200)
      const after = await list(userA)
      expect(after.closed[0]).toMatchObject({ number: 1, doneCount: 1, totalCount: 4 })
    })

    it('cerrar con "regresar al backlog" no pasa nada de lo pendiente al siguiente sprint', async () => {
      // Sprint 2 tiene las Tareas 2 (hecha), 3 y 4 (por hacer). Al cerrar, 3 y 4 vuelven al backlog.
      const closed = (await post(userA, `/v1/projects/${project.id}/sprints/close`, { move: 'back', weeks: 2, notes: '', nextGoal: '' }).expect(201)).body as {
        active: SprintJson
        closed: { number: number; doneCount: number; totalCount: number }
        openCount: number
      }
      expect(closed.closed).toEqual({ number: 2, doneCount: 1, totalCount: 3 })
      expect(closed.openCount).toBe(2)
      expect(closed.active).toMatchObject({ number: 3, goal: '', taskIds: [] })
      expect(await taskStatus(userA, tasks[2]!.id)).toBe('todo')

      const after = await list(userA)
      expect(after.closed.map((item) => item.number)).toEqual([2, 1])
      expect(after.closed[0]!.notes).toBeNull()
    })

    it('las tareas en la papelera no se cuentan ni pasan al siguiente sprint', async () => {
      await post(userA, `/v1/projects/${project.id}/sprints/tasks`, { taskId: tasks[2]!.id }).expect(201)
      await post(userA, `/v1/projects/${project.id}/sprints/tasks`, { taskId: tasks[3]!.id }).expect(201)
      await request(app.getHttpServer()).delete(`/v1/tasks/${tasks[3]!.id}`).set(authHeader(userA)).expect(204)

      const closed = (await post(userA, `/v1/projects/${project.id}/sprints/close`, { move: 'next', weeks: 2, notes: '', nextGoal: '' }).expect(201)).body as {
        active: SprintJson
        closed: { totalCount: number }
      }
      expect(closed.closed.totalCount).toBe(1)
      expect(closed.active.taskIds).toEqual([tasks[2]!.id])
    })

    it('nadie más puede ver ni mover los sprints de otra persona', async () => {
      await get(userB, `/v1/projects/${project.id}/sprints`).expect(404)
      await post(userB, `/v1/projects/${project.id}/sprints/start`, { goal: '', weeks: 2 }).expect(404)
      await post(userB, `/v1/projects/${project.id}/sprints/close`, { move: 'next', weeks: 2, notes: '', nextGoal: '' }).expect(404)
      await post(userB, `/v1/projects/${project.id}/sprints/tasks`, { taskId: tasks[2]!.id }).expect(404)
      await get(userA, `/v1/projects/${UNKNOWN_ID}/sprints`).expect(404)
    })

    it('el contrato con el front: la forma exacta del listado de sprints', async () => {
      const keys = (value: object) => Object.keys(value).sort()
      const data = await list(userA)
      expect(keys(data)).toEqual(['active', 'closed'])
      expect(keys(data.active!)).toEqual(['endsOn', 'goal', 'id', 'notes', 'number', 'startsOn', 'taskIds'])
      expect(keys(data.closed[0]!)).toEqual(['doneCount', 'endsOn', 'goal', 'id', 'notes', 'number', 'startsOn', 'totalCount'])
    })
  })
})
