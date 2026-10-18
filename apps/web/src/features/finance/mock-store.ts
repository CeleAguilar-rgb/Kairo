import 'server-only'

import type { IsoDate } from '@/lib/dates'
import { getMockContext, type MockContext } from '@/lib/mock/context'

import { buildFinanceSeed, type FinanceSeed } from './mock'
import type { PaymentCard, Transaction } from './types'

// Todo lo que se hace en Finanzas (escribir un movimiento, aportar a un ahorro, crear una membresía, ponerle
// límite a una categoría…) vive aquí, en la memoria del servidor de desarrollo, mientras no exista la API
// (igual que features/daily/mock-store.ts): así lo que haces se ve en las cinco pestañas, en Inicio y en la
// Agenda. Se pierde al reiniciar el servidor o al cambiar de día. Con la API este archivo desaparece: las
// acciones llaman a `api.post('/finance/...', ...)` y compañía.
//
// Se guarda en globalThis y no en una variable del módulo: en desarrollo Next vuelve a cargar los módulos al
// guardar un archivo y la variable se reiniciaría.

export type FinanceWorld = FinanceSeed & {
  // El día para el que se armó: al cambiar de día, los datos de ejemplo se arman otra vez.
  seededOn: IsoDate
  // Tarjetas borradas: los movimientos viejos siguen diciendo con cuál se pagaron (regla 11: borrar es papelera).
  archivedCards: PaymentCard[]
  // Para "Deshacer": cómo volver atrás, por token.
  undo: Map<string, () => void>
}

const holder = globalThis as typeof globalThis & { __kairoFinanceWorld?: FinanceWorld }

export type FinanceContext = { world: FinanceWorld; ctx: MockContext }

export async function loadFinance(): Promise<FinanceContext> {
  const ctx = await getMockContext()
  if (!holder.__kairoFinanceWorld || holder.__kairoFinanceWorld.seededOn !== ctx.today) {
    holder.__kairoFinanceWorld = { ...buildFinanceSeed(ctx), seededOn: ctx.today, archivedCards: [], undo: new Map() }
  }
  return { world: holder.__kairoFinanceWorld, ctx }
}

// Guarda cómo volver atrás y devuelve el token que se le da a "Deshacer".
export function rememberUndo(world: FinanceWorld, restore: () => void): string {
  const token = crypto.randomUUID()
  world.undo.set(token, restore)
  return token
}

// Deshace una acción. false si el token ya no existe (se usó o el servidor se reinició).
export function runUndo(world: FinanceWorld, token: string): boolean {
  const restore = world.undo.get(token)
  if (!restore) return false
  world.undo.delete(token)
  restore()
  return true
}

// Todas las tarjetas que un movimiento puede nombrar: las vivas y las que se borraron.
export const allCards = (world: FinanceWorld): PaymentCard[] => [...world.cards, ...world.archivedCards]

// Mete un movimiento en su lugar: la lista va de lo más nuevo a lo más viejo, y dentro de un mismo día lo
// último que se agregó queda arriba.
export function insertTransaction(world: FinanceWorld, transaction: Transaction): void {
  const index = world.transactions.findIndex((item) => item.occurredOn <= transaction.occurredOn)
  world.transactions.splice(index === -1 ? world.transactions.length : index, 0, transaction)
}
