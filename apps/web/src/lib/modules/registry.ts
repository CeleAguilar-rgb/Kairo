import type { ModuleId } from '@kairo/shared'
import { tasksModule } from '@/features/tasks'

// Sin datos de Inicio aquí (ver tasksModule): el Topnav ('use client')
// importa este archivo, así que tiene que quedarse ligero y sin nada
// server-only. Las tarjetas de Inicio están en ./home-cards.ts.
export type ModuleManifest = {
  id: ModuleId
  label: string
  href: string
  // Paths de <path d="…">; algunos íconos del canvas son más de uno (p. ej. Inicio: techo + casa).
  icon: string[]
}

// 'home' no tiene features/home/ (no es un módulo con tablas propias, ver
// modules.md): su manifiesto vive aquí directo.
export const homeModule: ModuleManifest = {
  id: 'home',
  label: 'Inicio',
  href: '/',
  icon: ['M4 11l8-7 8 7', 'M6 10v10h12V10'],
}

// El sidebar/topnav recorre esta lista y la filtra por user_sections (ver
// docs/guides/modules.md). Cada módulo nuevo de la Fase 1 agrega su
// manifiesto en features/<modulo>/module.ts y se registra aquí, sin tocar
// el componente del Shell.
export const modules: ModuleManifest[] = [homeModule, tasksModule]
