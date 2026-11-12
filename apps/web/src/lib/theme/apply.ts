import type { ColorTheme, ThemeIntensity, ThemePreference } from '@kairo/shared'

// Cambia el modo en la página abierta, sin recargar. Lo que pasa después con 'system'
// (si el sistema cambia, o si Next vuelve a renderizar el layout) lo cuida public/theme-init.js.
export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement
  const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  root.dataset.themePref = preference
  if (preference === 'system') root.dataset.mode = systemIsDark ? 'dark' : 'light'
  else root.dataset.mode = preference
}

// Lo mismo para el tema de color: palettes.css e intensity.css leen estos dos atributos.
export function applyAppearance(colorTheme: ColorTheme, intensity: ThemeIntensity) {
  const root = document.documentElement
  root.dataset.palette = colorTheme
  root.dataset.intensity = intensity
}
