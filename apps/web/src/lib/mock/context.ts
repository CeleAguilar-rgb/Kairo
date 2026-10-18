import 'server-only'

import { cache } from 'react'

import { getMe } from '@/lib/account/api'
import { todayIn, zonedToUtc, addDays, type IsoDate } from '@/lib/dates'

// Datos de ejemplo mientras no existen los endpoints de cada módulo. Todos se
// arman relativos a "hoy" en la zona del perfil, para que la app siempre se
// vea viva (el pago de mañana siempre es mañana). Cuando llegue la API de un
// módulo, su api.ts deja de usar esto y llama a api.get(...) — los
// componentes no cambian porque reciben la misma forma de datos.
export type MockContext = {
  today: IsoDate
  timeZone: string
  // Día relativo a hoy: day(0) = hoy, day(-1) = ayer.
  day: (offset: number) => IsoDate
  // Momento relativo a hoy a una hora de pared: at(0, '17:00') = hoy 17:00 en la zona del perfil, en UTC.
  at: (offset: number, time: string) => string
}

export const getMockContext = cache(async (): Promise<MockContext> => {
  const me = await getMe()
  const timeZone = me?.profile.timezone ?? 'America/Mexico_City'
  const today = todayIn(timeZone)
  return {
    today,
    timeZone,
    day: (offset) => addDays(today, offset),
    at: (offset, time) => zonedToUtc(addDays(today, offset), time, timeZone),
  }
})

// Latencia de red simulada de la API. Por defecto NO hay: con datos de ejemplo cada
// navegación ya espera lo que tarda el servidor de desarrollo, y sumarle una espera
// artificial solo hace sentir la app más lenta. Para ver los esqueletos de carga como
// se verán con la API de verdad, arranca con latencia, por ejemplo en PowerShell:
//   $env:MOCK_DELAY_MS = 400; pnpm dev:demo
// (en producción nunca espera, por si algo se queda puesto).
const DEFAULT_DELAY_MS = Number(process.env.MOCK_DELAY_MS ?? 0)

export function mockDelay(ms = DEFAULT_DELAY_MS) {
  if (process.env.NODE_ENV === 'production' || ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}
