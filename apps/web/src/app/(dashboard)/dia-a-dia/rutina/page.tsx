import { redirect } from 'next/navigation'

import { PageEnter } from '@/components/layout/PageEnter'
import { RoutineEditor } from '@/features/daily'
import { listFocusLinks, listRoutines } from '@/features/daily/api'
import { getMe } from '@/lib/account/api'

// Día a día → Mis rutinas: el editor de rutinas y sus bloques. Es una pantalla aparte (sin las pestañas de
// Día a día), por eso vive fuera del grupo (tabs). Esta página solo junta los datos (de ejemplo por ahora);
// la pantalla es RoutineEditor.
export default async function RoutineEditorPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const [{ routines, blocks }, links] = await Promise.all([listRoutines(), listFocusLinks()])

  return (
    <PageEnter>
      <RoutineEditor routines={routines} blocks={blocks} links={links} hourFormat={me.profile.hourFormat} />
    </PageEnter>
  )
}
