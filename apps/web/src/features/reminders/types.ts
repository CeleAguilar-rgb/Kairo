import type { ReminderRepeat, ReminderSnooze, ReminderSourceKind } from '@kairo/shared'

export type { ReminderRepeat, ReminderSnooze, ReminderSourceKind }

// De dónde viene el recordatorio, para el chip gris-lavanda de la fila. `label` es el detalle
// ('Daily', '••4417', 'Ingeniería o maestría'); para 'routine' es el texto completo ('Rutina de mañana').
export type ReminderSource = {
  kind: ReminderSourceKind
  label: string
}

// Tabla reminders de docs/guides/data-model.md (camelCase). remind_at es un
// momento en UTC; `precision` no es columna: le dice a la UI si mostrar el
// mes ("Noviembre"), el día ("15 de octubre") o día y hora ("Viernes, 17:00").
// `source` y `repeat` tampoco son columnas todavía: se suman con la migración
// del backend de recordatorios (ver la nota de sesión).
export type Reminder = {
  id: string
  title: string
  remindAt: string
  precision: 'month' | 'day' | 'time'
  doneAt: string | null
  snoozedTo: string | null
  source: ReminderSource
  repeat: ReminderRepeat
}

export const REMINDER_REPEAT_LABEL: Record<ReminderRepeat, string> = {
  none: 'Una vez',
  daily: 'Cada día',
  weekdays: 'Lunes a viernes',
}

export const REMINDER_SNOOZE_LABEL: Record<ReminderSnooze, string> = {
  '10m': '10 minutos',
  '1h': '1 hora',
  tomorrow: 'Mañana',
}
