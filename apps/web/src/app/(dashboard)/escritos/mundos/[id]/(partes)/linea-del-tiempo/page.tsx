import { notFound } from 'next/navigation'

import { WorldTimeline } from '@/features/writings'
import { getWorldTimeline } from '@/features/writings/api'

type TimelinePageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ era?: string }> }

// Mundo → Línea del tiempo: las eras y los eventos de la elegida. `?era=` abre una era directamente (lo usa la matriz del Resumen).
export default async function WorldTimelinePage({ params, searchParams }: TimelinePageProps) {
  const [{ id }, { era }] = await Promise.all([params, searchParams])
  const view = await getWorldTimeline(id, era)
  if (!view) notFound()
  return <WorldTimeline key={view.initialEraId} view={view} />
}
