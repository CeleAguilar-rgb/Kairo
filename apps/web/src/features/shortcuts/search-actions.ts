'use server'

import { searchQuerySchema } from '@kairo/shared'

import { api, ApiError } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'

import { DEMO_HITS } from './mock'
import type { SearchHit } from './types'

export type SearchActionResult = { ok: true; hits: SearchHit[] } | { ok: false; message: string }

// Ctrl+K. Una Server Action es un endpoint público: el texto se vuelve a validar con el esquema compartido (regla 4);
// la API solo busca en lo de la persona del token (reglas 2 y 3).
export async function searchAction(raw: unknown): Promise<SearchActionResult> {
  const parsed = searchQuerySchema.safeParse({ q: raw })
  if (!parsed.success) return { ok: true, hits: [] }
  const q = parsed.data.q
  if (DEMO_MODE) {
    const needle = q.toLowerCase()
    return { ok: true, hits: DEMO_HITS.filter((hit) => `${hit.title} ${hit.detail ?? ''}`.toLowerCase().includes(needle)) }
  }
  try {
    return { ok: true, hits: await api.get<SearchHit[]>(`/search?q=${encodeURIComponent(q)}`) }
  } catch (error) {
    return { ok: false, message: error instanceof ApiError ? error.message : 'No pudimos buscar. Intenta de nuevo.' }
  }
}
