import 'server-only'

import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY_KEY, FINANCE_CURRENCY, FINANCE_MONTHS_BACK } from '@kairo/shared'

import { addDays, dayOfMonth, daysInMonth, type IsoDate } from '@/lib/dates'
import type { MockContext } from '@/lib/mock/context'

import { firstOfNextMonth, monthOf, paidOf, savedOf, shiftMonth } from './finance-utils'
import type { Category, Debt, FinanceRecords, MembershipRecord, MonthKey, PaymentCard, SavingGoal, Transaction } from './types'

// Los datos de ejemplo de Finanzas, armados para parecerse a los números del canvas (FinResumen, FinAhorros…):
// en el mes actual entran $18,500, salen $9,240 en gastos y se apartan $2,000. Los meses anteriores salen de
// la gráfica del canvas. Todo es relativo a "hoy" (el mes actual es el de hoy), así que la pantalla siempre
// se ve viva. El presupuesto y el avance de cada ahorro y de cada deuda NO se escriben aquí: se calculan de
// estos movimientos (finance-utils.ts), igual que hace la API con un SUM.
//
// Solo lo usa el modo demo (lib/demo.ts: sin Supabase ni API). Con la API real, api.ts pide los mismos datos
// a `GET /finance/records`; por eso la semilla tiene la misma forma que esa respuesta.

export type FinanceSeed = FinanceRecords

// Un número estable a partir de unas piezas, para repartir días y cuentas sin azar de verdad (la pantalla no
// cambia en cada recarga).
function mix(...parts: (string | number)[]): number {
  let hash = 2166136261
  for (const char of parts.join('|')) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  hash ^= hash >>> 16
  hash = Math.imul(hash, 2246822507)
  hash ^= hash >>> 13
  hash = Math.imul(hash, 3266489909)
  hash ^= hash >>> 16
  return hash >>> 0
}

const CARDS: PaymentCard[] = [
  { id: 'card-debit', name: 'Débito', kind: 'debit', last4: '4417', color: 'lavender', cutDay: null, dueDay: null },
  { id: 'card-credit', name: 'Crédito', kind: 'credit', last4: '0921', color: 'ink', cutDay: 5, dueDay: 25 },
  { id: 'card-cash', name: 'Efectivo', kind: 'cash', last4: null, color: 'sand', cutDay: null, dueDay: null },
]

// Las mismas categorías de arranque que crea la API (DEFAULT_CATEGORIES), con los límites de FinPresupuesto
// (la API las crea sin límite). En la demo el id es la misma clave: así los movimientos de abajo las nombran
// por 'dining', 'salary'…
const DEMO_LIMITS: Record<string, number> = {
  groceries: 400_000,
  dining: 150_000,
  transport: 120_000,
  memberships: 140_000,
  outings: 200_000,
  health: 80_000,
  [FALLBACK_CATEGORY_KEY]: 100_000,
}

const CATEGORIES: Category[] = DEFAULT_CATEGORIES.map((category) => ({
  ...category,
  id: category.key,
  limitCents: DEMO_LIMITS[category.key] ?? null,
}))

// "Próximos cobros": el cobro va a N días de hoy en lugar de una fecha fija, para que Inicio y la Agenda
// siempre tengan algo cerca. Xbox Game Pass está en pausa, como en el canvas.
const MEMBERSHIP_SEEDS = [
  { id: 'ms1', name: 'Spotify', cents: 12_900, inDays: 1, card: 'card-debit' },
  { id: 'ms2', name: 'Netflix', cents: 29_900, inDays: 2, card: 'card-credit' },
  { id: 'ms3', name: 'Claude Pro', cents: 19_900, inDays: 3, card: 'card-credit' },
  { id: 'ms4', name: 'Gimnasio', cents: 45_000, inDays: 10, card: 'card-debit' },
  { id: 'ms5', name: 'Dominio web', cents: 26_000, inDays: 40, card: 'card-credit', yearly: true },
  { id: 'ms6', name: 'Xbox Game Pass', cents: 22_900, inDays: 5, card: 'card-debit', paused: true },
] as const

// Gasto por categoría de los meses anteriores. Septiembre es el del canvas (con "te pasaste" en comida fuera
// y salidas); los demás se reparten con pesos fijos y suman lo que dice la gráfica.
const EXPENSE_TOTALS: Record<number, number> = { [-5]: 14_100, [-4]: 16_900, [-3]: 13_200, [-2]: 15_800, [-1]: 15_120 }
const MEMBERSHIPS_PESOS = 1_099

function pastCategories(offset: number): Record<string, number> {
  if (offset === -1) return { groceries: 3_900, dining: 2_100, transport: 1_180, outings: 2_300, health: 800, [FALLBACK_CATEGORY_KEY]: 3_741 }
  const rest = EXPENSE_TOTALS[offset] - MEMBERSHIPS_PESOS
  const round10 = (value: number) => Math.round(value / 10) * 10
  const groceries = round10(rest * 0.3)
  const dining = round10(rest * 0.2)
  const transport = round10(rest * 0.1)
  const outings = round10(rest * 0.13)
  const health = round10(rest * 0.05)
  return { groceries, dining, transport, outings, health, [FALLBACK_CATEGORY_KEY]: rest - groceries - dining - transport - outings - health }
}

const NAMES: Record<string, string[]> = {
  groceries: ['Súper de la semana', 'Despensa del mes', 'Fruta y verdura', 'Mercado', 'Carnicería'],
  dining: ['Tacos con amigos', 'Comida con el equipo', 'Café', 'Cena fuera', 'Desayuno'],
  transport: ['Gasolina', 'Uber al trabajo', 'Estacionamiento', 'Metro', 'Servicio del coche'],
  outings: ['Cine con amigos', 'Concierto', 'Museo', 'Salida con la familia'],
  health: ['Farmacia', 'Consulta', 'Dentista'],
  [FALLBACK_CATEGORY_KEY]: ['Regalo de cumpleaños', 'Reparación del celular', 'Papelería', 'Lavandería'],
}

// Cuánto se aparta y se paga en cada mes (en pesos), por mes relativo a hoy. Repartido para que ningún mes
// termine en negativo: de ahí salen los $6,200 del fondo de emergencia, los $3,500 de la laptop, y lo pagado
// de las dos deudas ($3,700 y $2,000).
const EMERGENCY_DEPOSITS: [number, number][] = [[-5, 1_000], [-3, 2_000], [-1, 1_200], [0, 2_000]]
const LAPTOP_DEPOSITS: [number, number][] = [[-5, 1_500], [-3, 1_200], [-1, 800]]
const CREDIT_PAYMENTS: [number, number][] = [[-5, 600], [-2, 800], [-1, 800], [0, 1_500]]
const LOAN_PAYMENTS: [number, number][] = [[-4, 500], [-3, 1_000], [-2, 500]]

const cents = (pesos: number) => pesos * 100

// Parte un monto en 1 a 3 compras (60/40 o 50/30/20, redondeadas a $5), que suman justo el total.
function splitPesos(total: number): number[] {
  const parts = total >= 1_500 ? 3 : total >= 400 ? 2 : 1
  if (parts === 1) return [total]
  const weights = parts === 2 ? [0.6, 0.4] : [0.5, 0.3, 0.2]
  const amounts: number[] = []
  let used = 0
  for (let index = 0; index < parts - 1; index++) {
    const part = Math.max(5, Math.round((total * weights[index]) / 5) * 5)
    amounts.push(part)
    used += part
  }
  amounts.push(total - used)
  return amounts
}

const pad = (value: number) => String(value).padStart(2, '0')

export function buildFinanceSeed(ctx: MockContext): FinanceSeed {
  const today = ctx.today
  const currentMonth = monthOf(today)
  const todayDay = dayOfMonth(today)
  const monthOfOffset = (offset: number): MonthKey => shiftMonth(currentMonth, offset)
  const dayIn = (month: MonthKey, day: number): IsoDate => `${month}-${pad(Math.min(day, daysInMonth(`${month}-01`)))}`
  // Los días del canvas (1 al 8) se reparten entre el 1 y hoy, así los números del mes actual son siempre los
  // mismos sin importar qué día del mes sea.
  const mapDay = (canvasDay: number) => Math.min(todayDay, Math.max(1, Math.round((canvasDay * todayDay) / 8)))

  // --- Membresías: el cobro está a N días de hoy, de ahí salen el día (y el mes, si es anual) ---
  const memberships: MembershipRecord[] = MEMBERSHIP_SEEDS.map((seed) => {
    const next = addDays(today, seed.inDays)
    const yearly = 'yearly' in seed
    return {
      id: seed.id,
      name: seed.name,
      amountCents: seed.cents,
      currency: FINANCE_CURRENCY,
      cadence: yearly ? 'yearly' : 'monthly',
      chargeDay: dayOfMonth(next),
      chargeMonth: yearly ? Number(next.slice(5, 7)) : null,
      chargeWeekday: null,
      cardId: seed.card,
      notify: true,
      status: 'paused' in seed ? 'paused' : 'active',
    }
  })

  const transactions: Transaction[] = []
  let counter = 0
  const add = (transaction: Partial<Transaction> & Pick<Transaction, 'kind' | 'amountCents' | 'occurredOn'>) => {
    counter += 1
    transactions.push({
      id: `tx-${counter}`,
      currency: FINANCE_CURRENCY,
      concept: '',
      note: '',
      categoryId: null,
      cardId: null,
      savingId: null,
      debtId: null,
      membershipId: null,
      repeatMonthly: false,
      ...transaction,
    })
  }

  // --- Los seis meses: ingresos, membresías, gastos por categoría, ahorros y pagos de deuda ---
  for (let offset = -FINANCE_MONTHS_BACK; offset <= 0; offset++) {
    const month = monthOfOffset(offset)
    const current = offset === 0
    const pastDay = (...key: (string | number)[]) => 1 + (mix(month, ...key) % 27)
    const pastCard = (...key: (string | number)[]) => {
      const pick = mix(month, 'card', ...key) % 10
      return pick < 7 ? 'card-debit' : pick < 9 ? 'card-credit' : 'card-cash'
    }

    // Ingresos
    add({ kind: 'income', amountCents: cents(offset >= -3 ? 17_000 : 16_300), occurredOn: dayIn(month, 1), concept: 'Sueldo', categoryId: 'salary', cardId: 'card-debit', repeatMonthly: true })
    add({
      kind: 'income',
      amountCents: cents(1_500),
      occurredOn: dayIn(month, current ? mapDay(2) : pastDay('extra')),
      concept: current ? 'Diseño de logo' : 'Trabajo extra',
      categoryId: 'extra',
      cardId: 'card-debit',
    })

    // Membresías: cada una el día que se cobra, más una de $22 sin membresía ligada. En el mes actual solo
    // están las que ya se cobraron (su día ya pasó): las demás figuran en "Próximos cobros", no aquí.
    for (const seed of MEMBERSHIP_SEEDS.filter((item) => !('paused' in item) && !('yearly' in item))) {
      const chargeDay = memberships.find((item) => item.id === seed.id)?.chargeDay ?? 1
      if (current && chargeDay >= todayDay) continue
      add({ kind: 'expense', amountCents: seed.cents, occurredOn: dayIn(month, chargeDay), concept: seed.name, categoryId: 'memberships', cardId: seed.card, membershipId: seed.id, repeatMonthly: true })
    }
    if (!current || todayDay > 3) {
      add({ kind: 'expense', amountCents: cents(22), occurredOn: dayIn(month, 3), concept: 'iCloud 50 GB', categoryId: 'memberships', cardId: 'card-debit', repeatMonthly: true })
    }

    // Gastos por categoría
    if (current) {
      const expenses: [string, string, number, number, string][] = [
        // [categoría, concepto, pesos, día del canvas, cuenta]
        ['groceries', 'Fruta y verdura', 420, 1, 'card-debit'],
        ['groceries', 'Despensa del meal prep', 1_000, 4, 'card-debit'],
        ['groceries', 'Súper de la semana', 1_180, 5, 'card-debit'],
        ['dining', 'Comida con el equipo', 540, 3, 'card-credit'],
        ['dining', 'Cena fuera', 755, 6, 'card-debit'],
        ['dining', 'Café', 65, 7, 'card-cash'],
        ['dining', 'Tacos con amigos', 320, 8, 'card-debit'],
        ['transport', 'Gasolina', 500, 2, 'card-debit'],
        ['transport', 'Estacionamiento', 55, 6, 'card-cash'],
        ['transport', 'Uber al trabajo', 85, 8, 'card-credit'],
        ['outings', 'Concierto', 650, 6, 'card-credit'],
        ['outings', 'Cine con amigos', 250, 7, 'card-debit'],
        [FALLBACK_CATEGORY_KEY, 'Regalo de cumpleaños', 1_200, 5, 'card-debit'],
        [FALLBACK_CATEGORY_KEY, 'Reparación del celular', 1_121, 7, 'card-credit'],
      ]
      for (const [categoryId, concept, pesos, canvasDay, cardId] of expenses) {
        add({ kind: 'expense', amountCents: cents(pesos), occurredOn: dayIn(month, mapDay(canvasDay)), concept, categoryId, cardId })
      }
    } else {
      const byCategory = pastCategories(offset)
      for (const [categoryId, pesos] of Object.entries(byCategory)) {
        if (pesos <= 0) continue
        splitPesos(pesos).forEach((part, index) => {
          const names = NAMES[categoryId]
          add({
            kind: 'expense',
            amountCents: cents(part),
            occurredOn: dayIn(month, pastDay(categoryId, index)),
            concept: names[mix(month, categoryId, 'name', index) % names.length],
            categoryId,
            cardId: pastCard(categoryId, index),
          })
        })
      }
    }

    // Ahorros
    for (const [at, pesos] of EMERGENCY_DEPOSITS) {
      if (at !== offset) continue
      add({ kind: 'saving_deposit', amountCents: cents(pesos), occurredOn: dayIn(month, current ? mapDay(3) : pastDay('emergency')), concept: 'Fondo de emergencia', savingId: 'sav-emergency', cardId: 'card-debit', repeatMonthly: current })
    }
    for (const [at, pesos] of LAPTOP_DEPOSITS) {
      if (at !== offset) continue
      add({ kind: 'saving_deposit', amountCents: cents(pesos), occurredOn: dayIn(month, pastDay('laptop')), concept: 'Laptop nueva', savingId: 'sav-laptop', cardId: 'card-debit' })
    }

    // Pagos de deuda
    for (const [at, pesos] of CREDIT_PAYMENTS) {
      if (at !== offset) continue
      add({ kind: 'debt_payment', amountCents: cents(pesos), occurredOn: dayIn(month, current ? mapDay(7) : pastDay('credit')), concept: 'Pago tarjeta de crédito', debtId: 'debt-credit', cardId: 'card-debit' })
    }
    for (const [at, pesos] of LOAN_PAYMENTS) {
      if (at !== offset) continue
      add({ kind: 'debt_payment', amountCents: cents(pesos), occurredOn: dayIn(month, pastDay('loan')), concept: 'Pago préstamo de Diego', debtId: 'debt-diego', cardId: 'card-debit' })
    }
  }

  // Lo más nuevo primero; dentro de un mismo día, lo último que se agregó.
  const ordered = transactions.reverse().sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))

  // --- Ahorros y deudas: solo lo que no se calcula (nombre, meta, tipo) ---
  const dueMonth = shiftMonth(currentMonth, 5)
  const savings: SavingGoal[] = [
    { id: 'sav-emergency', name: 'Fondo de emergencia', targetCents: cents(10_000), dueOn: dayIn(dueMonth, 31) },
    { id: 'sav-laptop', name: 'Laptop nueva', targetCents: cents(18_000), dueOn: null },
  ]

  // El pago de la tarjeta es el día 20: este mes si todavía no pasa, y si no, el siguiente.
  const creditDue = dayIn(currentMonth, 20) >= today ? dayIn(currentMonth, 20) : dayIn(monthOf(firstOfNextMonth(today)), 20)
  const debts: Debt[] = [
    { id: 'debt-credit', name: 'Tarjeta Crédito ••0921', kind: 'card', totalCents: cents(8_000), annualInterestPct: null, monthlyPaymentCents: cents(600), nextPaymentOn: creditDue },
    { id: 'debt-diego', name: 'Préstamo de Diego', kind: 'person', totalCents: cents(5_000), annualInterestPct: null, monthlyPaymentCents: null, nextPaymentOn: null },
  ]

  // Lo ahorrado y lo pagado salen de los movimientos de arriba, igual que la API los suma en la base: así la
  // demo se ve exactamente como se vería con datos reales.
  const lastPaymentOf = (debtId: string): IsoDate | null =>
    ordered.filter((item) => item.kind === 'debt_payment' && item.debtId === debtId).reduce<IsoDate | null>((last, item) => (last === null || item.occurredOn > last ? item.occurredOn : last), null)

  // Copias, no las listas de arriba: lo que se edite en la sesión no debe cambiar las semillas.
  return {
    cards: CARDS.map((card) => ({ ...card })),
    archivedCards: [],
    categories: CATEGORIES.map((category) => ({ ...category })),
    transactions: ordered,
    savings: savings.map((goal) => ({ ...goal, savedCents: savedOf(goal.id, ordered) })),
    debts: debts.map((debt) => ({ ...debt, paidCents: paidOf(debt.id, ordered), lastPaymentOn: lastPaymentOf(debt.id) })),
    memberships,
    budgetAlerts: { at80: true, overLimit: true },
  }
}
