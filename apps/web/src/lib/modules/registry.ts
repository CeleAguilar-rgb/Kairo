import type { ModuleId } from '@kairo/shared'

export type ModuleManifest = {
  id: ModuleId
  label: string
  href: string
  // Paths de <path d="…">; algunos íconos del canvas son más de uno (p. ej. Inicio: techo + casa).
  icon: string[]
}

export const homeModule: ModuleManifest = {
  id: 'home',
  label: 'Inicio',
  href: '/',
  icon: ['M4 11l8-7 8 7', 'M6 10v10h12V10'],
}

// El sidebar/topnav recorre esta lista y la filtra por user_sections (ver
// docs/guides/modules.md). Por ahora solo existe Inicio; cada módulo nuevo
// de la Fase 1 agrega su manifiesto aquí cuando se construye, sin tocar el
// componente del Shell.
export const modules: ModuleManifest[] = [homeModule]
