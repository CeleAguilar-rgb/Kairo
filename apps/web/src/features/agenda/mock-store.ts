import 'server-only'

import type { EventRecord } from './records'

// Los eventos que se crean, editan o borran en la Agenda viven aquí, en la memoria del servidor de
// desarrollo, mientras no exista la API (igual que features/projects/mock-store.ts): así lo que haces se
// ve en la agenda y en Inicio. Se pierde al reiniciar el servidor. Con la API este archivo desaparece:
// las acciones de actions.ts llaman a `api.post('/events', ...)` y compañía.
//
// Se guarda en globalThis y no en una variable del módulo: en desarrollo Next vuelve a cargar los
// módulos al guardar un archivo y la variable se reiniciaría.
type Store = {
  // Los creados, el más reciente primero.
  created: EventRecord[]
  // Cambios sobre los eventos de ejemplo: el registro nuevo, o 'deleted'.
  overrides: Map<string, EventRecord | 'deleted'>
  // La "papelera" de lo último que se borró, por token, para poder deshacerlo (regla 11: borrar = papelera).
  trash: Map<string, EventRecord>
}

const holder = globalThis as typeof globalThis & { __kairoAgendaStore?: Store }
const store: Store = (holder.__kairoAgendaStore ??= { created: [], overrides: new Map(), trash: new Map() })

// Los eventos de ejemplo con los cambios aplicados, y los creados al principio.
export function applyStore(seeds: EventRecord[]): EventRecord[] {
  const edited: EventRecord[] = []
  for (const seed of seeds) {
    const override = store.overrides.get(seed.id)
    if (override === 'deleted') continue
    edited.push(override ?? seed)
  }
  return [...store.created, ...edited]
}

export function findRecord(id: string, seeds: EventRecord[]): EventRecord | undefined {
  return applyStore(seeds).find((record) => record.id === id)
}

export function addRecord(record: EventRecord) {
  store.created.unshift(record)
}

// Reemplaza un evento (creado o de ejemplo) por su versión nueva.
export function saveRecord(record: EventRecord) {
  const created = store.created.findIndex((item) => item.id === record.id)
  if (created >= 0) store.created[created] = record
  else store.overrides.set(record.id, record)
}

export function removeRecord(id: string) {
  const created = store.created.findIndex((item) => item.id === id)
  if (created >= 0) store.created.splice(created, 1)
  else store.overrides.set(id, 'deleted')
}

// Deja en la papelera cómo era el evento antes de borrarlo (o de acortar su serie) y devuelve el
// token para deshacerlo.
export function toTrash(previous: EventRecord): string {
  const token = crypto.randomUUID()
  store.trash.set(token, previous)
  return token
}

// Deshace un borrado: el evento vuelve como estaba. false si el token ya no existe.
export function restoreFromTrash(token: string, seedIds: Set<string>): boolean {
  const previous = store.trash.get(token)
  if (!previous) return false
  store.trash.delete(token)
  if (seedIds.has(previous.id)) store.overrides.set(previous.id, previous)
  else {
    const index = store.created.findIndex((item) => item.id === previous.id)
    if (index >= 0) store.created[index] = previous
    else store.created.unshift(previous)
  }
  return true
}
