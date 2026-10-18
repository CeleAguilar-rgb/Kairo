// La expansión de una serie a sus ocurrencias (occurrenceDates) sigue
// viviendo en el Next.js de en medio (features/agenda/records.ts): la API
// solo guarda y devuelve series completas (una fila = un evento o una serie,
// no una vez que ocurre), así que no la necesita. Lo poco de fechas que sí
// usan crear/editar/mover/borrar vive aquí (mismo motivo de duplicar mínimo
// que reminder-utils.ts del módulo de Recordatorios).

export type IsoDate = string

export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10)
}

export function wallTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}
