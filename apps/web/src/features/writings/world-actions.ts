'use server'

import { writingIdSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { mockDelay } from '@/lib/mock/context'

import { failure, type WritingActionResult } from './action-result'
import { loadWritings } from './mock-store'
import type { Story } from './types'

// Las acciones de la página de un mundo. Una Server Action es un endpoint público: lo que llega NO se confía. Con la
// API, en vez de tocar el almacén de ejemplo llaman a `api.post('/writings/worlds/:id/...')`; el userId lo pone la
// API con el token (regla 2) y toda consulta filtra por él (regla 3).

// "Empezar historia": convierte una idea por escribir en una historia del mundo, en su era y su región. La idea
// deja de estar en la lista de ideas y en la matriz del Resumen, y la historia ocupa su lugar.
export async function startIdeaAction(worldId: string, ideaId: string): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(worldId).success || !writingIdSchema.safeParse(ideaId).success) return failure('No encontramos esa idea.')

  await mockDelay()
  const { store } = await loadWritings()
  const world = store.worlds.find((item) => item.id === worldId)
  const index = world ? world.ideas.findIndex((item) => item.id === ideaId) : -1
  if (!world || index === -1) return failure('No encontramos esa idea.')

  const [idea] = world.ideas.splice(index, 1)
  const story: Story = {
    id: crypto.randomUUID(),
    title: idea.title,
    kind: 'story',
    summary: idea.summary,
    color: 'ink',
    wordGoal: null,
    worldId: world.id,
    eraId: idea.eraId,
    regionId: idea.regionId,
    resources: [],
  }
  store.stories.push(story)
  revalidatePath('/escritos', 'layout')
  return { ok: true, id: story.id }
}
