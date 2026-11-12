'use client'

import type { ThemePreference } from '@kairo/shared'
import { useEffect } from 'react'
import { syncAppearanceCookie, syncThemeCookie } from './actions'
import { applyAppearance, applyTheme } from './apply'
import type { Appearance } from './preference'

// Se monta solo cuando la cookie de este dispositivo no coincide con el perfil (por ejemplo,
// la primera vez que se entra desde otro lugar). Al guardar la cookie deja de hacer falta.
export function ThemeSync({ theme }: { theme: ThemePreference }) {
  useEffect(() => {
    applyTheme(theme)
    void syncThemeCookie(theme)
  }, [theme])

  return null
}

// Igual que ThemeSync, para el tema de color y su intensidad.
export function AppearanceSync({ colorTheme, intensity }: Appearance) {
  useEffect(() => {
    applyAppearance(colorTheme, intensity)
    void syncAppearanceCookie({ colorTheme, intensity })
  }, [colorTheme, intensity])

  return null
}
