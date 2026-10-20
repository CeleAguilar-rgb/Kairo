import type {
  CardColor,
  CardKind,
  CategoryColor,
  CategoryIcon,
  CategoryKind,
  DebtKind,
  MembershipCadence,
  MembershipStatus,
  MonthKey,
  TransactionKind,
} from '@kairo/shared'

import type { IsoDate } from '@/lib/dates'

// Tablas de docs/guides/data-model.md (camelCase). Dinero siempre en centavos enteros + currency (regla 7).
// De la tarjeta solo alias y últimos 4 dígitos (regla 9).
export type { CardColor, CardKind, CategoryColor, CategoryKind, DebtKind, MembershipCadence, MembershipStatus, MonthKey, TransactionKind }

export const CARD_KIND_LABEL: Record<CardKind, string> = {
  debit: 'Débito',
  credit: 'Crédito',
  cash: 'Efectivo',
}

// Tarjeta o cuenta con la que se paga. El efectivo no lleva números ni corte.
export type PaymentCard = {
  id: string
  name: string
  kind: CardKind
  last4: string | null
  color: CardColor
  // Solo crédito: día de corte y día límite de pago.
  cutDay: number | null
  dueDay: number | null
}

// El ícono de una categoría: una clave, no un dibujo (finance-meta.ts guarda el trazo de cada una).
export type CategoryIconKey = CategoryIcon

export type Category = {
  id: string
  // Solo las categorías que la API crea sola la traen ('other' es "Otros", la que no se puede borrar); las
  // que agrega la persona son null. No es el id: ese es un uuid distinto por persona.
  key: string | null
  name: string
  kind: CategoryKind
  color: CategoryColor
  icon: CategoryIconKey
  // Solo gastos: lo que se quiere gastar al mes. null = sin límite.
  limitCents: number | null
}

export type Transaction = {
  id: string
  kind: TransactionKind
  amountCents: number
  currency: string
  concept: string
  note: string
  occurredOn: IsoDate
  categoryId: string | null
  cardId: string | null
  savingId: string | null
  debtId: string | null
  membershipId: string | null
  repeatMonthly: boolean
}

export type SavingGoal = {
  id: string
  name: string
  targetCents: number
  dueOn: IsoDate | null
}

export type Debt = {
  id: string
  name: string
  kind: DebtKind
  totalCents: number
  annualInterestPct: number | null
  monthlyPaymentCents: number | null
  nextPaymentOn: IsoDate | null
}

// Lo guardado de una membresía. El próximo cobro NO se guarda: se calcula al leer, con el día de cobro.
export type MembershipRecord = {
  id: string
  name: string
  amountCents: number
  currency: string
  cadence: MembershipCadence
  // Mensual y anual: el día del mes. Semanal: null.
  chargeDay: number | null
  // Solo anual: 1 a 12.
  chargeMonth: number | null
  // Solo semanal: 0 = domingo … 6 = sábado.
  chargeWeekday: number | null
  cardId: string | null
  notify: boolean
  status: MembershipStatus
}

// Una membresía como la leen Inicio, Agenda y Finanzas: con su tarjeta y su próximo cobro ya resueltos.
export type Membership = {
  id: string
  name: string
  amountCents: number
  currency: string
  cadence: MembershipCadence
  // Siempre un día del mes: en las semanales es el del próximo cobro.
  chargeDay: number
  chargeMonth: number | null
  chargeWeekday: number | null
  nextChargeOn: IsoDate
  card: PaymentCard | null
  notify: boolean
  status: MembershipStatus
}

// --- Lo que devuelve la API (hechos crudos) -------------------------------------------------------------

// Un ahorro como lo devuelve la API: lo guardado, más lo ahorrado hasta hoy (suma de TODOS sus movimientos,
// no solo de los que se descargan).
export type SavingRecord = SavingGoal & { savedCents: number }

// Una deuda con lo pagado hasta hoy y el día de su último pago (de los movimientos de esa deuda).
export type DebtRecord = Debt & { paidCents: number; lastPaymentOn: IsoDate | null }

// Todo lo que leen las cinco pestañas (`GET /finance/records`): las filas tal cual. Los totales del mes, el
// presupuesto, la gráfica y los textos los arma api.ts con estas filas (decisión #38).
export type FinanceRecords = {
  cards: PaymentCard[]
  // Las tarjetas que se borraron: los movimientos viejos siguen diciendo con cuál se pagaron.
  archivedCards: PaymentCard[]
  categories: Category[]
  // Del más nuevo al más viejo, desde el inicio de la ventana de 6 meses.
  transactions: Transaction[]
  savings: SavingRecord[]
  debts: DebtRecord[]
  memberships: MembershipRecord[]
  budgetAlerts: { at80: boolean; overLimit: boolean }
}

// Lo mínimo que leen Inicio, la Agenda y Membresías (`GET /finance/memberships`).
export type MembershipsData = { cards: PaymentCard[]; memberships: MembershipRecord[] }

// --- Lo que arma api.ts para cada pantalla ----------------------------------------------------------

export type MonthTotals = {
  incomeCents: number
  expenseCents: number
  // Lo apartado a ahorros en el mes, menos lo que se retiró.
  savedCents: number
  debtPaidCents: number
  // Lo que te queda: ingresos − gastos − ahorro − pagos de deuda.
  leftCents: number
}

export type MonthBar = {
  month: MonthKey
  label: string
  incomeCents: number
  expenseCents: number
  leftCents: number
  // El mes que se está viendo.
  selected: boolean
}

export type BudgetState = 'none' | 'ok' | 'warn' | 'over'

export type BudgetRow = {
  category: Category
  spentCents: number
  limitCents: number | null
  state: BudgetState
}

export type SavingView = SavingGoal & {
  savedCents: number
  // "Meta: marzo 2027" o "Sin fecha meta".
  dueText: string
  // "Aparta $760 al mes para llegar".
  tip: string
}

export type DebtView = Debt & {
  paidCents: number
  leftCents: number
  // Cuando ya se liquidó: el día del último pago.
  paidOffOn: IsoDate | null
  // "Tarjeta", "Pago mínimo $600".
  chips: string[]
  // "próximo pago 20 oct" o "sin fecha fija".
  nextText: string
}

export type ChargeRow = {
  id: string
  name: string
  amountCents: number
  currency: string
  nextChargeOn: IsoDate
  card: PaymentCard | null
}

// Los colores de la barra "¿En qué se fue?": van por lugar (el mayor gasto primero), no por categoría.
export type ShareTone = 'ink' | 'strong' | 'accent' | 'rose' | 'sand'

export type CategoryShare = {
  id: string
  name: string
  tone: ShareTone
  spentCents: number
  percent: number
}

export type FinanceSummary = {
  month: MonthKey
  isCurrentMonth: boolean
  totals: MonthTotals
  // La línea gris bajo cada cifra: "Sueldo y trabajo extra", "Fondo de emergencia", "Van 16 días; quedan 15".
  notes: { income: string; saved: string; left: string }
  bars: MonthBar[]
  budget: BudgetRow[]
  savings: SavingView[]
  debts: DebtView[]
  charges: ChargeRow[]
  moves: Transaction[]
  shares: CategoryShare[]
  // Para mostrar cada movimiento: tarjeta, categoría, ahorro y deuda por id.
  lookup: FinanceLookup
}

// Lo que hace falta para escribir el texto de un movimiento ("Comida fuera · Débito ••4417").
export type FinanceLookup = {
  categories: Category[]
  cards: PaymentCard[]
}

export type MovementsView = {
  month: MonthKey
  transactions: Transaction[]
  lookup: FinanceLookup
  // Opciones del formulario: las cuentas vivas (no las borradas), los ahorros y las deudas (con lo que falta).
  cards: PaymentCard[]
  savings: SavingGoal[]
  debts: DebtView[]
}

export type SavingsDebtsView = {
  savings: SavingView[]
  debts: DebtView[]
  savedTotalCents: number
  debtLeftCents: number
}

export type CardView = PaymentCard & {
  membershipCount: number
  // Lo que suman sus membresías activas al mes.
  monthlyCents: number
}

export type MembershipsView = {
  cards: CardView[]
  memberships: Membership[]
  monthlyCents: number
  activeCount: number
}

export type BudgetView = {
  // El mes del presupuesto (el actual).
  month: MonthKey
  rows: BudgetRow[]
  spentCents: number
  plannedCents: number
  // "Van 16 de 31 días · gastaste el 33% de lo planeado".
  progressText: string
  alerts: { at80: boolean; overLimit: boolean }
  lookup: FinanceLookup
}
