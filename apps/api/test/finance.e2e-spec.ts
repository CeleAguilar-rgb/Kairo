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
import { cards } from '../src/db/schema/finance'
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

const newTransaction = (overrides: Record<string, unknown> = {}) => ({
  kind: 'expense',
  amountCents: 25_000,
  concept: 'Café',
  note: '',
  occurredOn: '2027-03-01',
  categoryId: null,
  cardId: null,
  savingId: null,
  debtId: null,
  repeatMonthly: false,
  ...overrides,
})

const newCard = (overrides: Record<string, unknown> = {}) => ({
  name: 'Débito del trabajo',
  kind: 'debit',
  last4: '4417',
  color: 'lavender',
  cutDay: null,
  dueDay: null,
  ...overrides,
})

const newMembership = (overrides: Record<string, unknown> = {}) => ({
  name: 'Netflix',
  amountCents: 29_900,
  cadence: 'monthly',
  chargeDay: 12,
  chargeMonth: null,
  chargeWeekday: null,
  cardId: null,
  notify: true,
  status: 'active',
  ...overrides,
})

type Category = { id: string; key: string | null; name: string; kind: string; limitCents: number | null }
type TransactionJson = { id: string; categoryId: string | null; occurredOn: string; amountCents: number }
type Records = {
  cards: { id: string }[]
  archivedCards: { id: string }[]
  categories: Category[]
  transactions: TransactionJson[]
  savings: { id: string; savedCents: number }[]
  debts: { id: string; paidCents: number; lastPaymentOn: string | null; nextPaymentOn: string | null }[]
  memberships: { id: string }[]
  budgetAlerts: { at80: boolean; overLimit: boolean }
}

describe('Finanzas (e2e)', () => {
  let app: INestApplication
  let db: PostgresJsDatabase
  let userA: TestUser
  let userB: TestUser

  const get = (user: TestUser, url: string) => request(app.getHttpServer()).get(url).set(authHeader(user))
  const post = (user: TestUser, url: string, body: unknown = {}) => request(app.getHttpServer()).post(url).set(authHeader(user)).send(body as object)
  const patch = (user: TestUser, url: string, body: unknown) => request(app.getHttpServer()).patch(url).set(authHeader(user)).send(body as object)
  const del = (user: TestUser, url: string) => request(app.getHttpServer()).delete(url).set(authHeader(user))

  async function records(user: TestUser, from = '2000-01-01'): Promise<Records> {
    const res = await get(user, `/v1/finance/records?from=${from}`).expect(200)
    return res.body as Records
  }

  async function category(user: TestUser, key: string): Promise<Category> {
    const found = (await records(user)).categories.find((item) => item.key === key)
    if (!found) throw new Error(`No hay categoría ${key}`)
    return found
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

    await post(userA, '/v1/me/onboarding', { name: 'Ana', avatarPath: 'star', sections: ['finance'] }).expect(201)
    await post(userB, '/v1/me/onboarding', { name: 'Beto', avatarPath: 'moon', sections: ['finance'] }).expect(201)
  })

  afterAll(async () => {
    // Las tablas de Finanzas cuelgan de profiles con ON DELETE CASCADE: borrar el perfil se las lleva.
    await db.delete(profiles).where(eq(profiles.id, userA.id))
    await db.delete(profiles).where(eq(profiles.id, userB.id))
    await deleteTestUser(userA.id)
    await deleteTestUser(userB.id)
    await app.close()
    // app.close() no cierra la conexión de Postgres (mismo motivo que account.e2e-spec.ts).
    await db.$client.end()
  })

  describe('lectura', () => {
    it('rechaza una petición sin sesión', () => {
      return request(app.getHttpServer()).get('/v1/finance/records?from=2026-01-01').expect(401)
    })

    it('rechaza una fecha de inicio que falta o no es una fecha', async () => {
      await get(userA, '/v1/finance/records').expect(400)
      await get(userA, '/v1/finance/records?from=ayer').expect(400)
    })

    it('crea las categorías de arranque la primera vez, una sola vez, sin límites', async () => {
      const first = await records(userA)
      expect(first.categories).toHaveLength(11)
      const other = first.categories.find((item) => item.key === 'other')
      expect(other?.name).toBe('Otros')
      expect(first.categories.every((item) => item.limitCents === null)).toBe(true)
      expect(first.categories.filter((item) => item.kind === 'expense')).toHaveLength(7)
      expect(first.budgetAlerts).toEqual({ at80: true, overLimit: true })

      const second = await records(userA)
      expect(second.categories.map((item) => item.id)).toEqual(first.categories.map((item) => item.id))
    })

    it('cada persona tiene sus propias categorías (ids distintos)', async () => {
      const a = await records(userA)
      const b = await records(userB)
      const idsA = new Set(a.categories.map((item) => item.id))
      expect(b.categories.some((item) => idsA.has(item.id))).toBe(false)
    })
  })

  describe('tarjetas', () => {
    it('crea una tarjeta de débito y una de crédito, y el efectivo sin números', async () => {
      const debit = await post(userA, '/v1/finance/cards', newCard()).expect(201)
      expect(debit.body).toMatchObject({ name: 'Débito del trabajo', kind: 'debit', last4: '4417' })

      const credit = await post(userA, '/v1/finance/cards', newCard({ name: 'Crédito', kind: 'credit', last4: '0921', cutDay: 5, dueDay: 25 })).expect(201)
      expect(credit.body).toMatchObject({ cutDay: 5, dueDay: 25 })

      // El efectivo no lleva números ni días: aunque lleguen, no se guardan.
      const cash = await post(userA, '/v1/finance/cards', newCard({ name: 'Efectivo', kind: 'cash', last4: '', cutDay: 3, dueDay: 4 })).expect(201)
      expect(cash.body).toMatchObject({ last4: null, cutDay: null, dueDay: null })
    })

    it('rechaza lo que no son exactamente 4 dígitos (regla 9: nunca el número completo)', async () => {
      await post(userA, '/v1/finance/cards', newCard({ last4: '4417123412341234' })).expect(400)
      await post(userA, '/v1/finance/cards', newCard({ last4: '12a4' })).expect(400)
      await post(userA, '/v1/finance/cards', newCard({ last4: '' })).expect(400)
    })

    it('el crédito pide día de corte y de pago', async () => {
      await post(userA, '/v1/finance/cards', newCard({ kind: 'credit', cutDay: null, dueDay: 25 })).expect(400)
      await post(userA, '/v1/finance/cards', newCard({ kind: 'credit', cutDay: 5, dueDay: null })).expect(400)
    })

    it('la base misma rechaza un número de tarjeta completo, aunque el código tuviera un error', async () => {
      await expect(
        db.insert(cards).values({ userId: userA.id, name: 'Mala', kind: 'debit', last4: '4417123412341234', color: 'ink' }),
      ).rejects.toThrow()
    })
  })

  describe('movimientos', () => {
    it('crea un gasto con categoría y cuenta, y lo devuelve en la lectura', async () => {
      const dining = await category(userA, 'dining')
      const card = (await records(userA)).cards[0]!
      const res = await post(userA, '/v1/finance/transactions', newTransaction({ categoryId: dining.id, cardId: card.id, concept: 'Tacos' })).expect(201)
      expect(res.body).toMatchObject({ kind: 'expense', amountCents: 25_000, concept: 'Tacos', categoryId: dining.id, cardId: card.id, currency: 'MXN', membershipId: null })

      const listed = await records(userA)
      expect(listed.transactions.some((item) => item.id === res.body.id)).toBe(true)
    })

    it('rechaza montos que no son centavos enteros y positivos', async () => {
      const dining = await category(userA, 'dining')
      for (const amountCents of [0, -5, 10.5, 'mucho']) {
        await post(userA, '/v1/finance/transactions', newTransaction({ categoryId: dining.id, amountCents })).expect(400)
      }
    })

    it('un gasto o un ingreso pide una categoría de su mismo tipo', async () => {
      const dining = await category(userA, 'dining')
      const salary = await category(userA, 'salary')
      await post(userA, '/v1/finance/transactions', newTransaction({ categoryId: null })).expect(400)
      const wrongKind = await post(userA, '/v1/finance/transactions', newTransaction({ categoryId: salary.id })).expect(400)
      expect(wrongKind.body.error.code).toBe('CATEGORY_INVALID')
      const wrongKindIncome = await post(userA, '/v1/finance/transactions', newTransaction({ kind: 'income', categoryId: dining.id })).expect(400)
      expect(wrongKindIncome.body.error.code).toBe('CATEGORY_INVALID')
      await post(userA, '/v1/finance/transactions', newTransaction({ kind: 'income', categoryId: salary.id, amountCents: 1_700_000 })).expect(201)
    })

    it('un id que no es uuid se rechaza antes de llegar a la base', async () => {
      await post(userA, '/v1/finance/transactions', newTransaction({ categoryId: 'dining' })).expect(400)
      await patch(userA, '/v1/finance/transactions/no-es-uuid', newTransaction()).expect(400)
    })

    it('no se puede usar la categoría, la tarjeta, el ahorro ni la deuda de otro usuario', async () => {
      const dining = await category(userA, 'dining')
      const foreignCategory = await category(userB, 'dining')
      const foreignCard = (await post(userB, '/v1/finance/cards', newCard({ name: 'De Beto' })).expect(201)).body.id
      const foreignSaving = (await post(userB, '/v1/finance/savings', { name: 'Ahorro de Beto', targetCents: 100_000, dueOn: null }).expect(201)).body.id
      const foreignDebt = (await post(userB, '/v1/finance/debts', { name: 'Deuda de Beto', kind: 'person', totalCents: 100_000, monthlyPaymentCents: null, annualInterestPct: null }).expect(201)).body.id

      const withCategory = await post(userA, '/v1/finance/transactions', newTransaction({ categoryId: foreignCategory.id })).expect(400)
      expect(withCategory.body.error.code).toBe('CATEGORY_INVALID')
      const withCard = await post(userA, '/v1/finance/transactions', newTransaction({ categoryId: dining.id, cardId: foreignCard })).expect(400)
      expect(withCard.body.error.code).toBe('CARD_NOT_FOUND')
      const withSaving = await post(userA, '/v1/finance/transactions', newTransaction({ kind: 'saving_deposit', savingId: foreignSaving })).expect(400)
      expect(withSaving.body.error.code).toBe('SAVING_NOT_FOUND')
      const withDebt = await post(userA, '/v1/finance/transactions', newTransaction({ kind: 'debt_payment', debtId: foreignDebt, amountCents: 1_000 })).expect(400)
      expect(withDebt.body.error.code).toBe('DEBT_NOT_FOUND')

      // Y por la ruta rápida tampoco: a la API le da igual que el id exista, no es de esta persona.
      await post(userA, `/v1/finance/savings/${foreignSaving}/deposit`, { amountCents: 1_000 }).expect(404)
      await post(userA, `/v1/finance/debts/${foreignDebt}/pay`, { amountCents: 1_000 }).expect(404)
    })

    it('edita un movimiento y no se puede editar ni borrar el de otro usuario', async () => {
      const dining = await category(userA, 'dining')
      const created = await post(userA, '/v1/finance/transactions', newTransaction({ categoryId: dining.id, concept: 'Solo de Ana' })).expect(201)

      const edited = await patch(userA, `/v1/finance/transactions/${created.body.id}`, newTransaction({ categoryId: dining.id, concept: 'Corregido', amountCents: 30_000 })).expect(200)
      expect(edited.body).toMatchObject({ concept: 'Corregido', amountCents: 30_000 })

      await patch(userB, `/v1/finance/transactions/${created.body.id}`, newTransaction({ categoryId: (await category(userB, 'dining')).id })).expect(404)
      await del(userB, `/v1/finance/transactions/${created.body.id}`).expect(404)
      await patch(userA, `/v1/finance/transactions/${UNKNOWN_ID}`, newTransaction({ categoryId: dining.id })).expect(404)
    })

    it('cada quien ve solo sus propios movimientos', async () => {
      const diningB = await category(userB, 'dining')
      const mine = await post(userB, '/v1/finance/transactions', newTransaction({ categoryId: diningB.id, concept: 'De Beto' })).expect(201)

      const a = await records(userA)
      const b = await records(userB)
      expect(a.transactions.some((item) => item.id === mine.body.id)).toBe(false)
      expect(b.transactions.some((item) => item.id === mine.body.id)).toBe(true)
    })

    it('borra a la papelera y "Deshacer" lo devuelve; un token ajeno o alterado no hace nada', async () => {
      const dining = await category(userA, 'dining')
      const created = await post(userA, '/v1/finance/transactions', newTransaction({ categoryId: dining.id, concept: 'Para borrar' })).expect(201)

      const deleted = await del(userA, `/v1/finance/transactions/${created.body.id}`).expect(200)
      expect(deleted.body.id).toBe(created.body.id)
      expect((await records(userA)).transactions.some((item) => item.id === created.body.id)).toBe(false)

      // Beto no puede deshacer el borrado de Ana con el token de Ana (el restore lleva where userId).
      await post(userB, '/v1/finance/undo', { token: deleted.body.undoToken }).expect(201)
      expect((await records(userA)).transactions.some((item) => item.id === created.body.id)).toBe(false)

      await post(userA, '/v1/finance/undo', { token: deleted.body.undoToken }).expect(201)
      expect((await records(userA)).transactions.some((item) => item.id === created.body.id)).toBe(true)
    })

    it('solo trae los movimientos desde la fecha pedida', async () => {
      const dining = await category(userA, 'dining')
      const old = await post(userA, '/v1/finance/transactions', newTransaction({ categoryId: dining.id, occurredOn: '2020-01-15' })).expect(201)
      expect((await records(userA, '2020-01-01')).transactions.some((item) => item.id === old.body.id)).toBe(true)
      expect((await records(userA, '2026-01-01')).transactions.some((item) => item.id === old.body.id)).toBe(false)
    })
  })

  describe('ahorros', () => {
    let savingId: string

    it('crea un ahorro con lo ahorrado en cero', async () => {
      const res = await post(userA, '/v1/finance/savings', { name: 'Fondo de emergencia', targetCents: 1_000_000, dueOn: '2027-12-31' }).expect(201)
      expect(res.body).toMatchObject({ name: 'Fondo de emergencia', targetCents: 1_000_000, dueOn: '2027-12-31', savedCents: 0 })
      savingId = res.body.id
    })

    it('rechaza una meta que no es positiva', async () => {
      await post(userA, '/v1/finance/savings', { name: 'X', targetCents: 0, dueOn: null }).expect(400)
      await post(userA, '/v1/finance/savings', { name: '', targetCents: 1_000, dueOn: null }).expect(400)
    })

    it('aportar y retirar crean movimientos y lo ahorrado se calcula de ellos', async () => {
      await post(userA, `/v1/finance/savings/${savingId}/deposit`, { amountCents: 200_000 }).expect(201)
      const withdrawn = await post(userA, `/v1/finance/savings/${savingId}/withdraw`, { amountCents: 50_000 }).expect(201)
      expect(withdrawn.body).toMatchObject({ kind: 'saving_withdrawal', amountCents: 50_000, savingId, occurredOn: TODAY })

      const saving = (await records(userA)).savings.find((item) => item.id === savingId)
      expect(saving?.savedCents).toBe(150_000)
    })

    it('no se puede retirar más de lo ahorrado, ni por la ruta rápida ni escribiendo un movimiento', async () => {
      const quick = await post(userA, `/v1/finance/savings/${savingId}/withdraw`, { amountCents: 150_001 }).expect(400)
      expect(quick.body.error).toMatchObject({ code: 'SAVING_INSUFFICIENT', message: 'Solo tienes $1,500 en este ahorro.' })

      const manual = await post(userA, '/v1/finance/transactions', newTransaction({ kind: 'saving_withdrawal', savingId, amountCents: 150_001 })).expect(400)
      expect(manual.body.error).toMatchObject({ code: 'SAVING_INSUFFICIENT', message: 'Solo tienes $1,500 en ese ahorro.' })

      await post(userA, '/v1/finance/transactions', newTransaction({ kind: 'saving_withdrawal', savingId, amountCents: 150_000 })).expect(201)
      expect((await records(userA)).savings.find((item) => item.id === savingId)?.savedCents).toBe(0)
    })

    it('al corregir un retiro no cuenta contra sí mismo', async () => {
      await post(userA, `/v1/finance/savings/${savingId}/deposit`, { amountCents: 100_000 }).expect(201)
      const withdrawal = await post(userA, '/v1/finance/transactions', newTransaction({ kind: 'saving_withdrawal', savingId, amountCents: 100_000 })).expect(201)
      // Hay $1,000 ahorrados menos este mismo retiro de $1,000: corregirlo a $900 es válido.
      await patch(userA, `/v1/finance/transactions/${withdrawal.body.id}`, newTransaction({ kind: 'saving_withdrawal', savingId, amountCents: 90_000 })).expect(200)
    })

    it('lo ahorrado cuenta TODOS los movimientos, aunque sean más viejos que la ventana pedida', async () => {
      await post(userA, '/v1/finance/transactions', newTransaction({ kind: 'saving_deposit', savingId, amountCents: 70_000, occurredOn: '2020-02-01' })).expect(201)
      const recent = await records(userA, '2026-01-01')
      expect(recent.transactions.some((item) => item.occurredOn === '2020-02-01')).toBe(false)
      // $1,000 aportados menos el retiro corregido de $900 = $100, más los $700 de 2020 = $800.
      expect(recent.savings.find((item) => item.id === savingId)?.savedCents).toBe(80_000)
    })

    it('borrar un ahorro conserva sus movimientos y "Deshacer" lo devuelve', async () => {
      const deleted = await del(userA, `/v1/finance/savings/${savingId}`).expect(200)
      const after = await records(userA)
      expect(after.savings.some((item) => item.id === savingId)).toBe(false)
      expect(after.transactions.some((item) => item.occurredOn === TODAY)).toBe(true)

      await del(userB, `/v1/finance/savings/${savingId}`).expect(404)
      await post(userA, '/v1/finance/undo', { token: deleted.body.undoToken }).expect(201)
      expect((await records(userA)).savings.some((item) => item.id === savingId)).toBe(true)
    })
  })

  describe('deudas', () => {
    let debtId: string

    it('crea una deuda; con pago mensual su próximo pago es el primer día del mes que viene', async () => {
      const res = await post(userA, '/v1/finance/debts', { name: 'Tarjeta', kind: 'card', totalCents: 500_000, monthlyPaymentCents: 60_000, annualInterestPct: null }).expect(201)
      expect(res.body).toMatchObject({ name: 'Tarjeta', totalCents: 500_000, paidCents: 0, lastPaymentOn: null })
      expect(res.body.nextPaymentOn).toMatch(/^\d{4}-\d{2}-01$/)
      expect(res.body.nextPaymentOn > TODAY).toBe(true)
      debtId = res.body.id

      const noMonthly = await post(userA, '/v1/finance/debts', { name: 'Préstamo', kind: 'person', totalCents: 100_000, monthlyPaymentCents: null, annualInterestPct: 12.5 }).expect(201)
      expect(noMonthly.body.nextPaymentOn).toBeNull()
      expect(noMonthly.body.annualInterestPct).toBe(12.5)
    })

    it('registra pagos y lo pagado se calcula de ellos', async () => {
      const first = await post(userA, `/v1/finance/debts/${debtId}/pay`, { amountCents: 200_000 }).expect(201)
      expect(first.body.liquidated).toBe(false)
      expect(first.body.transaction).toMatchObject({ kind: 'debt_payment', amountCents: 200_000, debtId, concept: 'Pago Tarjeta' })

      const debt = (await records(userA)).debts.find((item) => item.id === debtId)
      expect(debt?.paidCents).toBe(200_000)
      expect(debt?.lastPaymentOn).toBe(TODAY)
    })

    it('no se paga de más: escribirlo a mano se rechaza y la ruta rápida paga solo lo que falta', async () => {
      const manual = await post(userA, '/v1/finance/transactions', newTransaction({ kind: 'debt_payment', debtId, amountCents: 300_001 })).expect(400)
      expect(manual.body.error).toMatchObject({ code: 'DEBT_OVERPAID', message: 'Solo te faltan $3,000 de esa deuda.' })

      const last = await post(userA, `/v1/finance/debts/${debtId}/pay`, { amountCents: 999_999_99 }).expect(201)
      expect(last.body.liquidated).toBe(true)
      expect(last.body.transaction.amountCents).toBe(300_000)

      const again = await post(userA, `/v1/finance/debts/${debtId}/pay`, { amountCents: 1_000 }).expect(400)
      expect(again.body.error.code).toBe('DEBT_ALREADY_PAID')
      expect((await records(userA)).debts.find((item) => item.id === debtId)?.paidCents).toBe(500_000)
    })

    it('borrar una deuda conserva sus pagos y "Deshacer" la devuelve', async () => {
      const deleted = await del(userA, `/v1/finance/debts/${debtId}`).expect(200)
      expect((await records(userA)).debts.some((item) => item.id === debtId)).toBe(false)
      await del(userB, `/v1/finance/debts/${debtId}`).expect(404)
      await post(userA, '/v1/finance/undo', { token: deleted.body.undoToken }).expect(201)
      expect((await records(userA)).debts.some((item) => item.id === debtId)).toBe(true)
    })
  })

  describe('membresías y tarjetas', () => {
    it('crea y edita una membresía, y solo cuenta lo que pide su frecuencia', async () => {
      const created = await post(userA, '/v1/finance/memberships', newMembership({ chargeMonth: 5, chargeWeekday: 2 })).expect(201)
      expect(created.body).toMatchObject({ name: 'Netflix', cadence: 'monthly', chargeDay: 12, chargeMonth: null, chargeWeekday: null, currency: 'MXN' })

      const weekly = await patch(userA, `/v1/finance/memberships/${created.body.id}`, newMembership({ cadence: 'weekly', chargeDay: 9, chargeWeekday: 3 })).expect(200)
      expect(weekly.body).toMatchObject({ cadence: 'weekly', chargeDay: null, chargeWeekday: 3 })

      const paused = await patch(userA, `/v1/finance/memberships/${created.body.id}`, newMembership({ status: 'paused' })).expect(200)
      expect(paused.body.status).toBe('paused')
    })

    it('cada frecuencia pide su día', async () => {
      await post(userA, '/v1/finance/memberships', newMembership({ chargeDay: null })).expect(400)
      await post(userA, '/v1/finance/memberships', newMembership({ cadence: 'yearly', chargeMonth: null })).expect(400)
      await post(userA, '/v1/finance/memberships', newMembership({ cadence: 'weekly', chargeDay: null, chargeWeekday: null })).expect(400)
    })

    it('no se puede pagar con la tarjeta de otro usuario', async () => {
      const foreignCard = (await post(userB, '/v1/finance/cards', newCard({ name: 'Ajena' })).expect(201)).body.id
      const res = await post(userA, '/v1/finance/memberships', newMembership({ cardId: foreignCard })).expect(400)
      expect(res.body.error.code).toBe('CARD_NOT_FOUND')
    })

    it('cada quien ve solo sus membresías y tarjetas en la lectura de Inicio y Agenda', async () => {
      const mine = await post(userB, '/v1/finance/memberships', newMembership({ name: 'Solo de Beto' })).expect(201)
      const a = await get(userA, '/v1/finance/memberships').expect(200)
      const b = await get(userB, '/v1/finance/memberships').expect(200)
      expect(a.body.memberships.some((item: { id: string }) => item.id === mine.body.id)).toBe(false)
      expect(b.body.memberships.some((item: { id: string }) => item.id === mine.body.id)).toBe(true)
    })

    it('no se puede editar ni borrar la membresía de otro usuario', async () => {
      const created = await post(userA, '/v1/finance/memberships', newMembership({ name: 'Solo de Ana' })).expect(201)
      await patch(userB, `/v1/finance/memberships/${created.body.id}`, newMembership()).expect(404)
      await del(userB, `/v1/finance/memberships/${created.body.id}`).expect(404)
    })

    it('borra a la papelera y "Deshacer" la devuelve', async () => {
      const created = await post(userA, '/v1/finance/memberships', newMembership({ name: 'Para borrar' })).expect(201)
      const deleted = await del(userA, `/v1/finance/memberships/${created.body.id}`).expect(200)
      const gone = await get(userA, '/v1/finance/memberships').expect(200)
      expect(gone.body.memberships.some((item: { id: string }) => item.id === created.body.id)).toBe(false)

      await post(userA, '/v1/finance/undo', { token: deleted.body.undoToken }).expect(201)
      const back = await get(userA, '/v1/finance/memberships').expect(200)
      expect(back.body.memberships.some((item: { id: string }) => item.id === created.body.id)).toBe(true)
    })

    it('borrar una tarjeta se lleva solo sus membresías, deja el historial y "Deshacer" devuelve las dos cosas', async () => {
      const card = (await post(userA, '/v1/finance/cards', newCard({ name: 'Para borrar', last4: '1111' })).expect(201)).body.id
      const otherCard = (await post(userA, '/v1/finance/cards', newCard({ name: 'Se queda', last4: '2222' })).expect(201)).body.id
      const m1 = (await post(userA, '/v1/finance/memberships', newMembership({ name: 'Uno', cardId: card })).expect(201)).body.id
      const m2 = (await post(userA, '/v1/finance/memberships', newMembership({ name: 'Dos', cardId: card })).expect(201)).body.id
      const m3 = (await post(userA, '/v1/finance/memberships', newMembership({ name: 'Tres', cardId: otherCard })).expect(201)).body.id
      const dining = await category(userA, 'dining')
      const paid = (await post(userA, '/v1/finance/transactions', newTransaction({ categoryId: dining.id, cardId: card, concept: 'Pagado con ella' })).expect(201)).body.id

      const deleted = await del(userA, `/v1/finance/cards/${card}`).expect(200)
      const after = await get(userA, '/v1/finance/memberships').expect(200)
      const ids = after.body.memberships.map((item: { id: string }) => item.id)
      expect(ids).not.toContain(m1)
      expect(ids).not.toContain(m2)
      expect(ids).toContain(m3)
      expect(after.body.cards.some((item: { id: string }) => item.id === card)).toBe(false)

      // La tarjeta sigue disponible para mostrar con cuál se pagó un movimiento viejo.
      const full = await records(userA)
      expect(full.archivedCards.some((item) => item.id === card)).toBe(true)
      expect(full.transactions.find((item) => item.id === paid)).toBeDefined()

      await post(userA, '/v1/finance/undo', { token: deleted.body.undoToken }).expect(201)
      const back = await get(userA, '/v1/finance/memberships').expect(200)
      const backIds = back.body.memberships.map((item: { id: string }) => item.id)
      expect(backIds).toEqual(expect.arrayContaining([m1, m2, m3]))
      expect(back.body.cards.some((item: { id: string }) => item.id === card)).toBe(true)
    })

    it('un token de "Deshacer" alterado no puede devolver las membresías de otra persona', async () => {
      const cardA = (await post(userA, '/v1/finance/cards', newCard({ name: 'De Ana', last4: '3333' })).expect(201)).body.id
      const theirs = (await post(userB, '/v1/finance/memberships', newMembership({ name: 'Borrada de Beto' })).expect(201)).body.id
      await del(userB, `/v1/finance/memberships/${theirs}`).expect(200)

      const deleted = await del(userA, `/v1/finance/cards/${cardA}`).expect(200)
      const forged = JSON.stringify({ ...JSON.parse(deleted.body.undoToken), membershipIds: [theirs] })
      await post(userA, '/v1/finance/undo', { token: forged }).expect(201)

      const b = await get(userB, '/v1/finance/memberships').expect(200)
      expect(b.body.memberships.some((item: { id: string }) => item.id === theirs)).toBe(false)
    })
  })

  describe('presupuesto', () => {
    it('pone, cambia y quita el límite de una categoría de gasto', async () => {
      const groceries = await category(userA, 'groceries')
      const set = await post(userA, '/v1/finance/budget/limit', { categoryId: groceries.id, limitCents: 400_000 }).expect(201)
      expect(set.body).toMatchObject({ id: groceries.id, limitCents: 400_000 })
      expect((await category(userA, 'groceries')).limitCents).toBe(400_000)

      const removed = await post(userA, '/v1/finance/budget/limit', { categoryId: groceries.id, limitCents: null }).expect(201)
      expect(removed.body.limitCents).toBeNull()
      await post(userA, '/v1/finance/budget/limit', { categoryId: groceries.id, limitCents: 0 }).expect(400)
    })

    it('una categoría de ingreso o ajena no se puede presupuestar', async () => {
      const salary = await category(userA, 'salary')
      const foreign = await category(userB, 'groceries')
      await post(userA, '/v1/finance/budget/limit', { categoryId: salary.id, limitCents: 100_000 }).expect(404)
      await post(userA, '/v1/finance/budget/limit', { categoryId: foreign.id, limitCents: 100_000 }).expect(404)
      expect((await category(userB, 'groceries')).limitCents).toBeNull()
    })

    it('agrega una categoría de gasto con $500 de límite, sin repetir nombres', async () => {
      const created = await post(userA, '/v1/finance/budget/categories', { name: 'Mascotas', color: 'peach' }).expect(201)
      expect(created.body).toMatchObject({ name: 'Mascotas', kind: 'expense', key: null, limitCents: 50_000, icon: 'tag' })

      const repeated = await post(userA, '/v1/finance/budget/categories', { name: 'mascotas', color: 'sand' }).expect(400)
      expect(repeated.body.error.code).toBe('CATEGORY_NAME_TAKEN')
      await post(userA, '/v1/finance/budget/categories', { name: '', color: 'sand' }).expect(400)
    })

    it('"Otros" no se puede borrar; otra categoría sí, y sus gastos se cuentan en "Otros" hasta que se deshace', async () => {
      const other = await category(userA, 'other')
      const refused = await del(userA, `/v1/finance/budget/categories/${other.id}`).expect(400)
      expect(refused.body.error.code).toBe('CATEGORY_NOT_DELETABLE')

      const health = await category(userA, 'health')
      const spent = (await post(userA, '/v1/finance/transactions', newTransaction({ categoryId: health.id, concept: 'Farmacia' })).expect(201)).body.id

      const deleted = await del(userA, `/v1/finance/budget/categories/${health.id}`).expect(200)
      const during = await records(userA)
      expect(during.categories.some((item) => item.id === health.id)).toBe(false)
      expect(during.transactions.find((item) => item.id === spent)?.categoryId).toBe(other.id)

      await post(userA, '/v1/finance/undo', { token: deleted.body.undoToken }).expect(201)
      const after = await records(userA)
      expect(after.categories.some((item) => item.id === health.id)).toBe(true)
      expect(after.transactions.find((item) => item.id === spent)?.categoryId).toBe(health.id)
    })

    it('no se puede borrar la categoría de otro usuario, ni usar una borrada en un movimiento', async () => {
      const foreign = await category(userB, 'outings')
      await del(userA, `/v1/finance/budget/categories/${foreign.id}`).expect(404)

      const outings = await category(userA, 'outings')
      await del(userA, `/v1/finance/budget/categories/${outings.id}`).expect(200)
      const res = await post(userA, '/v1/finance/transactions', newTransaction({ categoryId: outings.id })).expect(400)
      expect(res.body.error.code).toBe('CATEGORY_INVALID')
    })

    it('guarda los dos avisos del presupuesto', async () => {
      const res = await post(userA, '/v1/finance/budget/alerts', { at80: false, overLimit: true }).expect(201)
      expect(res.body).toEqual({ at80: false, overLimit: true })
      expect((await records(userA)).budgetAlerts).toEqual({ at80: false, overLimit: true })
      expect((await records(userB)).budgetAlerts).toEqual({ at80: true, overLimit: true })
      await post(userA, '/v1/finance/budget/alerts', { at80: 'sí', overLimit: true }).expect(400)
    })

    it('"Usar lo real" sin gastos este mes avisa, y con gastos redondea a $50 y se puede deshacer', async () => {
      // Beto todavía no tiene ningún gasto de este mes.
      const nothing = await post(userB, '/v1/finance/budget/adopt-actual').expect(400)
      expect(nothing.body.error.code).toBe('NOTHING_TO_ADOPT')

      const dining = await category(userB, 'dining')
      await post(userB, '/v1/finance/budget/limit', { categoryId: dining.id, limitCents: 150_000 }).expect(201)
      await post(userB, '/v1/finance/transactions', newTransaction({ categoryId: dining.id, amountCents: 123_456, occurredOn: TODAY })).expect(201)

      const adopted = await post(userB, '/v1/finance/budget/adopt-actual').expect(201)
      expect((await category(userB, 'dining')).limitCents).toBe(125_000)
      // Las que no tuvieron gasto conservan su límite (aquí, ninguno).
      expect((await category(userB, 'transport')).limitCents).toBeNull()

      await post(userB, '/v1/finance/undo', { token: adopted.body.undoToken }).expect(201)
      expect((await category(userB, 'dining')).limitCents).toBe(150_000)
    })
  })

  // El front (apps/web/src/features/finance/types.ts) recibe estas respuestas con un cast, no con una validación:
  // TypeScript no avisaría de un campo mal escrito o faltante. Este test fija la forma exacta que espera.
  describe('contrato con el front', () => {
    const keys = (value: object) => Object.keys(value).sort()

    it('GET /finance/records devuelve exactamente la forma de FinanceRecords', async () => {
      // Una tarjeta borrada (sin deshacer), para que haya una archivada que revisar.
      const archived = (await post(userA, '/v1/finance/cards', newCard({ name: 'Archivada', last4: '9999' })).expect(201)).body.id
      await del(userA, `/v1/finance/cards/${archived}`).expect(200)

      const full = await records(userA)
      expect(keys(full)).toEqual(['archivedCards', 'budgetAlerts', 'cards', 'categories', 'debts', 'memberships', 'savings', 'transactions'])

      expect(keys(full.cards[0]!)).toEqual(['color', 'cutDay', 'dueDay', 'id', 'kind', 'last4', 'name'])
      expect(keys(full.archivedCards[0]!)).toEqual(['color', 'cutDay', 'dueDay', 'id', 'kind', 'last4', 'name'])
      expect(keys(full.categories[0]!)).toEqual(['color', 'icon', 'id', 'key', 'kind', 'limitCents', 'name'])
      expect(keys(full.transactions[0]!)).toEqual([
        'amountCents', 'cardId', 'categoryId', 'concept', 'currency', 'debtId', 'id', 'kind', 'membershipId', 'note', 'occurredOn', 'repeatMonthly', 'savingId',
      ])
      expect(keys(full.savings[0]!)).toEqual(['dueOn', 'id', 'name', 'savedCents', 'targetCents'])
      expect(keys(full.debts[0]!)).toEqual([
        'annualInterestPct', 'id', 'kind', 'lastPaymentOn', 'monthlyPaymentCents', 'name', 'nextPaymentOn', 'paidCents', 'totalCents',
      ])
      expect(keys(full.memberships[0]!)).toEqual([
        'amountCents', 'cadence', 'cardId', 'chargeDay', 'chargeMonth', 'chargeWeekday', 'currency', 'id', 'name', 'notify', 'status',
      ])
      expect(keys(full.budgetAlerts)).toEqual(['at80', 'overLimit'])
    })

    it('los montos y las fechas llegan como el front los espera (centavos enteros y "AAAA-MM-DD")', async () => {
      const full = await records(userA)
      for (const item of full.transactions) {
        expect(Number.isInteger(item.amountCents)).toBe(true)
        expect(item.occurredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
      for (const item of full.savings) expect(Number.isInteger(item.savedCents)).toBe(true)
      for (const item of full.debts) expect(Number.isInteger(item.paidCents)).toBe(true)
    })

    it('GET /finance/memberships devuelve exactamente la forma de MembershipsData', async () => {
      const res = await get(userA, '/v1/finance/memberships').expect(200)
      expect(keys(res.body)).toEqual(['cards', 'memberships'])
      expect(keys(res.body.memberships[0])).toEqual([
        'amountCents', 'cadence', 'cardId', 'chargeDay', 'chargeMonth', 'chargeWeekday', 'currency', 'id', 'name', 'notify', 'status',
      ])
    })
  })

  describe('"Deshacer"', () => {
    it('rechaza un token vacío, uno que no se entiende y uno con ids que no son uuid', async () => {
      await post(userA, '/v1/finance/undo', { token: '' }).expect(400)
      await post(userA, '/v1/finance/undo', {}).expect(400)
      const garbage = await post(userA, '/v1/finance/undo', { token: 'esto-no-es-un-token' }).expect(404)
      expect(garbage.body.error.code).toBe('UNDO_EXPIRED')
      await post(userA, '/v1/finance/undo', { token: JSON.stringify({ type: 'transaction', id: 'no-uuid' }) }).expect(404)
      await post(userA, '/v1/finance/undo', { token: JSON.stringify({ type: 'borrar-todo' }) }).expect(404)
    })
  })
})
