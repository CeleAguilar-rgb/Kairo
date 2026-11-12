import { z } from 'zod'
import { MODULE_IDS } from '../modules'

// 'Mi perfil': nombre y doodle (no hay subida de imagen todavía, avatarPath
// guarda el id del doodle elegido, p. ej. 'star').
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Escribe tu nombre.').max(80),
  avatarPath: z.string().min(1, 'Elige un doodle.'),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

// Apariencia en Preferencias. 'system' sigue lo que diga el sistema operativo.
export const THEMES = ['light', 'dark', 'system'] as const
export const themeSchema = z.enum(THEMES)

export type ThemePreference = z.infer<typeof themeSchema>

export const updateThemeSchema = z.object({ theme: themeSchema })

export type UpdateThemeInput = z.infer<typeof updateThemeSchema>

// Temas de color (docs/design/screens/Temas.dc.html). El orden es el del canvas.
// 'lavender' es el de siempre: con 'subtle', Kairo se ve igual que antes de los temas.
export const COLOR_THEMES = [
  'lavender',
  'sage',
  'aqua',
  'forest',
  'sky',
  'ocean',
  'mustard',
  'sand',
  'peach',
  'coral',
  'pink',
  'wine',
] as const
export const colorThemeSchema = z.enum(COLOR_THEMES)

export type ColorTheme = z.infer<typeof colorThemeSchema>

// Qué tanto pinta el tema: 'subtle' solo el acento, 'tinted' también fondos y tarjetas,
// 'vivid' además la tarjeta principal y los botones.
export const THEME_INTENSITIES = ['subtle', 'tinted', 'vivid'] as const
export const themeIntensitySchema = z.enum(THEME_INTENSITIES)

export type ThemeIntensity = z.infer<typeof themeIntensitySchema>

export const updateAppearanceSchema = z.object({
  colorTheme: colorThemeSchema,
  intensity: themeIntensitySchema,
})

export type UpdateAppearanceInput = z.infer<typeof updateAppearanceSchema>

// Paso 1 y 2 de Bienvenida: nombre + doodle, y las secciones elegidas.
export const completeOnboardingSchema = z.object({
  name: z.string().trim().min(1, 'Escribe tu nombre.').max(80),
  avatarPath: z.string().min(1, 'Elige un doodle.'),
  sections: z.array(z.enum(MODULE_IDS)).min(1, 'Elige al menos una sección.'),
})

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>

// 'Mis secciones' en Perfil: prender/apagar y reordenar.
export const updateSectionsSchema = z.object({
  sections: z
    .array(
      z.object({
        section: z.enum(MODULE_IDS),
        enabled: z.boolean(),
        position: z.number().int().min(0),
      }),
    )
    .min(1),
})

export type UpdateSectionsInput = z.infer<typeof updateSectionsSchema>
