'use server'

import { themeSchema, type ThemePreference } from '@kairo/shared'
import { cookies } from 'next/headers'
import { api } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'
import { THEME_COOKIE } from './preference'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

async function writeThemeCookie(theme: ThemePreference) {
  const store = await cookies()
  store.set(THEME_COOKIE, theme, {
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
  if (!parsed.success) return { error: 'No pudimos guardar tu preferencia. Intenta de nuevo.' }

  if (!DEMO_MODE) {
    try {
      await api.patch('/me/theme', { theme: parsed.data })
    } catch {
      return { error: 'No pudimos guardar tu preferencia. Intenta de nuevo.' }
    }
  }

  await writeThemeCookie(parsed.data)
}

// Solo la copia: el perfil ya tiene este valor (lo usa ThemeSync al llegar a otro dispositivo).
export async function syncThemeCookie(input: unknown): Promise<void> {
  const parsed = themeSchema.safeParse(input)
  if (parsed.success) await writeThemeCookie(parsed.data)
}
