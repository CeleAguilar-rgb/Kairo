import type { ModuleManifest } from '@/lib/modules/registry'

// Paths de <path d="…">, no un nombre de ícono (modules.md muestra
// icon: 'wallet' como ejemplo corto; el Topnav ya espera SVGs crudos desde
// homeModule — mismo formato aquí para no mezclar dos sistemas de íconos).
//
// Sin homeCards aquí: este archivo lo importa registry.ts, que a su vez
// importa Topnav.tsx ('use client'). Las tarjetas de Inicio son Server
// Components que arrastran código server-only (features/tasks/api.ts);
// meterlas en este manifiesto rompería esa frontera cliente/servidor. Van
// aparte, en lib/modules/home-cards.ts, que solo importa Inicio.
export const tasksModule: ModuleManifest = {
  id: 'tasks',
  label: 'Tareas',
  href: '/tareas',
  icon: ['M4 4h16v16H4zM8.5 12l2.5 2.5 4.5-5'],
}
