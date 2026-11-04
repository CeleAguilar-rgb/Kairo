import type { TrashGroup, TrashKind } from '@kairo/shared'

// A quién pertenece algo de la papelera cuando lo arrastró otra cosa (las tareas de un proyecto).
export type TrashParent = { kind: TrashKind; id: string }

// Una cosa en la papelera como la reporta su módulo: hechos crudos (decisión #38); el texto ("hace 3 días",
// "Membresía · Débito ••4417") lo arma el Next.js. `detail` es un dato corto que solo el módulo conoce (el mundo de
// una ficha, la tarjeta de una membresía); `amountCents` solo lo traen los movimientos.
export type TrashEntry = {
  kind: TrashKind
  id: string
  group: TrashGroup
  name: string
  detail: string | null
  amountCents: number | null
  deletedAt: Date
  parent: TrashParent | null
}

// El contrato que cumple el adaptador de cada módulo (`<módulo>.trash.ts`). Así la Papelera no conoce ninguna tabla
// (regla 13): solo pregunta a cada módulo qué tiene borrado y le pide devolverlo o borrarlo para siempre. Todo
// filtra por `userId` (regla 3) salvo `purgeExpired`, que es de la tarea programada y recorre a todas las personas.
export interface TrashSource {
  readonly kinds: readonly TrashKind[]
  list(userId: string): Promise<TrashEntry[]>
  // Devuelve cuándo se había borrado (para devolver con ello lo que arrastró), o null si no estaba en la papelera.
  restore(userId: string, kind: TrashKind, id: string): Promise<Date | null>
  // Borrar para siempre: la fila y lo que cuelga de ella dentro del módulo (y sus archivos de Storage, si tiene).
  purge(userId: string, kind: TrashKind, id: string): Promise<boolean>
  // Solo los tipos que se mandan a la papelera desde aquí (hoy, un proyecto): la fila y sus partes internas.
  trash?(userId: string, kind: TrashKind, id: string, at: Date): Promise<boolean>
  // Lo de este módulo que cuelga de algo de otro (las tareas de un proyecto): se va, vuelve y se borra con su dueño,
  // siempre con la MISMA hora de borrado, para no devolver lo que se había borrado antes por separado.
  trashChildren?(userId: string, parent: TrashParent, at: Date): Promise<void>
  restoreChildren?(userId: string, parent: TrashParent, at: Date): Promise<void>
  purgeChildren?(userId: string, parent: TrashParent): Promise<void>
  // Tarea programada: borra para siempre lo que se borró antes de `before`, de todas las personas.
  purgeExpired(before: Date): Promise<number>
}
