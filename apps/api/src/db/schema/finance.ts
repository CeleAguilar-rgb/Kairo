import { sql } from 'drizzle-orm'
import { bigint, boolean, check, date, doublePrecision, index, integer, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { app, profiles, userColumns } from './_shared'

export const cardKindEnum = app.enum('card_kind', ['debit', 'credit', 'cash'])
export const cardColorEnum = app.enum('card_color', ['ink', 'lavender', 'sand', 'lavender_soft'])
export const categoryKindEnum = app.enum('category_kind', ['expense', 'income'])
export const categoryColorEnum = app.enum('category_color', ['lavender', 'lavender_soft', 'sand', 'peach', 'cream'])
export const categoryIconEnum = app.enum('category_icon', ['cart', 'food', 'car', 'card', 'star', 'heart', 'dots', 'tag', 'income', 'gift'])
export const transactionKindEnum = app.enum('transaction_kind', ['expense', 'income', 'saving_deposit', 'saving_withdrawal', 'debt_payment'])
export const debtKindEnum = app.enum('debt_kind', ['person', 'card', 'loan', 'other'])
export const membershipCadenceEnum = app.enum('membership_cadence', ['monthly', 'yearly', 'weekly'])
export const membershipStatusEnum = app.enum('membership_status', ['active', 'paused'])

// Quinto módulo de Fase 1b. Todo el dinero va en centavos enteros (regla 7 de CLAUDE.md): bigint porque un
// monto puede pasar de los 2,100 millones de centavos que caben en un integer (el tope de la app son 10,000
// millones, MAX_AMOUNT_CENTS). `mode: 'number'` es seguro: 10^10 cabe de sobra en los 2^53 de un number.
// Cada monto lleva su `currency` (decisión #10: solo MXN por ahora, la columna queda preparada).

// Solo alias y últimos 4 dígitos (regla 9 de CLAUDE.md). Además del esquema de Zod, la base misma rechaza
// cualquier cosa que no sean exactamente 4 dígitos en `last4`: así un número completo no puede guardarse ni por
// error ni con un bug en la API.
export const cards = app
  .table(
    'cards',
    {
      ...userColumns,
      name: text('name').notNull(),
      kind: cardKindEnum('kind').notNull(),
      last4: text('last4'),
      color: cardColorEnum('color').notNull().default('lavender'),
      // Solo crédito: día de corte y día límite de pago.
      cutDay: integer('cut_day'),
      dueDay: integer('due_day'),
    },
    (table) => [
      check('cards_last4_format', sql`${table.last4} is null or ${table.last4} ~ '^[0-9]{4}$'`),
      check('cards_cut_day_range', sql`${table.cutDay} is null or (${table.cutDay} between 1 and 31)`),
      check('cards_due_day_range', sql`${table.dueDay} is null or (${table.dueDay} between 1 and 31)`),
    ],
  )
  .enableRLS()

// `key` distingue las categorías que la API crea sola (DEFAULT_CATEGORIES en @kairo/shared) de las que la
// persona agrega; es nulo en las suyas. Borrar una categoría de gasto NO mueve sus movimientos: la categoría
// va a la papelera y al leer, un movimiento cuya categoría ya no está se cuenta en "Otros" (así "Deshacer" es
// solo devolver la categoría). `monthly_limit_cents` nulo = sin límite.
export const categories = app
  .table(
    'categories',
    {
      ...userColumns,
      key: text('key'),
      name: text('name').notNull(),
      kind: categoryKindEnum('kind').notNull(),
      color: categoryColorEnum('color').notNull(),
      icon: categoryIconEnum('icon').notNull().default('tag'),
      monthlyLimitCents: bigint('monthly_limit_cents', { mode: 'number' }),
      // Orden dentro de su tipo (gasto / ingreso): lo pone el service, nunca la pantalla.
      position: integer('position').notNull().default(0),
    },
    (table) => [
      check('categories_limit_positive', sql`${table.monthlyLimitCents} is null or ${table.monthlyLimitCents} > 0`),
      // Dos categorías de sistema con la misma clave por persona no pueden existir: es lo que hace seguro
      // crear las de arranque aunque dos peticiones lleguen a la vez.
      uniqueIndex('categories_user_key_uq').on(table.userId, table.key).where(sql`${table.key} is not null`),
    ],
  )
  .enableRLS()

// Lo ahorrado NO se guarda: se calcula de los movimientos (saving_deposit menos saving_withdrawal).
export const savingsGoals = app
  .table(
    'savings_goals',
    {
      ...userColumns,
      name: text('name').notNull(),
      targetCents: bigint('target_cents', { mode: 'number' }).notNull(),
      currency: text('currency').notNull().default('MXN'),
      dueOn: date('due_on', { mode: 'string' }),
    },
    (table) => [check('savings_goals_target_positive', sql`${table.targetCents} > 0`)],
  )
  .enableRLS()

// Lo pagado NO se guarda: se calcula de los movimientos de tipo debt_payment. `next_payment_on` sí: es una
// fecha que escribe la persona (o que la API pone al crear la deuda con pago mensual).
export const debts = app
  .table(
    'debts',
    {
      ...userColumns,
      name: text('name').notNull(),
      kind: debtKindEnum('kind').notNull(),
      totalCents: bigint('total_cents', { mode: 'number' }).notNull(),
      currency: text('currency').notNull().default('MXN'),
      annualInterestPct: doublePrecision('annual_interest_pct'),
      monthlyPaymentCents: bigint('monthly_payment_cents', { mode: 'number' }),
      nextPaymentOn: date('next_payment_on', { mode: 'string' }),
    },
    (table) => [
      check('debts_total_positive', sql`${table.totalCents} > 0`),
      check('debts_monthly_payment_positive', sql`${table.monthlyPaymentCents} is null or ${table.monthlyPaymentCents} > 0`),
    ],
  )
  .enableRLS()

// El próximo cobro NO se guarda: se calcula al leer con el día de cobro (así nunca queda en el pasado).
// charge_day: mensual y anual (1 a 31); charge_month: solo anual; charge_weekday: solo semanal (0 = domingo).
// Si se borra la tarjeta de verdad (la papelera la purga a los 30 días), la membresía queda sin tarjeta.
export const memberships = app
  .table(
    'memberships',
    {
      ...userColumns,
      name: text('name').notNull(),
      amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
      currency: text('currency').notNull().default('MXN'),
      cadence: membershipCadenceEnum('cadence').notNull(),
      chargeDay: integer('charge_day'),
      chargeMonth: integer('charge_month'),
      chargeWeekday: integer('charge_weekday'),
      cardId: uuid('card_id').references(() => cards.id, { onDelete: 'set null' }),
      notify: boolean('notify').notNull().default(true),
      status: membershipStatusEnum('status').notNull().default('active'),
    },
    (table) => [
      check('memberships_amount_positive', sql`${table.amountCents} > 0`),
      check('memberships_charge_day_range', sql`${table.chargeDay} is null or (${table.chargeDay} between 1 and 31)`),
      check('memberships_charge_month_range', sql`${table.chargeMonth} is null or (${table.chargeMonth} between 1 and 12)`),
      check('memberships_charge_weekday_range', sql`${table.chargeWeekday} is null or (${table.chargeWeekday} between 0 and 6)`),
    ],
  )
  .enableRLS()

// Cada referencia (categoría, tarjeta, ahorro, deuda, membresía) es opcional y apunta a una fila que también
// puede estar en la papelera (deleted_at): el historial nunca pierde de qué era un movimiento. Qué referencias
// pide cada tipo (un ahorro para saving_*, una deuda para debt_payment…) lo garantiza el service, no la base:
// una FK `set null` (cuando la papelera purgue de verdad) rompería un CHECK así. `concept` vacío = el
// movimiento se llama como su categoría.
export const transactions = app
  .table(
    'transactions',
    {
      ...userColumns,
      kind: transactionKindEnum('kind').notNull(),
      amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
      currency: text('currency').notNull().default('MXN'),
      concept: text('concept').notNull().default(''),
      note: text('note').notNull().default(''),
      occurredOn: date('occurred_on', { mode: 'string' }).notNull(),
      categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
      cardId: uuid('card_id').references(() => cards.id, { onDelete: 'set null' }),
      savingId: uuid('saving_id').references(() => savingsGoals.id, { onDelete: 'set null' }),
      debtId: uuid('debt_id').references(() => debts.id, { onDelete: 'set null' }),
      membershipId: uuid('membership_id').references(() => memberships.id, { onDelete: 'set null' }),
      repeatMonthly: boolean('repeat_monthly').notNull().default(false),
    },
    (table) => [
      check('transactions_amount_positive', sql`${table.amountCents} > 0`),
      // Las pantallas piden "los movimientos de un mes" y "desde tal día": por persona y por fecha.
      index('transactions_user_date_idx').on(table.userId, table.occurredOn),
    ],
  )
  .enableRLS()

// Una fila por persona (la API la crea al guardar los avisos por primera vez; sin fila valen los valores por
// defecto, los dos avisos prendidos). Los avisos de verdad llegan con las tareas programadas: aquí solo se
// guarda la preferencia. Sin deleted_at: no es algo que se borre ni se recupere.
export const financeSettings = app
  .table('finance_settings', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    budgetAlertAt80: boolean('budget_alert_at_80').notNull().default(true),
    budgetAlertOver: boolean('budget_alert_over').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  })
  .enableRLS()
