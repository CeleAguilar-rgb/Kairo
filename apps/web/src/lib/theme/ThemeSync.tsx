'use client'

import type { ThemePreference } from '@kairo/shared'
import { useEffect } from 'react'
import { syncThemeCookie } from './actions'
import { applyTheme } from './apply'

// Se monta solo cuando la cookie de este dispositivo no coincide con el perfil (por ejemplo,
// la primera vez que se entra desde otro lugar). Al guardar la cookie deja de hacer falta.
export function ThemeSync({ theme }: { theme: ThemePreference }) {
  useEffect(() => {
    applyTheme(theme)
    void syncThemeCookie(theme)
  }, [theme])

  return null
}
