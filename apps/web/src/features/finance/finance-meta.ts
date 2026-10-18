import type { CardColor, CategoryColor, DebtKind, MembershipCadence, TransactionKind } from '@kairo/shared'

import type { CategoryIconKey } from './types'

// Lo visual de Finanzas que no es lógica: los trazos de los íconos (del canvas) y las etiquetas. Los colores
// no están aquí: cada pieza los toma de una variable semántica según su clave (data-color en el CSS).

// El trazo de cada ícono de categoría (FinMovimientos, FinPresupuesto).
export const CATEGORY_ICON_PATH: Record<CategoryIconKey, string | string[]> = {
  cart: ['M3 4h3l2.5 11h10L21 7H7.5', 'M10 20h.01M18 20h.01'],
  food: 'M4 3v8a3 3 0 0 0 3 3v7M7 3v5M10 3v8a3 3 0 0 1-3 3M17 21V3c-2 1-3 4-3 8h3',
  car: 'M5 17h14l-1.5-6h-11zM7 17v2M17 17v2M8 11l1.5-4h5L16 11',
  card: 'M4 7h16v10H4zM4 11h16',
  star: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  tag: ['M3 3h8l9 9-8 9-9-9V3z', 'M7.5 7.5h.01'],
  income: 'M12 19V5M6 11l6-6 6 6',
  gift: ['M4 11h16v9H4z', 'M3 7h18v4H3z', 'M12 7v13', 'M12 7C10 3 7 4 8 6s3 1 4 1zM12 7c2-4 5-3 4-1s-3 1-4 1z'],
}

// Íconos sueltos de las cifras y de los tipos de movimiento.
export const FINANCE_ICON: Record<"income" | "expense" | "wallet" | "saving" | "debt" | "card" | "trash" | "plus" | "repeat" | "close" | "chevron", string | string[]> = {
  income: 'M12 19V5M6 11l6-6 6 6',
  expense: 'M12 5v14M6 13l6 6 6-6',
  wallet: ['M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7z', 'M4 7l11-3v3'],
  saving: 'M5 11a7 7 0 0 1 13-3h2v4h-1.5a7 7 0 0 1-2.5 4v3h-3v-2h-3v2H7v-3.5A7 7 0 0 1 5 11zM10 6V4',
  debt: 'M4 7h16v10H4zM4 11h16',
  card: ['M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z', 'M3 10h18M7 15h3'],
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  plus: 'M12 5v14M5 12h14',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  close: 'M6 6l12 12M18 6L6 18',
  chevron: 'M6 9l6 6 6-6',
}

// Cómo se llama cada tipo de movimiento: en el filtro/lista y en el selector del formulario.
export const TRANSACTION_KIND_LABEL: Record<TransactionKind, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  saving_deposit: 'A ahorro',
  saving_withdrawal: 'De ahorro',
  debt_payment: 'Pago deuda',
}

// Los tipos que entran dinero a tu bolsillo (el resto sale o se aparta).
export const INCOMING_KINDS: readonly TransactionKind[] = ['income', 'saving_withdrawal']

export const CADENCE_LABEL: Record<MembershipCadence, string> = {
  monthly: 'Mensual',
  yearly: 'Anual',
  weekly: 'Semanal',
}

export const DEBT_KIND_LABEL: Record<DebtKind, string> = {
  person: 'Persona',
  card: 'Tarjeta',
  loan: 'Préstamo',
  other: 'Otro',
}

export const COLOR_LABEL: Record<CategoryColor, string> = {
  lavender: 'Lavanda',
  lavender_soft: 'Lavanda suave',
  sand: 'Arena',
  peach: 'Durazno',
  cream: 'Crema',
}

export const CARD_COLOR_LABEL: Record<CardColor, string> = {
  ink: 'Tinta',
  lavender: 'Lavanda',
  sand: 'Arena',
  lavender_soft: 'Lavanda suave',
}

// Domingo (0) a sábado (6), como `weekdayOf` de lib/dates.
export const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const

export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const
