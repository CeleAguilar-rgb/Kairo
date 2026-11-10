import 'server-only'
import { themeSchema, type ThemePreference } from '@kairo/shared'
import { cookies } from 'next/headers'

export const THEME_COOKIE = 'kairo_theme'

// La cookie viaja con cada petición, así que el servidor ya manda la página con el modo
// correcto y no hay parpadeo al cargar. Un valor raro o ausente cuenta como claro.
export async function readThemePreference(): Promise<ThemePreference> {
  const store = await cookies()
  const parsed = themeSchema.safeParse(store.get(THEME_COOKIE)?.value)
  return parsed.success ? parsed.data : 'light'
}
