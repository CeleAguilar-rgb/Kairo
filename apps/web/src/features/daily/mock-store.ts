import 'server-only'

import { getMe } from '@/lib/account/api'
import { minutesNowIn, startOfWeek, type IsoDate } from '@/lib/dates'
import { getMockContext, type MockContext } from '@/lib/mock/context'

import { buildDailySeed, type DailySeed } from './mock'

// Todo lo que se hace en Día a día (marcar un bloque, escribir en el diario, crear una meta, editar la rutina…)
// vive aquí, en la memoria del servidor de desarrollo, mientras no exista la API (igual que
// features/reminders/mock-store.ts): así lo que haces se ve en la pantalla y en las tarjetas de Inicio.
// Se pierde al reiniciar el servidor o al cambiar de día. Con la API este archivo desaparece: las acciones
// de actions.ts llaman a `api.post('/routine/...', ...)` y compañía.
//
// Se guarda en globalThis y no en una variable del módulo: en desarrollo Next vuelve a cargar los módulos
// al guardar un archivo y la variable se reiniciaría.

export type DailyWorld = DailySeed & {
  // El día para el que se armó: al cambiar de día, los datos de ejemplo se arman otra vez.
  seededOn: IsoDate
  // Tareas de enfoque hechas, por día y bloque ("2026-10-16|esc" → 1).
  focusDone: Map<string, number>
  // Para "Deshacer": cómo volver atrás, por token (regla 11: nada se pierde de golpe).
  undo: Map<string, () => void>
}

const holder = globalThis as typeof globalThis & { __kairoDailyWorld?: DailyWorld }

export type WorldContext = { world: DailyWorld; ctx: MockContext; nowMinutes: number }

// El mundo de ejemplo, junto con "hoy" y la hora de ahora en la zona del perfil.
export async function loadWorld(): Promise<WorldContext> {
  const ctx = await getMockContext()
  const nowMinutes = minutesNowIn(ctx.timeZone)
  const weekStartPref = (await getMe())?.profile.weekStart ?? 'monday'
  if (!holder.__kairoDailyWorld || holder.__kairoDailyWorld.seededOn !== ctx.today) {
    holder.__kairoDailyWorld = {
      ...buildDailySeed(ctx, startOfWeek(ctx.today, weekStartPref), nowMinutes),
      seededOn: ctx.today,
      focusDone: new Map(),
      undo: new Map(),
    }
  }
  return { world: holder.__kairoDailyWorld, ctx, nowMinutes }
}

// Guarda cómo volver atrás y devuelve el token que se le da a "Deshacer".
export function rememberUndo(world: DailyWorld, restore: () => void): string {
  const token = crypto.randomUUID()
  world.undo.set(token, restore)
  return token
}

// Deshace una acción. false si el token ya no existe (se usó o el servidor se reinició).
export function runUndo(world: DailyWorld, token: string): boolean {
  const restore = world.undo.get(token)
  if (!restore) return false
  world.undo.delete(token)
  restore()
  return true
}
