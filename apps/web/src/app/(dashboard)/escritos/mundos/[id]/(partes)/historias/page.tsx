import { notFound } from 'next/navigation'

import { WorldStories } from '@/features/writings'
import { getWorldStories } from '@/features/writings/api'

type StoriesPageProps = { params: Promise<{ id: string }> }

// Mundo → Historias: las historias del mundo con sus capítulos, su material y la próxima por escribir.
export default async function WorldStoriesPage({ params }: StoriesPageProps) {
  const { id } = await params
  const view = await getWorldStories(id)
  if (!view) notFound()
  return <WorldStories view={view} />
}
