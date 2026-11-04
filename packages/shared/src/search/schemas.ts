import { z } from 'zod'

// Lo que se puede encontrar con Ctrl+K (Atajos.dc.html: "Tareas, proyectos, eventos, metas, movimientos y
// escritos"), más recordatorios y membresías. Sin zod en la lista, para que el front la use sin cargarlo.
export const SEARCH_KINDS = [
  'task',
  'project',
  'event',
  'reminder',
  'goal',
  'transaction',
  'membership',
  'world',
  'character',
  'world_note',
  'story',
  'page',
] as const
export type SearchKind = (typeof SEARCH_KINDS)[number]

// Cuántos resultados de cada tipo como máximo: la paleta es para saltar rápido, no para listar todo.
export const SEARCH_PER_KIND = 5

// `q` llega en la URL (`GET /search?q=`). Se recorta y se limita: lo que no cabe en una búsqueda no es una búsqueda.
export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Escribe al menos 2 letras.').max(80, 'Máximo 80 caracteres.'),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>
