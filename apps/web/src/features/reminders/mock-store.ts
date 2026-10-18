import 'server-only'

import type { Reminder } from './types'

// Lo que se crea, se marca como listo o se pospone en Recordatorios vive aquí, en la memoria del
// servidor de desarrollo, mientras no exista la API (igual que features/agenda/mock-store.ts): así
// lo que haces se ve en la pantalla y en la tarjeta de Inicio. Se pierde al reiniciar el servidor.
// Con la API este archivo desaparece: las acciones de actions.ts llaman a `api.post('/reminders', ...)`
// y compañía.
//
// Se guarda en globalThis y no en una variable del módulo: en desarrollo Next vuelve a cargar los
// módulos al guardar un archivo y la variable se reiniciaría.

// Cómo estaba todo antes de una acción, para poder deshacerla: el recordatorio como era y, si la acción
// creó la siguiente vez de una serie, cuál borrar.
type Snapshot = { previous: Reminder; createdId?: string }

type Store = {
  // Los creados, el más reciente primero.
  created: Reminder[]
  // Cambios sobre los recordatorios de ejemplo: su versión nueva.
  overrides: Map<string, Reminder>
  // Para "Deshacer", por token (regla 11: nada se pierde de golpe).
  history: Map<string, Snapshot>
}

const holder = globalThis as typeof globalThis & { __kairoRemindersStore?: Store }
const store: Store = (holder.__kairoRemindersStore ??= { created: [], overrides: new Map(), history: new Map() })

// Los recordatorios de ejemplo con los cambios aplicados, y los creados al principio.
export function applyStore(seeds: Reminder[]): Reminder[] {
  return [...store.created, ...seeds.map((seed) => store.overrides.get(seed.id) ?? seed)]
}

export function findReminder(id: string, seeds: Reminder[]): Reminder | undefined {
  return applyStore(seeds).find((reminder) => reminder.id === id)
}

export function addReminder(reminder: Reminder) {
  store.created.unshift(reminder)
}

// Reemplaza un recordatorio (creado o de ejemplo) por su versión nueva.
export function saveReminder(reminder: Reminder) {
  const created = store.created.findIndex((item) => item.id === reminder.id)
  if (created >= 0) store.created[created] = reminder
  else store.overrides.set(reminder.id, reminder)
}

// Guarda cómo estaba el recordatorio antes de cambiarlo y devuelve el token para deshacerlo.
export function remember(snapshot: Snapshot): string {
  const token = crypto.randomUUID()
  store.history.set(token, snapshot)
  return token
}

// Deshace una acción: el recordatorio vuelve a como estaba y la siguiente vez que creó (si creó una)
// se borra. false si el token ya no existe.
export function restore(token: string): boolean {
  const snapshot = store.history.get(token)
  if (!snapshot) return false
  store.history.delete(token)
  if (snapshot.createdId) {
    const index = store.created.findIndex((item) => item.id === snapshot.createdId)
    if (index >= 0) store.created.splice(index, 1)
  }
  saveReminder(snapshot.previous)
  return true
}
