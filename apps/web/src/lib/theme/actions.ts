'use server'

import { themeSchema, updateAppearanceSchema } from '@kairo/shared'
import { cookies } from 'next/headers'
import { api } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'
import { APPEARANCE_COOKIE, encodeAppearance, THEME_COOKIE, type Appearance } from './preference'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365
const SAVE_ERROR = 'No pudimos guardar tu preferencia. Intenta de nuevo.'

async function writeCookie(name: string, value: string) {
  const store = await cookies()
  store.set(name, value, {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  })
}

// El perfil manda y la cookie es su copia en este dispositivo. Por eso primero el perfil:
// si la API falla, la cookie no cambia y ThemeSync no ve una diferencia que corregir.
export async function saveThemePreference(input: unknown): Promise<{ error: string } | undefined> {
  const parsed = themeSchema.safeParse(input)
  if (!parsed.success) return { error: SAVE_ERROR }

  if (!DEMO_MODE) {
    try {
      await api.patch('/me/theme', { theme: parsed.data })
    } catch {
      return { error: SAVE_ERROR }
    }
  }

  await writeCookie(THEME_COOKIE, parsed.data)
}

// Solo la copia: el perfil ya tiene este valor (lo usa ThemeSync al llegar a otro dispositivo).
export async function syncThemeCookie(input: unknown): Promise<void> {
  const parsed = themeSchema.safeParse(input)
  if (parsed.success) await writeCookie(THEME_COOKIE, parsed.data)
}

// Tema de color e intensidad: mismo orden que el modo, primero el perfil y después la cookie.
export async function saveAppearance(input: unknown): Promise<{ error: string } | undefined> {
  const parsed = updateAppearanceSchema.safeParse(input)
  if (!parsed.success) return { error: SAVE_ERROR }

  if (!DEMO_MODE) {
    try {
      await api.patch('/me/appearance', parsed.data)
    } catch {
      return { error: SAVE_ERROR }
    }
  }

  await writeCookie(APPEARANCE_COOKIE, encodeAppearance(parsed.data))
}

export async function syncAppearanceCookie(input: Appearance): Promise<void> {
  const parsed = updateAppearanceSchema.safeParse(input)
  if (parsed.success) await writeCookie(APPEARANCE_COOKIE, encodeAppearance(parsed.data))
}
