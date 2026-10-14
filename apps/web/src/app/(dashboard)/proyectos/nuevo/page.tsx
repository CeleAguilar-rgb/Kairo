import type { ProjectInput } from '@kairo/shared'
import { redirect } from 'next/navigation'

import { PageEnter } from '@/components/layout/PageEnter'
import { ProjectForm } from '@/features/projects'
import { getMe } from '@/lib/account/api'
import { todayIn } from '@/lib/dates'

// "Nuevo proyecto": el formulario vacío. Empieza hoy, es personal y activo, con la portada de
// olas (los valores con los que abre el canvas).
export default async function NewProjectPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const initial: ProjectInput = {
    name: '',
    kind: 'personal',
    status: 'active',
    description: '',
    startedOn: todayIn(me.profile.timezone),
    goalOn: null,
    objectives: [],
    links: [],
    cover: 'olas',
  }

  return (
    <PageEnter>
      <ProjectForm mode="create" initial={initial} />
    </PageEnter>
  )
}
