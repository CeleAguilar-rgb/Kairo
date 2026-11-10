'use client'

import type { ThemePreference } from '@kairo/shared'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Segmented'
import { saveThemePreference } from '@/lib/theme/actions'
import { applyTheme } from '@/lib/theme/apply'
import styles from './PerfilTab.module.css'

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Como el sistema' },
]

type PreferenciasTabProps = { themePreference: ThemePreference }

export function PreferenciasTab({ themePreference }: PreferenciasTabProps) {
  const [theme, setTheme] = useState(themePreference)
  const [error, setError] = useState<string>()

  // Primero se ve el cambio y después se guarda: guardar no debe hacer esperar al ojo.
  // Si no se pudo guardar, vuelve a como estaba: lo que se ve no debe mentir sobre lo guardado.
  async function handleThemeChange(next: ThemePreference) {
    const previous = theme
    setError(undefined)
    setTheme(next)
    applyTheme(next)

    const result = await saveThemePreference(next)
    if (result?.error) {
      setTheme(previous)
      applyTheme(previous)
      setError(result.error)
    }
  }

  return (
    <Card aria-labelledby="preferencias-tab-title">
      <h2 id="preferencias-tab-title" className={styles.title}>
        Preferencias
      </h2>

      <div className={styles.field}>
        <span className={styles.label}>Apariencia</span>
        <Segmented
          label="Apariencia"
          mode="radio"
          tone="raised"
          value={theme}
          options={THEME_OPTIONS}
          onChange={handleThemeChange}
        />
        {error ? (
          <span className={styles.error} role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </Card>
  )
}
