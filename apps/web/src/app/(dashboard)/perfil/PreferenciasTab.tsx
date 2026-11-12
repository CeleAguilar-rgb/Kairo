'use client'

import type { ColorTheme, ThemeIntensity, ThemePreference } from '@kairo/shared'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Segmented'
import { saveAppearance, saveThemePreference } from '@/lib/theme/actions'
import { applyAppearance, applyTheme } from '@/lib/theme/apply'
import styles from './PerfilTab.module.css'
import themeStyles from './PreferenciasTab.module.css'

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Como el sistema' },
]

// Nombres y descripciones de Temas.dc.html, en el orden del canvas.
const COLOR_THEME_OPTIONS: { value: ColorTheme; label: string; description: string }[] = [
  { value: 'lavender', label: 'Lavanda', description: 'El de siempre. Tranquilo y nocturno.' },
  { value: 'sage', label: 'Salvia', description: 'Verde suave, para enfocarse.' },
  { value: 'aqua', label: 'Verde agua', description: 'Fresco y ligero.' },
  { value: 'forest', label: 'Bosque', description: 'Verde profundo, sereno.' },
  { value: 'sky', label: 'Cielo', description: 'Azul claro, despejado.' },
  { value: 'ocean', label: 'Océano', description: 'Azul intenso, concentrado.' },
  { value: 'mustard', label: 'Mostaza', description: 'Amarillo cálido, con chispa.' },
  { value: 'sand', label: 'Arena', description: 'Casi neutro, como papel.' },
  { value: 'peach', label: 'Durazno', description: 'Cálido, con energía.' },
  { value: 'coral', label: 'Coral', description: 'Vivo y alegre.' },
  { value: 'pink', label: 'Rosa', description: 'Dulce y personal.' },
  { value: 'wine', label: 'Vino', description: 'Profundo y elegante.' },
]

const INTENSITY_OPTIONS: { value: ThemeIntensity; label: string }[] = [
  { value: 'subtle', label: 'Sutil' },
  { value: 'tinted', label: 'Teñido' },
  { value: 'vivid', label: 'Intenso' },
]

const INTENSITY_HINTS: Record<ThemeIntensity, string> = {
  subtle: 'Cambia solo el acento: checks, barras y lo elegido.',
  tinted: 'También le da su tono al fondo y a las tarjetas.',
  vivid: 'Además pinta la tarjeta principal y los botones.',
}

type PreferenciasTabProps = {
  themePreference: ThemePreference
  colorTheme: ColorTheme
  themeIntensity: ThemeIntensity
}

export function PreferenciasTab({ themePreference, colorTheme, themeIntensity }: PreferenciasTabProps) {
  const [theme, setTheme] = useState(themePreference)
  const [appearance, setAppearance] = useState({ colorTheme, intensity: themeIntensity })
  const [error, setError] = useState<string>()
  const [appearanceError, setAppearanceError] = useState<string>()

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

  // Tema e intensidad se guardan juntos (PATCH /me/appearance), así que cambiar uno manda los dos.
  async function handleAppearanceChange(next: { colorTheme: ColorTheme; intensity: ThemeIntensity }) {
    const previous = appearance
    setAppearanceError(undefined)
    setAppearance(next)
    applyAppearance(next.colorTheme, next.intensity)

    const result = await saveAppearance(next)
    if (result?.error) {
      setAppearance(previous)
      applyAppearance(previous.colorTheme, previous.intensity)
      setAppearanceError(result.error)
    }
  }

  const current = COLOR_THEME_OPTIONS.find((option) => option.value === appearance.colorTheme)

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

      <div className={themeStyles.section}>
        <span className={styles.label} id="color-theme-label">
          Tema de color
        </span>
        <div role="radiogroup" aria-labelledby="color-theme-label" className={themeStyles.themes}>
          {COLOR_THEME_OPTIONS.map((option) => {
            const selected = option.value === appearance.colorTheme
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={selected ? themeStyles.themeSelected : themeStyles.theme}
                onClick={() => handleAppearanceChange({ ...appearance, colorTheme: option.value })}
              >
                {/* La muestra de cada tema es fija (--swatch-*): no cambia con el tema activo. */}
                <span className={themeStyles.swatch} style={{ background: `var(--swatch-${option.value})` }} aria-hidden="true" />
                {option.label}
              </button>
            )
          })}
        </div>
        {current ? <span className={themeStyles.hint}>{current.description}</span> : null}
      </div>

      <div className={themeStyles.section}>
        <span className={styles.label}>Intensidad</span>
        <Segmented
          label="Intensidad"
          mode="radio"
          tone="raised"
          value={appearance.intensity}
          options={INTENSITY_OPTIONS}
          onChange={(intensity) => handleAppearanceChange({ ...appearance, intensity })}
        />
        <span className={themeStyles.hint}>{INTENSITY_HINTS[appearance.intensity]}</span>
        {appearanceError ? (
          <span className={styles.error} role="alert">
            {appearanceError}
          </span>
        ) : null}
      </div>
    </Card>
  )
}
