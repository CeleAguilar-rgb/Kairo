import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { eq } from 'drizzle-orm'
// En modo ESM, más seguro importar los globals de Jest en vez de asumirlos como globales.
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

const TODAY = new Date().toISOString().slice(0, 10)
// 0 = lunes … 6 = domingo (mismo índice que routines.days): para que el bloque de hoy "aplique" sin
// importar qué día corra el test.
const DAYS_ALL_ON = [true, true, true, true, true, true, true]

// Crear 2 usuarios reales en Supabase Auth tarda más que el timeout default de un hook.
jest.setTimeout(30000)

describe('Día a día (e2e)', () => {
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
      .send({ name: 'Ana', avatarPath: 'star', sections: ['daily'] })
      .expect(201)

    await request(app.getHttpServer())
      .post('/v1/me/onboarding')
      .set(authHeader(userB))
      .send({ name: 'Beto', avatarPath: 'moon', sections: ['daily'] })
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

  async function undo(user: TestUser, token: string) {
    return request(app.getHttpServer()).post('/v1/daily/undo').set(authHeader(user)).send({ token }).expect(201)
  }

  async function newRoutineWithBlock(user: TestUser, blockOverrides: Record<string, unknown> = {}) {
    const routine = await request(app.getHttpServer()).post('/v1/routines').set(authHeader(user)).expect(201)
    await request(app.getHttpServer())
      .patch(`/v1/routines/${routine.body.id}`)
      .set(authHeader(user))
      .send({ name: routine.body.name, days: DAYS_ALL_ON, active: true })
      .expect(200)

    const block = await request(app.getHttpServer())
      .post('/v1/routine-blocks')
      .set(authHeader(user))
      .send({
        routineId: routine.body.id,
        title: 'Tomar agua',
        startsAt: '08:00',
        endsAt: null,
        kind: 'habit',
        icon: 'drop',
        link: null,
        alert: false,
        nagMinutes: 0,
        countsForReport: true,
        ...blockOverrides,
      })
      .expect(201)

    return { routine: routine.body, block: block.body }
  }

  describe('rutinas y bloques', () => {
    it('crea rutinas con nombre único autogenerado', async () => {
      const first = await request(app.getHttpServer()).post('/v1/routines').set(authHeader(userA)).expect(201)
      const second = await request(app.getHttpServer()).post('/v1/routines').set(authHeader(userA)).expect(201)
      expect(first.body.name).toBe('Rutina nueva')
      expect(second.body.name).toBe('Rutina nueva 2')
    })

    it('un bloque de enfoque sin "ligado a" se rechaza', async () => {
      const routine = await request(app.getHttpServer()).post('/v1/routines').set(authHeader(userA)).expect(201)
      await request(app.getHttpServer())
        .post('/v1/routine-blocks')
        .set(authHeader(userA))
        .send({
          routineId: routine.body.id,
          title: 'Proyecto',
          startsAt: '09:00',
          endsAt: null,
          kind: 'focus',
          icon: 'work',
          link: null,
          alert: false,
          nagMinutes: 0,
          countsForReport: true,
        })
        .expect(400)
    })

    it('un bloque "libre" nunca cuenta para el reporte aunque el form lo pida', async () => {
      const { block } = await newRoutineWithBlock(userA, { kind: 'free', countsForReport: true })
      expect(block.countsForReport).toBe(false)
    })

    it('marcar un bloque de hoy crea el registro; el servidor decide la hora y si fue tarde', async () => {
      // startsAt a medianoche sin insistir: a los 30 min de gracia ya es "tarde" el resto del día
      // (decisión #29) — ventana de 0:00 a 0:30 sin cubrir, igual que otras pruebas con horas fijas.
      const { block } = await newRoutineWithBlock(userA, { startsAt: '00:00' })

      const toggled = await request(app.getHttpServer())
        .post(`/v1/routine-blocks/${block.id}/toggle`)
        .set(authHeader(userA))
        .send({ done: true })
        .expect(201)
      expect(toggled.body.log.late).toBe(true)
      expect(toggled.body.log.doneAt).toMatch(/^\d{2}:\d{2}$/)

      const logs = await request(app.getHttpServer())
        .get('/v1/routines/logs')
        .query({ from: TODAY, to: TODAY })
        .set(authHeader(userA))
        .expect(200)
      expect(logs.body.some((log: { blockId: string }) => log.blockId === block.id)).toBe(true)

      const untoggled = await request(app.getHttpServer())
        .post(`/v1/routine-blocks/${block.id}/toggle`)
        .set(authHeader(userA))
        .send({ done: false })
        .expect(201)
      expect(untoggled.body.log).toBeNull()
    })

    it('no se puede marcar un bloque libre (no es marcable)', async () => {
      const { block } = await newRoutineWithBlock(userA, { kind: 'free' })
      await request(app.getHttpServer())
        .post(`/v1/routine-blocks/${block.id}/toggle`)
        .set(authHeader(userA))
        .send({ done: true })
        .expect(400)
    })

    it('completar una tarea de enfoque también marca el bloque como hecho', async () => {
      const { routine } = await newRoutineWithBlock(userA)
      const focusBlock = await request(app.getHttpServer())
        .post('/v1/routine-blocks')
        .set(authHeader(userA))
        .send({
          routineId: routine.id,
          title: 'Proyecto personal',
          startsAt: '10:00',
          endsAt: null,
          kind: 'focus',
          icon: 'work',
          link: 'personal',
          alert: false,
          nagMinutes: 0,
          countsForReport: true,
        })
        .expect(201)

      const completed = await request(app.getHttpServer())
        .post(`/v1/routine-blocks/${focusBlock.body.id}/complete-focus-task`)
        .set(authHeader(userA))
        .expect(201)
      expect(completed.body.focusDone).toBe(1)
      expect(completed.body.log.doneAt).toMatch(/^\d{2}:\d{2}$/)

      const again = await request(app.getHttpServer())
        .post(`/v1/routine-blocks/${focusBlock.body.id}/complete-focus-task`)
        .set(authHeader(userA))
        .expect(201)
      expect(again.body.focusDone).toBe(2)
    })

    it('borrar un bloque y deshacer lo regresa a la lista', async () => {
      const { block } = await newRoutineWithBlock(userA)
      const deleted = await request(app.getHttpServer()).delete(`/v1/routine-blocks/${block.id}`).set(authHeader(userA)).expect(200)

      let list = await request(app.getHttpServer()).get('/v1/routines').set(authHeader(userA)).expect(200)
      expect(list.body.blocks.some((b: { id: string }) => b.id === block.id)).toBe(false)

      await undo(userA, deleted.body.undoToken)

      list = await request(app.getHttpServer()).get('/v1/routines').set(authHeader(userA)).expect(200)
      expect(list.body.blocks.some((b: { id: string }) => b.id === block.id)).toBe(true)
    })

    it('borrar una rutina se lleva sus bloques, y deshacer restaura ambos', async () => {
      const { routine, block } = await newRoutineWithBlock(userA)
      const deleted = await request(app.getHttpServer()).delete(`/v1/routines/${routine.id}`).set(authHeader(userA)).expect(200)

      let list = await request(app.getHttpServer()).get('/v1/routines').set(authHeader(userA)).expect(200)
      expect(list.body.routines.some((r: { id: string }) => r.id === routine.id)).toBe(false)
      expect(list.body.blocks.some((b: { id: string }) => b.id === block.id)).toBe(false)

      await undo(userA, deleted.body.undoToken)

      list = await request(app.getHttpServer()).get('/v1/routines').set(authHeader(userA)).expect(200)
      expect(list.body.routines.some((r: { id: string }) => r.id === routine.id)).toBe(true)
      expect(list.body.blocks.some((b: { id: string }) => b.id === block.id)).toBe(true)
    })

    it('"copiar de" agrega los bloques de una rutina a otra sin quitar los que ya tenía', async () => {
      const { routine: from, block } = await newRoutineWithBlock(userA)
      const to = await request(app.getHttpServer()).post('/v1/routines').set(authHeader(userA)).expect(201)
      await request(app.getHttpServer())
        .post('/v1/routine-blocks')
        .set(authHeader(userA))
        .send({
          routineId: to.body.id,
          title: 'Ya existía',
          startsAt: '07:00',
          endsAt: null,
          kind: 'habit',
          icon: 'sun',
          link: null,
          alert: false,
          nagMinutes: 0,
          countsForReport: true,
        })
        .expect(201)

      const copied = await request(app.getHttpServer())
        .post('/v1/routine-blocks/copy')
        .set(authHeader(userA))
        .send({ fromRoutineId: from.id, toRoutineId: to.body.id })
        .expect(201)

      expect(copied.body).toHaveLength(2)
      expect(copied.body.some((b: { title: string }) => b.title === 'Ya existía')).toBe(true)
      expect(copied.body.some((b: { title: string }) => b.title === block.title)).toBe(true)
    })

    it('aislamiento: Beto no puede marcar ni borrar un bloque de Ana', async () => {
      const { block } = await newRoutineWithBlock(userA)
      await request(app.getHttpServer())
        .post(`/v1/routine-blocks/${block.id}/toggle`)
        .set(authHeader(userB))
        .send({ done: true })
        .expect(404)
      await request(app.getHttpServer()).delete(`/v1/routine-blocks/${block.id}`).set(authHeader(userB)).expect(404)
    })
  })

  describe('menú semanal', () => {
    it('guarda un platillo y un dish vacío lo borra', async () => {
      const saved = await request(app.getHttpServer())
        .patch('/v1/meal-plans')
        .set(authHeader(userA))
        .send({ date: TODAY, meal: 'lunch', dish: 'Tacos', prep: false, note: '' })
        .expect(200)
      expect(saved.body.plan.dish).toBe('Tacos')

      const cleared = await request(app.getHttpServer())
        .patch('/v1/meal-plans')
        .set(authHeader(userA))
        .send({ date: TODAY, meal: 'lunch', dish: '', prep: false, note: '' })
        .expect(200)
      expect(cleared.body.plan).toBeNull()
    })

    it('repetir de lunes a viernes exige platillo y aplica a 5 días', async () => {
      await request(app.getHttpServer())
        .post('/v1/meal-plans/repeat-weekdays')
        .set(authHeader(userA))
        .send({ date: TODAY, meal: 'dinner', dish: '', prep: false, note: '' })
        .expect(400)

      const repeated = await request(app.getHttpServer())
        .post('/v1/meal-plans/repeat-weekdays')
        .set(authHeader(userA))
        .send({ date: TODAY, meal: 'dinner', dish: 'Sopa', prep: true, note: '' })
        .expect(201)
      expect(repeated.body).toHaveLength(5)
      expect(repeated.body.every((plan: { dish: string }) => plan.dish === 'Sopa')).toBe(true)
    })

    it('marcar como comida falla si el platillo no existe', async () => {
      await request(app.getHttpServer())
        .post('/v1/meal-plans/toggle-done')
        .set(authHeader(userA))
        .send({ date: '2020-01-01', meal: 'breakfast' })
        .expect(404)
    })

    it('vaciar la semana borra sus platillos, y deshacer los regresa', async () => {
      await request(app.getHttpServer())
        .patch('/v1/meal-plans')
        .set(authHeader(userA))
        .send({ date: TODAY, meal: 'breakfast', dish: 'Fruta', prep: false, note: '' })
        .expect(200)

      const cleared = await request(app.getHttpServer())
        .post('/v1/meal-plans/clear-week')
        .set(authHeader(userA))
        .send({ week: TODAY })
        .expect(201)
      expect(cleared.body.ids.length).toBeGreaterThan(0)

      let week = await request(app.getHttpServer()).get('/v1/meal-plans').query({ week: TODAY }).set(authHeader(userA)).expect(200)
      expect(week.body).toHaveLength(0)

      await undo(userA, cleared.body.undoToken)

      week = await request(app.getHttpServer()).get('/v1/meal-plans').query({ week: TODAY }).set(authHeader(userA)).expect(200)
      expect(week.body.length).toBeGreaterThan(0)
    })
  })

  describe('diario', () => {
    it('solo se puede escribir la entrada de hoy', async () => {
      await request(app.getHttpServer())
        .post('/v1/journal-entries')
        .set(authHeader(userA))
        .send({ date: '2020-01-01', mood: 2, body: '', gratitude: [], tags: [], summary: [] })
        .expect(400)
    })

    it('guarda la entrada de hoy sin cifrar (decisión #38) y la borra con deshacer', async () => {
      const saved = await request(app.getHttpServer())
        .post('/v1/journal-entries')
        .set(authHeader(userA))
        .send({ date: TODAY, mood: 3, body: 'Hoy fue un buen día.', gratitude: ['Café'], tags: ['work'], summary: ['2 de 3 bloques'] })
        .expect(201)
      expect(saved.body.body).toBe('Hoy fue un buen día.')

      const deleted = await request(app.getHttpServer()).delete(`/v1/journal-entries/${TODAY}`).set(authHeader(userA)).expect(200)

      let list = await request(app.getHttpServer()).get('/v1/journal-entries').set(authHeader(userA)).expect(200)
      expect(list.body.some((entry: { entryDate: string }) => entry.entryDate === TODAY)).toBe(false)

      await undo(userA, deleted.body.undoToken)

      list = await request(app.getHttpServer()).get('/v1/journal-entries').set(authHeader(userA)).expect(200)
      expect(list.body.some((entry: { entryDate: string }) => entry.entryDate === TODAY)).toBe(true)
    })
  })

  describe('metas', () => {
    it('una meta de hábito sin bloque, o de proyecto sin proyecto, se rechaza', async () => {
      await request(app.getHttpServer())
        .post('/v1/goals')
        .set(authHeader(userA))
        .send({ title: 'Leer', area: 'personal', kind: 'habit', target: null, unit: '', blockId: null, projectId: null, dueOn: null, why: '' })
        .expect(400)
      await request(app.getHttpServer())
        .post('/v1/goals')
        .set(authHeader(userA))
        .send({ title: 'Terminar', area: 'work', kind: 'project', target: null, unit: '', blockId: null, projectId: null, dueOn: null, why: '' })
        .expect(400)
    })

    it('una meta de número avanza y acumula su registro', async () => {
      const goal = await request(app.getHttpServer())
        .post('/v1/goals')
        .set(authHeader(userA))
        .send({ title: 'Leer libros', area: 'personal', kind: 'number', target: 12, unit: 'libros', blockId: null, projectId: null, dueOn: null, why: '' })
        .expect(201)
      expect(goal.body.target).toBe(12)

      const advanced = await request(app.getHttpServer())
        .post(`/v1/goals/${goal.body.id}/progress`)
        .set(authHeader(userA))
        .send({ amount: 3 })
        .expect(201)
      expect(advanced.body.current).toBe(3)
      expect(advanced.body.log).toHaveLength(1)
      expect(advanced.body.log[0].amount).toBe(3)
    })

    it('una meta de hitos se logra sola al completar el último hito', async () => {
      const goal = await request(app.getHttpServer())
        .post('/v1/goals')
        .set(authHeader(userA))
        .send({ title: 'Correr un maratón', area: 'health', kind: 'milestones', target: null, unit: '', blockId: null, projectId: null, dueOn: null, why: '' })
        .expect(201)

      const milestone = await request(app.getHttpServer())
        .post(`/v1/goals/${goal.body.id}/milestones`)
        .set(authHeader(userA))
        .send({ text: 'Correr 5 km' })
        .expect(201)
      const milestoneId = milestone.body.milestones[0].id

      const toggled = await request(app.getHttpServer())
        .post(`/v1/goals/${goal.body.id}/milestones/${milestoneId}/toggle`)
        .set(authHeader(userA))
        .expect(201)
      expect(toggled.body.achieved).toBe(true)
      expect(toggled.body.goal.status).toBe('done')
      expect(toggled.body.goal.achievedOn).toBe(TODAY)
    })

    it('"la logré" funciona para cualquier meta sin exigir que llegue al target', async () => {
      const goal = await request(app.getHttpServer())
        .post('/v1/goals')
        .set(authHeader(userA))
        .send({ title: 'Ahorrar', area: 'money', kind: 'number', target: 1000, unit: '$', blockId: null, projectId: null, dueOn: null, why: '' })
        .expect(201)

      const achieved = await request(app.getHttpServer()).post(`/v1/goals/${goal.body.id}/achieve`).set(authHeader(userA)).expect(201)
      expect(achieved.body.achieved).toBe(true)
      expect(achieved.body.goal.status).toBe('done')

      await request(app.getHttpServer()).post(`/v1/goals/${goal.body.id}/pause`).set(authHeader(userA)).send({ paused: true }).expect(400)
    })

    it('borrar una meta y deshacer la regresa', async () => {
      const goal = await request(app.getHttpServer())
        .post('/v1/goals')
        .set(authHeader(userA))
        .send({ title: 'Meta temporal', area: 'personal', kind: 'number', target: 5, unit: 'veces', blockId: null, projectId: null, dueOn: null, why: '' })
        .expect(201)

      const deleted = await request(app.getHttpServer()).delete(`/v1/goals/${goal.body.id}`).set(authHeader(userA)).expect(200)

      let list = await request(app.getHttpServer()).get('/v1/goals').set(authHeader(userA)).expect(200)
      expect(list.body.some((g: { id: string }) => g.id === goal.body.id)).toBe(false)

      await undo(userA, deleted.body.undoToken)

      list = await request(app.getHttpServer()).get('/v1/goals').set(authHeader(userA)).expect(200)
      expect(list.body.some((g: { id: string }) => g.id === goal.body.id)).toBe(true)
    })

    it('aislamiento: Beto no ve ni puede tocar las metas de Ana', async () => {
      const goal = await request(app.getHttpServer())
        .post('/v1/goals')
        .set(authHeader(userA))
        .send({ title: 'Solo de Ana', area: 'personal', kind: 'number', target: 1, unit: 'vez', blockId: null, projectId: null, dueOn: null, why: '' })
        .expect(201)

      const listB = await request(app.getHttpServer()).get('/v1/goals').set(authHeader(userB)).expect(200)
      expect(listB.body.some((g: { id: string }) => g.id === goal.body.id)).toBe(false)

      await request(app.getHttpServer()).delete(`/v1/goals/${goal.body.id}`).set(authHeader(userB)).expect(404)
    })
  })
})
