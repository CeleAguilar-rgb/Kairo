// Tabla events de docs/guides/data-model.md (camelCase). starts_at/ends_at son
// momentos en UTC; se muestran en la zona del perfil.
export type EventKind = 'work' | 'personal'

export type AgendaEvent = {
  id: string
  title: string
  kind: EventKind
  startsAt: string
  endsAt: string
  allDay: boolean
  notes: string | null
  project: { id: string; name: string } | null
  // Texto corto de dónde sale ("Casa", "Rutina · Enfoque"): en la API lo arma
  // la vista de Agenda que junta fechas de otros módulos.
  place: string | null
}

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  work: 'Trabajo',
  personal: 'Personal',
}
