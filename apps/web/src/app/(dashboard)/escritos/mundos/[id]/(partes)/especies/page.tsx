import { notFound } from 'next/navigation'

import { WorldSpecies } from '@/features/writings'
import { getWorldSpecies } from '@/features/writings/api'

type SpeciesPageProps = { params: Promise<{ id: string }> }

// Mundo → Especies: una tarjeta por especie, con su región.
export default async function WorldSpeciesPage({ params }: SpeciesPageProps) {
  const { id } = await params
  const view = await getWorldSpecies(id)
  if (!view) notFound()
  return <WorldSpecies view={view} />
}
