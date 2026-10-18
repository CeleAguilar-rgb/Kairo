import 'server-only'

import type { Subject } from './types'

// Lo que se crea, se marca o se borra en Escuela vive aquí, en la memoria del
// servidor de desarrollo, mientras no exista la API (igual que
// features/reminders/mock-store.ts). Se pierde al reiniciar el servidor.
//
// Se guarda en globalThis y no en una variable del módulo: en desarrollo Next
// vuelve a cargar los módulos al guardar un archivo y la variable se reiniciaría.
type Store = {
  createdSubjects: Subject[]
  deletedSubjectIds: Set<string>
  // Sobrescribe el "hecho" de una entrega o una casilla de preparación por id.
  done: Map<string, boolean>
}

const holder = globalThis as typeof globalThis & { __kairoSchoolStore?: Store }
const store: Store = (holder.__kairoSchoolStore ??= {
  createdSubjects: [],
  deletedSubjectIds: new Set(),
  done: new Map(),
})

export function applySubjects(seeds: Subject[]): Subject[] {
  return [...store.createdSubjects, ...seeds].filter(
    (subject) => !store.deletedSubjectIds.has(subject.id),
  )
}

export function addSubject(subject: Subject) {
  store.createdSubjects.unshift(subject)
}

export function isSubjectDeleted(subjectId: string) {
  return store.deletedSubjectIds.has(subjectId)
}

export function deleteSubject(subjectId: string) {
  store.deletedSubjectIds.add(subjectId)
}

export function overrideDone(id: string, done: boolean) {
  store.done.set(id, done)
}

export function doneOverride(id: string): boolean | undefined {
  return store.done.get(id)
}
