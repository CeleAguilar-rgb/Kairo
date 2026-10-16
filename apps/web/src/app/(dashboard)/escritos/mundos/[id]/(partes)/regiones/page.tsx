import { notFound } from 'next/navigation'

import { WorldRegions } from '@/features/writings'
import { getWorldRegions } from '@/features/writings/api'

type RegionsPageProps = { params: Promise<{ id: string }> }

// Mundo → Regiones: una tarjeta por región, con sus reinos y sus pueblos.
export default async function WorldRegionsPage({ params }: RegionsPageProps) {
  const { id } = await params
  const view = await getWorldRegions(id)
  if (!view) notFound()
  return <WorldRegions view={view} />
}
