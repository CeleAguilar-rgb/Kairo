// Constantes de Finanzas, SIN zod a propósito (igual que daily/constants.ts): el front las importa para
// pintar opciones sin descargar la librería de validación. Todo es en pesos (decisión #10): la moneda se
// guarda en cada monto (`currency`) por si algún día se agregan otras.

export const FINANCE_CURRENCY = 'MXN'

// El dinero viaja en centavos enteros (regla 7 de CLAUDE.md). Tope de un monto suelto: 100 millones de pesos.
export const MAX_AMOUNT_CENTS = 100_000_000_00

// Qué tan atrás se puede ver un mes: el actual y 5 más, que son los 6 de la gráfica del Resumen.
export const FINANCE_MONTHS_BACK = 5

// Tipo de un movimiento (docs/guides/data-model.md: `transactions.kind`). Ahorrar y pagar una deuda NO son
// gastos: la plata sigue siendo tuya, y por eso se separan en el Resumen.
export const TRANSACTION_KINDS = ['expense', 'income', 'saving_deposit', 'saving_withdrawal', 'debt_payment'] as const
export type TransactionKind = (typeof TRANSACTION_KINDS)[number]

// Lo que se elige al escribir un movimiento (FinMovimientos): Gasto, Ingreso, A ahorro y Pago de deuda. El
// retiro de un ahorro se hace desde Ahorros y deudas ("Retirar"); aquí solo se puede ver o corregir.
export const TRANSACTION_FORM_KINDS = ['expense', 'income', 'saving_deposit', 'debt_payment'] as const
export type TransactionFormKind = (typeof TRANSACTION_FORM_KINDS)[number]

// Cuentas con las que se paga. El canvas trae también "Efectivo": no lleva números ni día de corte.
export const CARD_KINDS = ['debit', 'credit', 'cash'] as const
export type CardKind = (typeof CARD_KINDS)[number]

// Colores de una tarjeta (FinMembresia): "Tinta", "Lavanda", "Arena" y "Lavanda suave".
export const CARD_COLORS = ['ink', 'lavender', 'sand', 'lavender_soft'] as const
export type CardColor = (typeof CARD_COLORS)[number]

// Colores de una categoría (FinPresupuesto): Lavanda, Lavanda suave, Arena, Durazno y Crema.
export const CATEGORY_COLORS = ['lavender', 'lavender_soft', 'sand', 'peach', 'cream'] as const
export type CategoryColor = (typeof CATEGORY_COLORS)[number]

// Las categorías de gasto llevan un límite mensual; las de ingreso no.
export const CATEGORY_KINDS = ['expense', 'income'] as const
export type CategoryKind = (typeof CATEGORY_KINDS)[number]

// Cada cuánto se cobra una membresía. El modelo de datos solo tenía mensual y anual; el canvas pide también
// semanal (FinMembresia), y queda anotado en la nota de sesión para la migración.
export const MEMBERSHIP_CADENCES = ['monthly', 'yearly', 'weekly'] as const
export type MembershipCadence = (typeof MEMBERSHIP_CADENCES)[number]

export const MEMBERSHIP_STATUSES = ['active', 'paused'] as const
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number]

// "¿A quién o qué?" de una deuda nueva (FinAhorros).
export const DEBT_KINDS = ['person', 'card', 'loan', 'other'] as const
export type DebtKind = (typeof DEBT_KINDS)[number]

// El ícono de una categoría: una clave, no un dibujo (el front guarda el trazo de cada una).
export const CATEGORY_ICONS = ['cart', 'food', 'car', 'card', 'star', 'heart', 'dots', 'tag', 'income', 'gift'] as const
export type CategoryIcon = (typeof CATEGORY_ICONS)[number]

// Las categorías nacen solas la primera vez que una persona abre Finanzas (la API las crea, una vez). Cada una
// trae una `key` fija: es lo que la distingue de las que la persona crea después, y lo que usa el front para
// saber cuál es "Otros" (no se puede borrar) o con cuál arrancar el formulario. El id de cada una es un uuid
// distinto por persona. Sin límite de gasto: el presupuesto lo pone cada quien.
export const DEFAULT_CATEGORIES = [
  { key: 'groceries', name: 'Súper y comida', kind: 'expense', color: 'sand', icon: 'cart' },
  { key: 'dining', name: 'Comida fuera', kind: 'expense', color: 'lavender_soft', icon: 'food' },
  { key: 'transport', name: 'Transporte', kind: 'expense', color: 'cream', icon: 'car' },
  { key: 'memberships', name: 'Membresías', kind: 'expense', color: 'lavender', icon: 'card' },
  { key: 'outings', name: 'Salidas', kind: 'expense', color: 'peach', icon: 'star' },
  { key: 'health', name: 'Salud', kind: 'expense', color: 'lavender_soft', icon: 'heart' },
  { key: 'other', name: 'Otros', kind: 'expense', color: 'cream', icon: 'dots' },
  { key: 'salary', name: 'Sueldo', kind: 'income', color: 'lavender_soft', icon: 'income' },
  { key: 'extra', name: 'Trabajo extra', kind: 'income', color: 'lavender_soft', icon: 'income' },
  { key: 'gift', name: 'Regalo', kind: 'income', color: 'sand', icon: 'gift' },
  { key: 'income-other', name: 'Otro', kind: 'income', color: 'cream', icon: 'dots' },
] as const satisfies readonly { key: string; name: string; kind: CategoryKind; color: CategoryColor; icon: CategoryIcon }[]

// La categoría a la que van a parar los gastos de una categoría que se borra. No se puede borrar.
export const FALLBACK_CATEGORY_KEY = 'other'
