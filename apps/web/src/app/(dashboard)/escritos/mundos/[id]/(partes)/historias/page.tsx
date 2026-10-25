import { StoriesTab } from '@/features/writings'

type StoriesPageProps = { searchParams: Promise<{ historia?: string }> }

// Mundo → Historias. `?historia=` abre una directamente (la usan el Resumen y las menciones).
export default async function WorldStoriesPage({ searchParams }: StoriesPageProps) {
  const { historia } = await searchParams
  return <StoriesTab key={historia ?? 'first'} initialStoryId={historia ?? null} />
}
