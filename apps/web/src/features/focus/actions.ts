'use server'

import { focusSessionSchema } from '@kairo/shared'

import { api, ApiError } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'

// Guardar un tramo del pomodoro que terminó. Una Server Action es un endpoint público: lo que llega NO se confía,
// se vuelve a validar con el mismo esquema del front (packages/shared) y la API lo revisa otra vez (que la tarea sea
// de la persona, que no empiece en el futuro). El userId lo pone la API con el token (regla 2).
// No revalida ninguna pantalla: el reproductor ya sabe sus puntos del día, y las demás pantallas leen los minutos
// la próxima vez que se abren.
export type FocusActionResult = { ok: true } | { ok: false; message: string }

export async function recordFocusSessionAction(raw: unknown): Promise<FocusActionResult> {
  const parsed = focusSessionSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, message: 'No se pudo guardar la sesión.' }
  // En modo demo no hay API: el reloj funciona igual, solo que no se guarda nada.
  if (DEMO_MODE) return { ok: true }
  try {
    await api.post('/focus/sessions', parsed.data)
    return { ok: true }
  } catch (error) {
    return { ok: false, message: error instanceof ApiError ? error.message : 'No se pudo guardar la sesión.' }
  }
}
