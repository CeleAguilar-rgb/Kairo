import { CharactersTab } from '@/features/writings'

type CharactersPageProps = { searchParams: Promise<{ reino?: string }> }

// Mundo → Personajes. `?reino=` abre el filtro de un reino directamente.
export default async function WorldCharactersPage({ searchParams }: CharactersPageProps) {
  const { reino } = await searchParams
  return <CharactersTab key={reino ?? 'all'} initialGroup={reino ?? null} />
}
