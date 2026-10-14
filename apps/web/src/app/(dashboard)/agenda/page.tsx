import { redirect } from 'next/navigation'

import { PageEnter } from '@/components/layout/PageEnter'
import { AgendaView } from '@/features/agenda'
import { getAgendaEntries } from '@/features/agenda/api'
import { listProjects } from '@/features/projects/api'
import { getMe } from '@/lib/account/api'
import { minutesNowIn, todayIn } from '@/lib/dates'

// Agenda: el calendario con eventos, cobros de membresías y tareas con fecha. Esta página solo junta los
// datos (de ejemplo por ahora), la fecha de hoy y la hora de ahora en la zona del perfil; la pantalla es AgendaView.
export default async function AgendaPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const [entries, projects] = await Promise.all([getAgendaEntries(), listProjects()])
  const { timezone, hourFormat, weekStart } = me.profile

  return (
    <PageEnter>
      <AgendaView
        entries={entries}
        // Los proyectos que se pueden elegir al crear un evento (los archivados ya no).
        projects={projects.filter((project) => project.status !== 'archived').map((project) => ({ id: project.id, name: project.name }))}
        today={todayIn(timezone)}
        nowMinutes={minutesNowIn(timezone)}
        timeZone={timezone}
        hourFormat={hourFormat}
        weekStart={weekStart}
      />
    </PageEnter>
  )
}
