import { notFound, redirect } from 'next/navigation'

import { PageEnter } from '@/components/layout/PageEnter'
import { EntryFullPage } from '@/features/writings'
import { getEntryPage } from '@/features/writings/api'
import { getMe } from '@/lib/account/api'

type EntryPageProps = { params: Promise<{ id: string; entryId: string }> }

// La página completa de una ficha del mundo (un personaje, una especie, un lugar…): portada, secciones y bloques.
export default async function WorldEntryPage({ params }: EntryPageProps) {
  const { id, entryId } = await params
  const [me, found] = await Promise.all([getMe(), getEntryPage(id, entryId)])
  if (!me) redirect('/bienvenida')
  if (!found) notFound()

  return (
    <PageEnter>
      {/* `key`: al pasar de una ficha a otra la página empieza de cero (el editor de bloques no arrastra la anterior). */}
      <EntryFullPage key={found.entry.id} bundle={found.bundle} entry={found.entry} />
    </PageEnter>
  )
}
