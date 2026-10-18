import 'server-only'
import type { ModuleId } from '@kairo/shared'
import type { ComponentType } from 'react'
import { HomePendingCard } from '@/features/tasks/components/HomePendingCard'

// Qué tarjetas aporta cada módulo a Inicio (modules.md, "getHomeCard").
// Deliberadamente separado de lib/modules/registry.ts: ese archivo lo
// importa el Topnav ('use client'), y estas tarjetas son Server Components
// que llaman a su propia API — solo Inicio (app/(dashboard)/page.tsx)
// debe importar este archivo.
export const HOME_CARDS_BY_MODULE: Partial<Record<ModuleId, ComponentType[]>> = {
  tasks: [HomePendingCard],
}
