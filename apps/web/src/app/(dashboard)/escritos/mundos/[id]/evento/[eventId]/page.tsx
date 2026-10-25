import { notFound, redirect } from 'next/navigation'

import { PageEnter } from '@/components/layout/PageEnter'
import { EventFullPage } from '@/features/writings'
import { getWorldBundle } from '@/features/writings/api'
import { getMe } from '@/lib/account/api'

type EventPageProps = { params: Promise<{ id: string; eventId: string }> }

// La página completa de un evento de la línea del tiempo (EscritosPaginaEvento).
export default async function WorldEventPage({ params }: EventPageProps) {
  const { id, eventId } = await params
  const [me, bundle] = await Promise.all([getMe(), getWorldBundle(id)])
  if (!me) redirect('/bienvenida')
  if (!bundle || !bundle.events.some((event) => event.id === eventId)) notFound()

  return (
    <PageEnter>
      <EventFullPage key={eventId} bundle={bundle} eventId={eventId} />
    </PageEnter>
  )
}
