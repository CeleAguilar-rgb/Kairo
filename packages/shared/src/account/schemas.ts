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
