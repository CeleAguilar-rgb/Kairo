import { redirect } from 'next/navigation'

import { PageEnter } from '@/components/layout/PageEnter'
import { ProjectsView } from '@/features/projects'
import { listProjects } from '@/features/projects/api'
import { getMe } from '@/lib/account/api'
import { addDays, startOfWeek, todayIn } from '@/lib/dates'

// Proyectos: la galería de tarjetas. Esta página solo junta los datos (de ejemplo por
// ahora) y la fecha de hoy en la zona del perfil; la pantalla es ProjectsView.
export default async function ProyectosPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const projects = await listProjects()
  const today = todayIn(me.profile.timezone)
  const weekEnd = addDays(startOfWeek(today, me.profile.weekStart), 6)

  return (
    <PageEnter>
      <ProjectsView projects={projects} today={today} weekEnd={weekEnd} />
    </PageEnter>
  )
}
