import { TRASH_DAYS, type TrashGroup, type TrashKind } from '@kairo/shared'

import { formatMoney } from '@/lib/money'

import type { TrashItem } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

// Cómo se llama cada tipo, en singular y en plural ("Bot de marketing y sus 4 tareas").
const KIND_NAME: Record<TrashKind, [string, string]> = {
  project: ['Proyecto', 'proyectos'],
  attachment: ['Archivo', 'archivos'],
  task: ['Tarea', 'tareas'],
  event: ['Evento', 'eventos'],
  reminder: ['Recordatorio', 'recordatorios'],
  goal: ['Meta', 'metas'],
  journal_entry: ['Diario', 'entradas del diario'],
  meal: ['Comida del menú', 'comidas'],
  world: ['Mundo', 'mundos'],
  note_template: ['Sección', 'secciones'],
  character: ['Personaje', 'personajes'],
  world_note: ['Nota del mundo', 'notas'],
  era: ['Era', 'eras'],
  world_event: ['Evento del mundo', 'eventos'],
  story: ['Historia', 'historias'],
  page: ['Página', 'páginas'],
  transaction: ['Movimiento', 'movimientos'],
  membership: ['Membresía', 'membresías'],
  card: ['Tarjeta', 'tarjetas'],
  saving: ['Ahorro', 'ahorros'],
  debt: ['Deuda', 'deudas'],
  category: ['Categoría', 'categorías'],
}

// Los filtros de la pantalla (Papelera.dc.html), más "Otros".
export const GROUP_LABEL: Record<TrashGroup, string> = {
  project: 'Proyectos',
  task: 'Tareas',
  writing: 'Escritos',
  finance: 'Finanzas',
  other: 'Otros',
}

// La letra del cuadrito de la fila: la de su grupo, como en el canvas (P, T, E, F).
export const GROUP_LETTER: Record<TrashGroup, string> = { project: 'P', task: 'T', writing: 'E', finance: 'F', other: 'O' }

const PAGE_KIND: Record<string, string> = { chapter: 'Capítulo', note: 'Nota', page: 'Página' }

// El nombre que se ve: casi siempre el suyo; el diario se nombra por su día y un gasto lleva su monto.
export function itemName(item: TrashItem, timeZone: string): string {
  if (item.kind === 'journal_entry') return `Diario del ${formatDay(item.name, timeZone)}`
  if (item.kind === 'page' && item.detail && PAGE_KIND[item.detail]) return `${PAGE_KIND[item.detail]}: ${item.name || 'Sin título'}`
  const name = item.name || 'Sin título'
  if (item.kind === 'transaction' && item.amountCents !== null) return `${name} · ${formatMoney(item.amountCents)}`
  return name
}

// La segunda línea: qué es, con qué se fue y cuándo ("Proyecto con 4 tareas · borrado hoy").
export function itemMeta(item: TrashItem, now: Date): string {
  return [whatItIs(item), deletedAgo(item.deletedAt, now)].filter(Boolean).join(' · ')
}

// "Proyecto y sus 4 tareas" para el aviso al restaurar.
export function contentsText(item: TrashItem): string {
  return item.contents.map(({ kind, count }) => `${count} ${count === 1 ? KIND_NAME[kind][0].toLowerCase() : KIND_NAME[kind][1]}`).join(', ')
}

// Cuántos días le quedan antes de que la tarea programada lo borre para siempre (nunca menos de 0).
export function daysLeft(deletedAt: string, now: Date): number {
  const elapsed = Math.floor((now.getTime() - Date.parse(deletedAt)) / DAY_MS)
  return Math.max(0, TRASH_DAYS - elapsed)
}

function whatItIs(item: TrashItem): string {
  let label = KIND_NAME[item.kind][0]
  if (item.kind === 'project' && item.detail === 'school') label = 'Materia'
  if (item.kind === 'transaction') label = item.detail === 'income' ? 'Ingreso' : 'Gasto'
  if (item.kind === 'world_note' && item.detail) label = item.detail
  if ((item.kind === 'membership' || item.kind === 'card') && item.detail) label = `${label} · ••${item.detail}`
  const contents = contentsText(item)
  return contents ? `${label} con ${contents}` : label
}

function deletedAgo(deletedAt: string, now: Date): string {
  const days = Math.floor((now.getTime() - Date.parse(deletedAt)) / DAY_MS)
  if (days <= 0) return 'borrado hoy'
  if (days === 1) return 'borrado ayer'
  return `hace ${days} días`
}

function formatDay(isoDate: string, timeZone: string): string {
  // Un día suelto (AAAA-MM-DD) a mediodía UTC, para que ninguna zona horaria lo mueva al día anterior.
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', timeZone }).format(new Date(`${isoDate}T12:00:00Z`))
}
