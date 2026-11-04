import type { TrashGroup, TrashKind } from '@kairo/shared'

// Una cosa de la papelera como la devuelve la API (`GET /trash`): hechos crudos (decisión #38). El texto de la fila
// ("Proyecto con 4 tareas · borrado hoy", "Quedan 27 días") lo arma trash-text.ts.
export type TrashItem = {
  kind: TrashKind
  id: string
  group: TrashGroup
  name: string
  // Un dato corto que solo su módulo conoce: el tipo de proyecto, los últimos 4 de la tarjeta, la plantilla de una
  // nota, el día de una comida…
  detail: string | null
  amountCents: number | null
  deletedAt: string
  // Lo que se fue con ella, contado por tipo ("y sus 4 tareas").
  contents: { kind: TrashKind; count: number }[]
}
