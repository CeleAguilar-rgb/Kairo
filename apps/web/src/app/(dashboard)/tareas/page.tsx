import { redirect } from 'next/navigation'

import { PageEnter } from '@/components/layout/PageEnter'
import { listProjects } from '@/features/projects/api'
import { TasksView } from '@/features/tasks'
import { listTasks } from '@/features/tasks/api'
import { getMe } from '@/lib/account/api'
import { addDays, startOfWeek, todayIn } from '@/lib/dates'

type TareasPageProps = { searchParams: Promise<{ nueva?: string }> }

// Tareas: la lista y el tablero. Esta página solo junta datos (los de ejemplo
// por ahora) y la fecha de hoy en la zona del perfil; la pantalla es TasksView.
export default async function TareasPage({ searchParams }: TareasPageProps) {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const [tasks, projects, { nueva }] = await Promise.all([
    listTasks(),
    listProjects(),
    searchParams,
  ])

  const today = todayIn(me.profile.timezone)
  const weekEnd = addDays(startOfWeek(today, me.profile.weekStart), 6)

  return (
    <PageEnter>
      <TasksView
        initialTasks={tasks}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        today={today}
        weekEnd={weekEnd}
        startWithCreate={nueva === '1'}
      />
    </PageEnter>
  )
}
