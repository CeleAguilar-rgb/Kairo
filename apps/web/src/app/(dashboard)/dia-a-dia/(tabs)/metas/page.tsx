import { redirect } from 'next/navigation'

import { GoalsView } from '@/features/daily'
import { listAllGoals, listHabitBlocks, listProjectOptions } from '@/features/daily/api'
import { getMe } from '@/lib/account/api'
import { todayIn } from '@/lib/dates'

// Día a día → Metas: las metas por estado y su formulario. Esta página solo junta los datos (de ejemplo por
// ahora) y la fecha de hoy en la zona del perfil; la pantalla es GoalsView.
export default async function DailyGoalsPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const [goals, habitBlocks, projects] = await Promise.all([listAllGoals(), listHabitBlocks(), listProjectOptions()])

  return <GoalsView goals={goals} today={todayIn(me.profile.timezone)} habitBlocks={habitBlocks} projects={projects} />
}
