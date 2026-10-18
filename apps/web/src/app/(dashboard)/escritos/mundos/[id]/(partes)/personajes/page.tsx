import { notFound } from 'next/navigation'

import { WorldCharacters } from '@/features/writings'
import { getWorldCharacters } from '@/features/writings/api'

type CharactersPageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ reino?: string; personaje?: string }> }

// Mundo → Personajes: filtros por reino, la lista y la ficha del elegido. `?reino=` y `?personaje=` abren el filtro y el
// personaje directamente (los usan los reinos de Regiones).
export default async function WorldCharactersPage({ params, searchParams }: CharactersPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const view = await getWorldCharacters(id, query)
  if (!view) notFound()
  return <WorldCharacters key={`${view.initialGroup}-${view.initialCharacterId}`} view={view} />
}
