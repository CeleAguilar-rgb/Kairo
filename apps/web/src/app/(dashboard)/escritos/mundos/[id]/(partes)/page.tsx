import { notFound } from 'next/navigation'

import { WorldSummary } from '@/features/writings'
import { getWorldSummary } from '@/features/writings/api'

type WorldPageProps = { params: Promise<{ id: string }> }

// Mundo → Resumen: "Dónde y cuándo", los huecos por llenar y las reglas del mundo.
export default async function WorldSummaryPage({ params }: WorldPageProps) {
  const { id } = await params
  const view = await getWorldSummary(id)
  if (!view) notFound()
  return <WorldSummary view={view} />
}
