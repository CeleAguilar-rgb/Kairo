import 'server-only'
import {
  colorThemeSchema,
  themeIntensitySchema,
  themeSchema,
  type ColorTheme,
  type ThemeIntensity,
  type ThemePreference,
} from '@kairo/shared'
import { cookies } from 'next/headers'

export const THEME_COOKIE = 'kairo_theme'
export const APPEARANCE_COOKIE = 'kairo_appearance'

export type Appearance = { colorTheme: ColorTheme; intensity: ThemeIntensity }

// Lo que tiene una cuenta que nunca eligió tema: Kairo como era antes de los temas.
export const DEFAULT_APPEARANCE: Appearance = { colorTheme: 'lavender', intensity: 'subtle' }

// La cookie viaja con cada petición, así que el servidor ya manda la página con el modo
// correcto y no hay parpadeo al cargar. Un valor raro o ausente cuenta como claro.
export async function readThemePreference(): Promise<ThemePreference> {
  const store = await cookies()
  const parsed = themeSchema.safeParse(store.get(THEME_COOKIE)?.value)
  return parsed.success ? parsed.data : 'light'
}

// Una sola cookie para los dos valores ('sage.tinted'): siempre se guardan juntos.
// Cada mitad se valida aparte; la que no sirva cae a su valor de siempre.
export async function readAppearance(): Promise<Appearance> {
  const store = await cookies()
  const [colorTheme, intensity] = (store.get(APPEARANCE_COOKIE)?.value ?? '').split('.')
  const theme = colorThemeSchema.safeParse(colorTheme)
  const level = themeIntensitySchema.safeParse(intensity)
  return {
    colorTheme: theme.success ? theme.data : DEFAULT_APPEARANCE.colorTheme,
    intensity: level.success ? level.data : DEFAULT_APPEARANCE.intensity,
  }
}

export function encodeAppearance({ colorTheme, intensity }: Appearance): string {
  return `${colorTheme}.${intensity}`
}
