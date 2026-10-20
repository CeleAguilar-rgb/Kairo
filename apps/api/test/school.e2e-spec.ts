import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { and, eq, isNull } from 'drizzle-orm'
// En modo ESM, más seguro importar los globals de Jest en vez de asumirlos
// como globales (recomendación oficial de Jest para tests ESM).
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { AppModule } from '../src/app.module'
import { DB } from '../src/common/db/db.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'
import { profiles } from '../src/db/schema/_shared'
import { events } from '../src/db/schema/agenda'
import { projects } from '../src/db/schema/projects'
import { subjects } from '../src/db/schema/school'
import { sprints } from '../src/db/schema/sprints'
import { tasks } from '../src/db/schema/tasks'
import { AgendaService } from '../src/modules/agenda/agenda.service'
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
const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay()

const newTerm = (overrides: Record<string, unknown> = {}) => ({
  name: 'Ingeniería en Software · 1er cuatrimestre',
  startsOn: addDays(TODAY, 20),
  endsOn: addDays(TODAY, 110),
  prepProjectId: null,
  ...overrides,
})

const newSubject = (overrides: Record<string, unknown> = {}) => ({
  name: 'Cálculo diferencial',
  teacher: 'Prof. Ramírez',
  days: ['mon', 'wed'],
  startsAt: '19:00',
  endsAt: '21:00',
  room: 'Salón B-204',
  color: 'ink',
  termId: null,
  ...overrides,
})

const newProject = (overrides: Record<string, unknown> = {}) => ({
  name: 'Ingeniería o maestría',
  kind: 'school',
  status: 'active',
  description: '',
  startedOn: null,
  goalOn: null,
  objectives: [],
  links: [],
  cover: null,
  ...overrides,
})

const newTask = (overrides: Record<string, unknown> = {}) => ({
  title: 'Ejercicios de límites',
  projectId: null,
  status: 'todo',
  priority: 'medium',
  dueOn: null,
  subtasks: [],
  notes: null,
  ...overrides,
})

type ProjectRef = { id: string; name: string }
type TermJson = { id: string; name: string; startsOn: string; endsOn: string; prepProject: ProjectRef | null }
type Grades = { midterm1: number | null; midterm2: number | null; final: number | null }
type SubjectJson = { id: string; projectId: string; termId: string | null; name: string; teacher: string | null; color: string; grades: Grades }
type EventJson = { id: string; title: string; kind: string; date: string; startMin: number | null; endMin: number | null; place: string | null; project: ProjectRef | null; repeat: string; until: string | null }

describe('Escuela (e2e)', () => {
  let app: INestApplication
  let db: PostgresJsDatabase
  let agendaService: AgendaService
  let userA: TestUser
  let userB: TestUser

  const get = (user: TestUser, url: string) => request(app.getHttpServer()).get(url).set(authHeader(user))
  const post = (user: TestUser, url: string, body: unknown = {}) => request(app.getHttpServer()).post(url).set(authHeader(user)).send(body as object)
  const patch = (user: TestUser, url: string, body: unknown) => request(app.getHttpServer()).patch(url).set(authHeader(user)).send(body as object)
  const del = (user: TestUser, url: string) => request(app.getHttpServer()).delete(url).set(authHeader(user))

  const createTerm = async (user: TestUser, overrides: Record<string, unknown> = {}): Promise<TermJson> =>
    (await post(user, '/v1/school/terms', newTerm(overrides)).expect(201)).body
  const createSubject = async (user: TestUser, overrides: Record<string, unknown> = {}): Promise<SubjectJson> =>
    (await post(user, '/v1/school/subjects', newSubject(overrides)).expect(201)).body
  const listSubjects = async (user: TestUser): Promise<SubjectJson[]> => (await get(user, '/v1/school/subjects').expect(200)).body
  const listEvents = async (user: TestUser): Promise<EventJson[]> => (await get(user, '/v1/events').expect(200)).body
  const createProject = async (user: TestUser, overrides: Record<string, unknown> = {}): Promise<ProjectRef> =>
    (await post(user, '/v1/projects', newProject(overrides)).expect(201)).body

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('v1')
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()

    db = moduleRef.get(DB)
    agendaService = moduleRef.get(AgendaService)
    userA = await createTestUser()
    userB = await createTestUser()

    await post(userA, '/v1/me/onboarding', { name: 'Ana', avatarPath: 'star', sections: ['school', 'projects', 'tasks', 'agenda'] }).expect(201)
    await post(userB, '/v1/me/onboarding', { name: 'Beto', avatarPath: 'moon', sections: ['school', 'projects', 'tasks', 'agenda'] }).expect(201)
  })

  afterAll(async () => {
    // Todo cuelga de profiles con ON DELETE CASCADE: borrar el perfil se lleva periodos, materias, proyectos y tareas.
    await db.delete(profiles).where(eq(profiles.id, userA.id))
    await db.delete(profiles).where(eq(profiles.id, userB.id))
    await deleteTestUser(userA.id)
    await deleteTestUser(userB.id)
    await app.close()
    // app.close() no cierra la conexión de Postgres (mismo motivo que account.e2e-spec.ts).
    await db.$client.end()
  })

  describe('periodos', () => {
    it('crea un periodo y devuelve el nombre de su proyecto de preparación', async () => {
      const prep = await createProject(userA)
      const term = await createTerm(userA, { prepProjectId: prep.id })
      expect(term).toMatchObject({ name: 'Ingeniería en Software · 1er cuatrimestre', startsOn: addDays(TODAY, 20), endsOn: addDays(TODAY, 110), prepProject: { id: prep.id, name: 'Ingeniería o maestría' } })
    })

    it('rechaza datos inválidos', async () => {
      await post(userA, '/v1/school/terms', newTerm({ name: '' })).expect(400)
      await post(userA, '/v1/school/terms', newTerm({ name: 'x'.repeat(81) })).expect(400)
      await post(userA, '/v1/school/terms', newTerm({ endsOn: addDays(TODAY, 1), startsOn: addDays(TODAY, 5) })).expect(400)
      await post(userA, '/v1/school/terms', newTerm({ startsOn: 'mañana' })).expect(400)
      await post(userA, '/v1/school/terms', newTerm({ prepProjectId: 'no-es-uuid' })).expect(400)
    })

    it('un proyecto de preparación ajeno o inexistente se rechaza con 400', async () => {
      const others = await createProject(userB)
      const foreign = await post(userA, '/v1/school/terms', newTerm({ prepProjectId: others.id })).expect(400)
      expect(foreign.body.error.code).toBe('PROJECT_NOT_FOUND')
      await post(userA, '/v1/school/terms', newTerm({ prepProjectId: UNKNOWN_ID })).expect(400)
    })

    it('edita un periodo y quita su proyecto de preparación', async () => {
      const prep = await createProject(userA)
      const term = await createTerm(userA, { prepProjectId: prep.id })
      const updated = (await patch(userA, `/v1/school/terms/${term.id}`, newTerm({ name: '2º cuatrimestre', prepProjectId: null })).expect(200)).body as TermJson
      expect(updated).toMatchObject({ id: term.id, name: '2º cuatrimestre', prepProject: null })
    })

    it('editar uno que no existe da 404, y un id que no es uuid, 400', async () => {
      const missing = await patch(userA, `/v1/school/terms/${UNKNOWN_ID}`, newTerm()).expect(404)
      expect(missing.body.error.code).toBe('TERM_NOT_FOUND')
      await patch(userA, '/v1/school/terms/no-es-uuid', newTerm()).expect(400)
    })

    it('la lista trae el más reciente primero', async () => {
      const later = await createTerm(userA, { name: 'Más adelante', startsOn: addDays(TODAY, 400), endsOn: addDays(TODAY, 490) })
      const terms = (await get(userA, '/v1/school/terms').expect(200)).body as TermJson[]
      expect(terms[0]!.id).toBe(later.id)
      const starts = terms.map((term) => term.startsOn)
      expect(starts).toEqual([...starts].sort().reverse())
    })

    it('un periodo es de quien lo creó: la otra persona no lo ve ni lo edita', async () => {
      const term = await createTerm(userA, { name: 'Solo de Ana' })
      const seen = (await get(userB, '/v1/school/terms').expect(200)).body as TermJson[]
      expect(seen.some((item) => item.id === term.id)).toBe(false)
      await patch(userB, `/v1/school/terms/${term.id}`, newTerm({ name: 'Mío ahora' })).expect(404)
      const after = (await get(userA, '/v1/school/terms').expect(200)).body as TermJson[]
      expect(after.find((item) => item.id === term.id)?.name).toBe('Solo de Ana')
    })
  })

  describe('materias', () => {
    it('crea la materia: un proyecto de tipo Escuela con su fila propia', async () => {
      const subject = await createSubject(userA)
      expect(subject).toMatchObject({ name: 'Cálculo diferencial', teacher: 'Prof. Ramírez', color: 'ink', termId: null, grades: { midterm1: null, midterm2: null, final: null } })

      const projectsList = (await get(userA, '/v1/projects').expect(200)).body as { id: string; name: string; kind: string; status: string }[]
      expect(projectsList.find((project) => project.id === subject.projectId)).toMatchObject({ name: 'Cálculo diferencial', kind: 'school', status: 'active' })
      expect((await listSubjects(userA)).some((item) => item.id === subject.id)).toBe(true)
    })

    it('cada día de clase es una serie semanal de Agenda ligada a la materia', async () => {
      const subject = await createSubject(userA, { name: 'Programación', days: ['tue', 'thu'], startsAt: '19:00', endsAt: '21:00', room: 'Laboratorio 2' })
      const classes = (await listEvents(userA)).filter((event) => event.project?.id === subject.projectId)
      expect(classes).toHaveLength(2)
      for (const event of classes) {
        expect(event).toMatchObject({ title: 'Programación', kind: 'school', repeat: 'weekly', startMin: 19 * 60, endMin: 21 * 60, place: 'Laboratorio 2', project: { id: subject.projectId, name: 'Programación' } })
      }
      expect(classes.map((event) => weekdayOf(event.date)).sort()).toEqual([2, 4])
    })

    it('sin salón, la clase queda sin lugar; sin profesor, la materia queda sin profesor', async () => {
      const subject = await createSubject(userA, { room: '', teacher: null, days: ['sat'] })
      expect(subject.teacher).toBeNull()
      const [event] = (await listEvents(userA)).filter((item) => item.project?.id === subject.projectId)
      expect(event!.place).toBeNull()
    })

    it('con periodo, las clases empiezan cuando empieza el periodo y terminan con él', async () => {
      const term = await createTerm(userA, { name: 'Periodo con clases', startsOn: addDays(TODAY, 30), endsOn: addDays(TODAY, 120) })
      const subject = await createSubject(userA, { name: 'Con periodo', days: ['mon', 'fri'], termId: term.id })
      expect(subject.termId).toBe(term.id)

      const classes = (await listEvents(userA)).filter((event) => event.project?.id === subject.projectId)
      expect(classes).toHaveLength(2)
      for (const event of classes) {
        // La primera clase cae en la primera semana del periodo, no hoy.
        expect(event.date >= term.startsOn).toBe(true)
        expect(event.date < addDays(term.startsOn, 7)).toBe(true)
        expect(event.until).toBe(term.endsOn)
      }
      expect(classes.map((event) => weekdayOf(event.date)).sort()).toEqual([1, 5])

      // El proyecto de la materia lleva las fechas del periodo.
      const project = (await get(userA, `/v1/projects/${subject.projectId}`).expect(200)).body as { startedOn: string | null; goalOn: string | null }
      expect(project).toMatchObject({ startedOn: term.startsOn, goalOn: term.endsOn })
    })

    it('con un periodo que ya empezó, la primera clase es de hoy en adelante', async () => {
      const term = await createTerm(userA, { name: 'Ya empezó', startsOn: addDays(TODAY, -40), endsOn: addDays(TODAY, 50) })
      const subject = await createSubject(userA, { name: 'Ya en curso', days: ['wed'], termId: term.id })
      const [event] = (await listEvents(userA)).filter((item) => item.project?.id === subject.projectId)
      expect(event!.date >= TODAY).toBe(true)
      expect(event!.date < addDays(TODAY, 7)).toBe(true)
      expect(weekdayOf(event!.date)).toBe(3)
    })

    it('el primer periodo que se crea adopta las materias que no tenían periodo', async () => {
      // Persona nueva: ninguna materia con periodo todavía.
      const orphan = await createSubject(userB, { name: 'Sin periodo' })
      expect(orphan.termId).toBeNull()
      const term = await createTerm(userB, { name: 'El primero' })
      expect((await listSubjects(userB)).find((item) => item.id === orphan.id)?.termId).toBe(term.id)
    })

    it('rechaza datos inválidos', async () => {
      await post(userA, '/v1/school/subjects', newSubject({ name: '' })).expect(400)
      await post(userA, '/v1/school/subjects', newSubject({ days: [] })).expect(400)
      await post(userA, '/v1/school/subjects', newSubject({ days: ['sun'] })).expect(400)
      await post(userA, '/v1/school/subjects', newSubject({ startsAt: '21:00', endsAt: '19:00' })).expect(400)
      await post(userA, '/v1/school/subjects', newSubject({ color: 'neon' })).expect(400)
      await post(userA, '/v1/school/subjects', newSubject({ termId: 'no-es-uuid' })).expect(400)
      await post(userA, '/v1/school/subjects', newSubject({ teacher: 'x'.repeat(81) })).expect(400)
    })

    it('un periodo ajeno o inexistente se rechaza con 400 y no deja nada creado', async () => {
      const before = (await get(userA, '/v1/projects').expect(200)).body as unknown[]
      const foreign = await createTerm(userB, { name: 'De Beto' })
      const refused = await post(userA, '/v1/school/subjects', newSubject({ name: 'Rechazada', termId: foreign.id })).expect(400)
      expect(refused.body.error.code).toBe('TERM_NOT_FOUND')
      await post(userA, '/v1/school/subjects', newSubject({ name: 'Rechazada', termId: UNKNOWN_ID })).expect(400)
      expect((await get(userA, '/v1/projects').expect(200)).body).toHaveLength(before.length)
    })

    it('si falla crear las clases, no queda una materia a medias', async () => {
      const spy = jest.spyOn(agendaService, 'create').mockRejectedValueOnce(new Error('se cayó Agenda'))
      await post(userA, '/v1/school/subjects', newSubject({ name: 'Materia fallida' })).expect(500)
      spy.mockRestore()

      expect((await listSubjects(userA)).some((subject) => subject.name === 'Materia fallida')).toBe(false)
      const projectsList = (await get(userA, '/v1/projects').expect(200)).body as { name: string }[]
      expect(projectsList.some((project) => project.name === 'Materia fallida')).toBe(false)
      const [orphan] = await db.select().from(projects).where(and(eq(projects.userId, userA.id), eq(projects.name, 'Materia fallida')))
      expect(orphan?.deletedAt).not.toBeNull()
    })

    it('las entregas son tareas del proyecto de la materia', async () => {
      const subject = await createSubject(userA, { name: 'Con entregas' })
      const task = (await post(userA, '/v1/tasks', newTask({ projectId: subject.projectId, dueOn: addDays(TODAY, 3) })).expect(201)).body as { project: ProjectRef | null }
      expect(task.project).toEqual({ id: subject.projectId, name: 'Con entregas' })
    })

    it('una materia es de quien la creó: la otra persona no la ve', async () => {
      const subject = await createSubject(userA, { name: 'Solo de Ana' })
      expect((await listSubjects(userB)).some((item) => item.id === subject.id)).toBe(false)
      expect((await listEvents(userB)).some((event) => event.project?.id === subject.projectId)).toBe(false)
    })
  })

  describe('calificaciones', () => {
    it('guarda una casilla a la vez sin tocar las otras', async () => {
      const subject = await createSubject(userA, { name: 'Con notas' })
      const first = (await patch(userA, `/v1/school/subjects/${subject.id}/grades`, { midterm1: 8.5 }).expect(200)).body as SubjectJson
      expect(first.grades).toEqual({ midterm1: 8.5, midterm2: null, final: null })
      const second = (await patch(userA, `/v1/school/subjects/${subject.id}/grades`, { midterm2: 9 }).expect(200)).body as SubjectJson
      expect(second.grades).toEqual({ midterm1: 8.5, midterm2: 9, final: null })
      expect((await listSubjects(userA)).find((item) => item.id === subject.id)?.grades).toEqual({ midterm1: 8.5, midterm2: 9, final: null })
    })

    it('guarda con un decimal, acepta 0 y 10, y null la borra', async () => {
      const subject = await createSubject(userA, { name: 'Decimales' })
      const url = `/v1/school/subjects/${subject.id}/grades`
      expect(((await patch(userA, url, { midterm1: 8.54 }).expect(200)).body as SubjectJson).grades.midterm1).toBe(8.5)
      expect(((await patch(userA, url, { midterm1: 0, final: 10 }).expect(200)).body as SubjectJson).grades).toEqual({ midterm1: 0, midterm2: null, final: 10 })
      expect(((await patch(userA, url, { midterm1: null }).expect(200)).body as SubjectJson).grades.midterm1).toBeNull()
    })

    it('rechaza calificaciones fuera de 0 a 10, que no son número o un cuerpo vacío', async () => {
      const subject = await createSubject(userA, { name: 'Inválidas' })
      const url = `/v1/school/subjects/${subject.id}/grades`
      await patch(userA, url, { midterm1: 11 }).expect(400)
      await patch(userA, url, { midterm1: -1 }).expect(400)
      await patch(userA, url, { midterm1: '9' }).expect(400)
      await patch(userA, url, {}).expect(400)
    })

    it('una materia que no existe da 404, y un id que no es uuid, 400', async () => {
      const missing = await patch(userA, `/v1/school/subjects/${UNKNOWN_ID}/grades`, { midterm1: 8 }).expect(404)
      expect(missing.body.error.code).toBe('SUBJECT_NOT_FOUND')
      await patch(userA, '/v1/school/subjects/no-es-uuid/grades', { midterm1: 8 }).expect(400)
    })

    it('las calificaciones de una materia ajena no se pueden cambiar', async () => {
      const subject = await createSubject(userA, { name: 'De Ana' })
      await patch(userB, `/v1/school/subjects/${subject.id}/grades`, { final: 1 }).expect(404)
      expect((await listSubjects(userA)).find((item) => item.id === subject.id)?.grades.final).toBeNull()
    })
  })

  describe('borrar una materia', () => {
    it('manda a la papelera su proyecto, sus clases, sus entregas con subtareas, sus sprints y la materia', async () => {
      const subject = await createSubject(userA, { name: 'Para borrar' })
      await patch(userA, `/v1/school/subjects/${subject.id}/grades`, { midterm1: 7 }).expect(200)
      const task = (await post(userA, '/v1/tasks', newTask({ projectId: subject.projectId, subtasks: ['Parte 1', 'Parte 2'] })).expect(201)).body as { id: string }
      await post(userA, `/v1/projects/${subject.projectId}/sprints/start`, { goal: 'Primer corte', weeks: 1 }).expect(201)
      // Una tarea de OTRO proyecto no se toca.
      const bystander = (await post(userA, '/v1/tasks', newTask({ title: 'Otra cosa' })).expect(201)).body as { id: string }

      await del(userA, `/v1/school/subjects/${subject.id}`).expect(204)

      // Ya no sale en ninguna lista.
      expect((await listSubjects(userA)).some((item) => item.id === subject.id)).toBe(false)
      expect((await listEvents(userA)).some((event) => event.project?.id === subject.projectId)).toBe(false)
      const visibleTasks = (await get(userA, '/v1/tasks').expect(200)).body as { id: string }[]
      expect(visibleTasks.some((item) => item.id === task.id)).toBe(false)
      expect(visibleTasks.some((item) => item.id === bystander.id)).toBe(true)
      expect(((await get(userA, '/v1/projects').expect(200)).body as { id: string }[]).some((project) => project.id === subject.projectId)).toBe(false)
      await get(userA, `/v1/projects/${subject.projectId}`).expect(404)

      // Nada se borró de verdad (regla 11): todo tiene deleted_at, también las subtareas.
      const rows = {
        project: await db.select().from(projects).where(eq(projects.id, subject.projectId)),
        subject: await db.select().from(subjects).where(eq(subjects.id, subject.id)),
        events: await db.select().from(events).where(eq(events.projectId, subject.projectId)),
        sprints: await db.select().from(sprints).where(eq(sprints.projectId, subject.projectId)),
        task: await db.select().from(tasks).where(eq(tasks.id, task.id)),
        subtasks: await db.select().from(tasks).where(eq(tasks.parentTaskId, task.id)),
      }
      expect(rows.project).toHaveLength(1)
      expect(rows.subject).toHaveLength(1)
      expect(rows.events).toHaveLength(2) // lunes y miércoles
      expect(rows.sprints).toHaveLength(1)
      expect(rows.subtasks).toHaveLength(2)
      for (const row of [...rows.project, ...rows.subject, ...rows.events, ...rows.sprints, ...rows.task, ...rows.subtasks]) {
        expect(row.deletedAt).not.toBeNull()
      }
      const [still] = await db.select().from(tasks).where(and(eq(tasks.id, bystander.id), isNull(tasks.deletedAt)))
      expect(still).toBeDefined()
    })

    it('borrarla otra vez da 404', async () => {
      const subject = await createSubject(userA, { name: 'Dos veces' })
      await del(userA, `/v1/school/subjects/${subject.id}`).expect(204)
      const again = await del(userA, `/v1/school/subjects/${subject.id}`).expect(404)
      expect(again.body.error.code).toBe('SUBJECT_NOT_FOUND')
    })

    it('si un borrado se quedó a medias, volver a pedirlo lo termina', async () => {
      const subject = await createSubject(userA, { name: 'A medias' })
      const task = (await post(userA, '/v1/tasks', newTask({ projectId: subject.projectId })).expect(201)).body as { id: string }
      // Simula que el borrado se interrumpió justo después de mandar el proyecto a la papelera.
      await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, subject.projectId))

      await del(userA, `/v1/school/subjects/${subject.id}`).expect(204)

      const [taskRow] = await db.select().from(tasks).where(eq(tasks.id, task.id))
      expect(taskRow!.deletedAt).not.toBeNull()
      const [subjectRow] = await db.select().from(subjects).where(eq(subjects.id, subject.id))
      expect(subjectRow!.deletedAt).not.toBeNull()
    })

    it('una materia ajena no se puede borrar y no pierde nada', async () => {
      const subject = await createSubject(userA, { name: 'No es de Beto' })
      await del(userB, `/v1/school/subjects/${subject.id}`).expect(404)
      expect((await listSubjects(userA)).some((item) => item.id === subject.id)).toBe(true)
      expect((await listEvents(userA)).some((event) => event.project?.id === subject.projectId)).toBe(true)
    })

    it('un id que no es uuid da 400', async () => {
      await del(userA, '/v1/school/subjects/no-es-uuid').expect(400)
    })
  })

  describe('sin sesión', () => {
    it('ninguna ruta de Escuela responde sin token', async () => {
      await request(app.getHttpServer()).get('/v1/school/terms').expect(401)
      await request(app.getHttpServer()).get('/v1/school/subjects').expect(401)
      await request(app.getHttpServer()).post('/v1/school/subjects').send(newSubject()).expect(401)
    })
  })
})
