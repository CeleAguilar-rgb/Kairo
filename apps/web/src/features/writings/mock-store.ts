import 'server-only'

import type { IsoDate } from '@/lib/dates'
import { getMockContext, type MockContext } from '@/lib/mock/context'

import { buildWritingsSeed, type WritingsSeed } from './mock'

// Todo lo que se hace en Escritos (crear una historia, escribir en una página, borrar un personaje…) vive aquí, en
// la memoria del servidor de desarrollo, mientras no exista la API (igual que features/finance/mock-store.ts): así
// lo que haces se ve en todas las pestañas. Se pierde al reiniciar el servidor o al cambiar de día. Con la API
// este archivo desaparece: las acciones llaman a `api.post('/writings/...', ...)` y compañía.
//
// Se guarda en globalThis y no en una variable del módulo: en desarrollo Next vuelve a cargar los módulos al
// guardar un archivo y la variable se reiniciaría.

export type WritingsStore = WritingsSeed & {
  // El día para el que se armó: al cambiar de día, los datos de ejemplo se arman otra vez.
  seededOn: IsoDate
  // Para "Deshacer": cómo volver atrás, por token.
  undo: Map<string, () => void>
}

const holder = globalThis as typeof globalThis & { __kairoWritingsStore?: WritingsStore }

export type WritingsContext = { store: WritingsStore; ctx: MockContext }

export async function loadWritings(): Promise<WritingsContext> {
  const ctx = await getMockContext()
  if (!holder.__kairoWritingsStore || holder.__kairoWritingsStore.seededOn !== ctx.today) {
    holder.__kairoWritingsStore = { ...buildWritingsSeed(ctx), seededOn: ctx.today, undo: new Map() }
  }
  return { store: holder.__kairoWritingsStore, ctx }
}

// Guarda cómo volver atrás y devuelve el token que se le da a "Deshacer".
export function rememberUndo(store: WritingsStore, restore: () => void): string {
  const token = crypto.randomUUID()
  store.undo.set(token, restore)
  return token
}

// Deshace una acción. false si el token ya no existe (se usó o el servidor se reinició).
export function runUndo(store: WritingsStore, token: string): boolean {
  const restore = store.undo.get(token)
  if (!restore) return false
  store.undo.delete(token)
  restore()
  return true
}

// Suma lo escrito hoy al contador de la semana. Solo cuenta lo que se agrega: borrar texto no resta lo ya escrito.
export function addWordsToday(store: WritingsStore, today: IsoDate, delta: number): void {
  if (delta <= 0) return
  store.wordsByDay[today] = (store.wordsByDay[today] ?? 0) + delta
}
