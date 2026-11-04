import type { SearchKind } from '@kairo/shared'

import { formatDayMonth } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

import type { SearchHit } from './types'

// El título de cada grupo de resultados (Atajos.dc.html agrupa por sección).
export const KIND_GROUP: Record<SearchKind, string> = {
  task: 'Tareas',
  project: 'Proyectos',
  event: 'Eventos',
  reminder: 'Recordatorios',
  goal: 'Metas',
  transaction: 'Finanzas',
  membership: 'Finanzas',
  world: 'Escritos',
  character: 'Escritos',
  world_note: 'Escritos',
  story: 'Escritos',
  page: 'Escritos',
}

// El ícono de cada tipo (los trazos de IC en Atajos.dc.html).
export type HitTone = 'inverted' | 'accent' | 'accentStrong' | 'muted' | 'warm'
export const KIND_ICON: Record<SearchKind, { d: string; tone: HitTone }> = {
  task: { d: 'M4 4h16v16H4zM8.5 12l2.5 2.5 4.5-5', tone: 'inverted' },
  project: { d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z', tone: 'muted' },
  event: { d: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4', tone: 'accent' },
  reminder: { d: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9', tone: 'accent' },
  goal: { d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', tone: 'accentStrong' },
  transaction: { d: 'M4 7h16v10H4zM4 11h16', tone: 'warm' },
  membership: { d: 'M4 7h16v10H4zM4 11h16', tone: 'warm' },
  world: { d: 'M6 3h9l4 4v14H6zM14 3v5h5', tone: 'warm' },
  character: { d: 'M6 3h9l4 4v14H6zM14 3v5h5', tone: 'warm' },
  world_note: { d: 'M6 3h9l4 4v14H6zM14 3v5h5', tone: 'warm' },
  story: { d: 'M6 3h9l4 4v14H6zM14 3v5h5', tone: 'warm' },
  page: { d: 'M6 3h9l4 4v14H6zM14 3v5h5', tone: 'warm' },
}

const PAGE_KIND: Record<string, string> = { chapter: 'Capítulo', note: 'Nota', page: 'Página' }
const PROJECT_KIND: Record<string, string> = { school: 'Escuela', work: 'Trabajo', personal: 'Personal' }

// A dónde lleva cada resultado. Lo que no tiene ruta propia lleva a su sección.
export function hitHref(hit: SearchHit): string {
  switch (hit.kind) {
    case 'task':
      return '/tareas'
    case 'project':
      return hit.detail === 'school' ? '/escuela' : `/proyectos/${hit.id}`
    case 'event':
      return '/agenda'
    case 'reminder':
      return '/recordatorios'
    case 'goal':
      return '/dia-a-dia/metas'
    case 'transaction':
      return hit.date ? `/finanzas/movimientos?mes=${hit.date.slice(0, 7)}` : '/finanzas/movimientos'
    case 'membership':
      return '/finanzas/membresias'
    case 'world':
      return `/escritos/mundos/${hit.id}`
    case 'character':
    case 'world_note':
      return hit.parentId ? `/escritos/mundos/${hit.parentId}/ficha/${hit.id}` : '/escritos'
    case 'story':
      return hit.parentId ? `/escritos/mundos/${hit.parentId}/historias?historia=${hit.id}` : '/escritos'
    case 'page':
      return `/escritos/paginas/${hit.id}`
  }
}

// La segunda línea ("Agenda · 14 de octubre", "Movimiento · −$1,180 · 5 de octubre").
export function hitSub(hit: SearchHit): string {
  const day = hit.date && hit.date.length === 10 ? formatDayMonth(hit.date) : null
  switch (hit.kind) {
    case 'task':
      return ['Tarea', day].filter(Boolean).join(' · ')
    case 'project':
      return `Proyecto · ${PROJECT_KIND[hit.detail ?? ''] ?? 'Proyecto'}`
    case 'event':
      return ['Agenda', day].filter(Boolean).join(' · ')
    case 'reminder':
      return 'Recordatorio'
    case 'goal':
      return ['Meta', day ? `para el ${day}` : null].filter(Boolean).join(' · ')
    case 'transaction': {
      const sign = hit.detail === 'income' ? '+' : '−'
      return ['Movimiento', hit.amountCents === null ? null : `${sign}${formatMoney(hit.amountCents)}`, day].filter(Boolean).join(' · ')
    }
    case 'membership':
      return ['Membresía', hit.amountCents === null ? null : formatMoney(hit.amountCents)].filter(Boolean).join(' · ')
    case 'world':
      return 'Mundo'
    case 'character':
      return ['Personaje', hit.detail].filter(Boolean).join(' · ')
    case 'world_note':
      return hit.detail ?? 'Nota del mundo'
    case 'story':
      return 'Historia'
    case 'page':
      return PAGE_KIND[hit.detail ?? ''] ?? 'Página'
  }
}
