import { TimelineTab } from '@/features/writings'

type TimelinePageProps = { searchParams: Promise<{ era?: string }> }

// Mundo → Línea del tiempo. `?era=` abre una era directamente (la usa la tabla del Resumen).
export default async function WorldTimelinePage({ searchParams }: TimelinePageProps) {
  const { era } = await searchParams
  return <TimelineTab key={era ?? 'first'} initialEraId={era ?? null} />
}
