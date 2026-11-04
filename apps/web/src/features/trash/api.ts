import 'server-only'

import { api } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'
import { mockDelay } from '@/lib/mock/context'

import { buildTrash } from './mock'
import type { TrashItem } from './types'

// Todo lo borrado de la persona, lo más reciente primero (la API ya lo ordena y agrupa lo que se fue junto).
export async function listTrash(): Promise<TrashItem[]> {
  if (DEMO_MODE) {
    await mockDelay()
    return buildTrash()
  }
  return api.get<TrashItem[]>('/trash')
}
