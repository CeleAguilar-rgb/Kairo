import type { ThemePreference } from '@kairo/shared'

// Cambia el modo en la página abierta, sin recargar. Lo que pasa después con 'system'
// (si el sistema cambia, o si Next vuelve a renderizar el layout) lo cuida public/theme-init.js.
export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement
  const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  root.dataset.themePref = preference
  if (preference === 'system') root.dataset.mode = systemIsDark ? 'dark' : 'light'
  else root.dataset.mode = preference
}
