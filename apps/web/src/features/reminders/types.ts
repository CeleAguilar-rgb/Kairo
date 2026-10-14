// Tabla reminders de docs/guides/data-model.md (camelCase). remind_at es un
// momento en UTC; `precision` no es columna: le dice a la UI si mostrar el
// mes ("Noviembre"), el día ("15 de octubre") o día y hora ("Viernes, 17:00").
export type Reminder = {
  id: string
  title: string
  remindAt: string
  precision: 'month' | 'day' | 'time'
  doneAt: string | null
  snoozedTo: string | null
}
