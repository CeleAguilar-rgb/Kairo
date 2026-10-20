import { z } from 'zod'

import {
  CARD_COLORS,
  CARD_KINDS,
  CATEGORY_COLORS,
  DEBT_KINDS,
  MAX_AMOUNT_CENTS,
  MEMBERSHIP_CADENCES,
  MEMBERSHIP_STATUSES,
  TRANSACTION_KINDS,
} from './constants'

// Un id que llega de la pantalla: siempre un uuid (con la API real toda fila lo tiene) y cada consulta lleva
// `where: { id, userId }`. Si no lo fuera, llegaría hasta Postgres y fallaría ahí con un 500. Se define aquí y
// no se importa de otro módulo: un módulo no se apoya en los archivos internos de otro.
const id = z.uuid()

const day = z.iso.date()

// Un monto en centavos enteros. La pantalla escribe pesos ("250", "$1,250.50") y los convierte antes de
// validar; este esquema solo ve centavos.
const amountCents = z
  .number('Escribe cuánto fue, por ejemplo 250.')
  .int('Escribe cuánto fue, por ejemplo 250.')
  .positive('Escribe cuánto fue, por ejemplo 250.')
  .max(MAX_AMOUNT_CENTS, 'Ese monto es demasiado grande.')

// Un mes por su clave ('2026-10'). Viaja en la dirección (`?mes=2026-10`), así que se valida como cualquier
// otra entrada aunque venga de la barra de direcciones.
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

export type MonthKey = z.infer<typeof monthSchema>

// --- Movimientos ----------------------------------------------------------------------------------

// El formulario de un movimiento (FinMovimientos): sirve para crear y editar. Cada tipo pide lo suyo.
export const transactionSchema = z
  .object({
    kind: z.enum(TRANSACTION_KINDS),
    amountCents,
    // Opcional: si se deja vacío, el movimiento se llama como su categoría.
    concept: z.string().trim().max(80, 'Máximo 80 caracteres.'),
    note: z.string().trim().max(160, 'Máximo 160 caracteres.'),
    occurredOn: day,
    // Gastos e ingresos llevan categoría.
    categoryId: id.nullable(),
    // La cuenta de la que sale (o a la que entra) el dinero.
    cardId: id.nullable(),
    // A qué ahorro va (o de cuál sale) y qué deuda se paga.
    savingId: id.nullable(),
    debtId: id.nullable(),
    repeatMonthly: z.boolean(),
  })
  .superRefine((transaction, context) => {
    const { kind } = transaction
    if ((kind === 'expense' || kind === 'income') && transaction.categoryId === null) {
      context.addIssue({ code: 'custom', path: ['categoryId'], message: 'Elige una categoría.' })
    }
    if ((kind === 'saving_deposit' || kind === 'saving_withdrawal') && transaction.savingId === null) {
      context.addIssue({ code: 'custom', path: ['savingId'], message: 'Elige a qué ahorro va.' })
    }
    if (kind === 'debt_payment' && transaction.debtId === null) {
      context.addIssue({ code: 'custom', path: ['debtId'], message: 'Elige qué deuda pagas.' })
    }
  })

export type TransactionInput = z.infer<typeof transactionSchema>

// Aportar a un ahorro, retirar de él o registrar un pago de una deuda (los tres campos rápidos de Ahorros
// y deudas): solo el monto. Se vuelven un movimiento.
export const moneyAmountSchema = z.object({ amountCents })

export type MoneyAmountInput = z.infer<typeof moneyAmountSchema>

// --- Ahorros y deudas -----------------------------------------------------------------------------

export const savingGoalSchema = z.object({
  name: z.string().trim().min(1, 'Ponle un nombre para reconocerlo.').max(60, 'Máximo 60 caracteres.'),
  targetCents: z
    .number('Escribe la meta, por ejemplo 15000.')
    .int('Escribe la meta, por ejemplo 15000.')
    .positive('Escribe la meta, por ejemplo 15000.')
    .max(MAX_AMOUNT_CENTS, 'Esa meta es demasiado grande.'),
  dueOn: day.nullable(),
})

export type SavingGoalInput = z.infer<typeof savingGoalSchema>

export const debtSchema = z.object({
  name: z.string().trim().min(1, 'Ponle un nombre para reconocerla.').max(60, 'Máximo 60 caracteres.'),
  kind: z.enum(DEBT_KINDS),
  totalCents: z
    .number('Escribe cuánto debes en total.')
    .int('Escribe cuánto debes en total.')
    .positive('Escribe cuánto debes en total.')
    .max(MAX_AMOUNT_CENTS, 'Ese monto es demasiado grande.'),
  // Opcionales: con el pago por mes, la deuda sale en "Próximos pagos" y avisa un día antes.
  monthlyPaymentCents: z.number().int().positive('El pago por mes tiene que ser mayor a cero.').max(MAX_AMOUNT_CENTS).nullable(),
  annualInterestPct: z.number('Escribe un porcentaje, como 12.').min(0, 'El interés no puede ser negativo.').max(500, 'Revisa el interés.').nullable(),
})

export type DebtInput = z.infer<typeof debtSchema>

// --- Membresías y tarjetas ------------------------------------------------------------------------

// Formulario de una membresía (FinMembresia). El día de cobro depende de cada cuánto se cobra: un día del
// mes (mensual), un día y un mes (anual) o un día de la semana (semanal).
export const membershipSchema = z
  .object({
    name: z.string().trim().min(1, 'Escribe el nombre del servicio, como Netflix.').max(60, 'Máximo 60 caracteres.'),
    amountCents,
    cadence: z.enum(MEMBERSHIP_CADENCES),
    chargeDay: z.number().int().min(1, 'Escribe un día del 1 al 31.').max(31, 'Escribe un día del 1 al 31.').nullable(),
    // Solo anual: el mes del cobro (1 a 12).
    chargeMonth: z.number().int().min(1).max(12).nullable(),
    // Solo semanal: 0 = domingo … 6 = sábado.
    chargeWeekday: z.number().int().min(0).max(6).nullable(),
    cardId: id.nullable(),
    notify: z.boolean(),
    status: z.enum(MEMBERSHIP_STATUSES),
  })
  .superRefine((membership, context) => {
    if (membership.cadence !== 'weekly' && membership.chargeDay === null) {
      context.addIssue({ code: 'custom', path: ['chargeDay'], message: 'Escribe un día del 1 al 31.' })
    }
    if (membership.cadence === 'yearly' && membership.chargeMonth === null) {
      context.addIssue({ code: 'custom', path: ['chargeMonth'], message: 'Elige el mes del cobro.' })
    }
    if (membership.cadence === 'weekly' && membership.chargeWeekday === null) {
      context.addIssue({ code: 'custom', path: ['chargeWeekday'], message: 'Elige el día de la semana.' })
    }
  })

export type MembershipInput = z.infer<typeof membershipSchema>

// Formulario de una tarjeta o cuenta. NUNCA el número completo (regla 9 de CLAUDE.md): solo un alias y los
// últimos 4 dígitos. El efectivo no lleva números.
export const cardSchema = z
  .object({
    name: z.string().trim().min(1, 'Ponle un nombre, como "Débito del trabajo".').max(40, 'Máximo 40 caracteres.'),
    kind: z.enum(CARD_KINDS),
    last4: z.string().trim(),
    color: z.enum(CARD_COLORS),
    // Solo crédito: el día de corte y el día límite de pago.
    cutDay: z.number().int().min(1, 'Escribe un día del 1 al 31.').max(31, 'Escribe un día del 1 al 31.').nullable(),
    dueDay: z.number().int().min(1, 'Escribe un día del 1 al 31.').max(31, 'Escribe un día del 1 al 31.').nullable(),
  })
  .superRefine((card, context) => {
    if (card.kind !== 'cash' && !/^\d{4}$/.test(card.last4)) {
      context.addIssue({ code: 'custom', path: ['last4'], message: 'Escribe los últimos 4 números.' })
    }
    if (card.kind === 'credit' && card.cutDay === null) {
      context.addIssue({ code: 'custom', path: ['cutDay'], message: 'Escribe el día de corte.' })
    }
    if (card.kind === 'credit' && card.dueDay === null) {
      context.addIssue({ code: 'custom', path: ['dueDay'], message: 'Escribe el día límite de pago.' })
    }
  })

export type CardInput = z.infer<typeof cardSchema>

// --- Presupuesto ----------------------------------------------------------------------------------

// Una categoría nueva de gasto (FinPresupuesto): nombre y color; su límite se escribe después en su fila.
export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Ponle un nombre a la categoría.').max(30, 'Máximo 30 caracteres.'),
  color: z.enum(CATEGORY_COLORS),
})

export type CategoryInput = z.infer<typeof categorySchema>

// El límite mensual de una categoría. Sin límite (null) la categoría no avisa ni muestra barra.
export const budgetLimitSchema = z.object({
  categoryId: id,
  limitCents: z.number().int().positive('El límite tiene que ser mayor a cero.').max(MAX_AMOUNT_CENTS, 'Ese límite es demasiado grande.').nullable(),
})

export type BudgetLimitInput = z.infer<typeof budgetLimitSchema>

// Los dos avisos del presupuesto: al llegar al 80% y al pasarse.
export const budgetAlertsSchema = z.object({
  at80: z.boolean(),
  overLimit: z.boolean(),
})

export type BudgetAlertsInput = z.infer<typeof budgetAlertsSchema>

// Una referencia suelta a algo de Finanzas por su id: borrarlo, pausarlo…
export const financeIdSchema = id

// Lo que la API necesita para leer Finanzas: desde qué día traer los movimientos (el inicio de la ventana de
// 6 meses de la gráfica). Lo de antes de esa fecha no hace falta para ninguna pantalla.
export const financeRecordsQuerySchema = z.object({ from: z.iso.date() })

export type FinanceRecordsQuery = z.infer<typeof financeRecordsQuerySchema>

// El "token" de Deshacer: lo arma la API al borrar (es la acción exacta a deshacer, codificada en el string) y
// la pantalla solo lo devuelve. Aquí solo se revisa que sea un texto de tamaño razonable; la API lo decodifica
// y lo vuelve a validar (nunca se confía en él).
export const financeUndoTokenSchema = z.string().min(1).max(4000)
