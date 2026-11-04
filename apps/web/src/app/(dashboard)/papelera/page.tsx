import { redirect } from 'next/navigation'

import { PageEnter } from '@/components/layout/PageEnter'
import { TrashView } from '@/features/trash'
import { listTrash } from '@/features/trash/api'
import { getMe } from '@/lib/account/api'

// Papelera: todo lo borrado de los últimos 30 días, de todos los módulos. Esta página junta los datos y la hora de
// ahora (para "Quedan 27 días"); la pantalla es TrashView.
export default async function TrashPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const items = await listTrash()

  return (
    <PageEnter>
      <TrashView items={items} nowIso={new Date().toISOString()} timeZone={me.profile.timezone} />
    </PageEnter>
  )
}
