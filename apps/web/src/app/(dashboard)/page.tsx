import { redirect } from 'next/navigation'

import { HomeView } from '@/features/home'
import { getHomeData } from '@/features/home/api'
import { getMe } from '@/lib/account/api'
import { addDays, formatLongDay, minutesNowIn, startOfWeek, todayIn } from '@/lib/dates'

// Inicio: el saludo y las tarjetas de los módulos activos. La página solo
// junta datos y calcula lo que depende de la hora (en la zona del perfil),
// para que servidor y navegador muestren exactamente lo mismo.
export default async function DashboardHome() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const { profile, sections } = me
  const enabledModules = sections.filter((s) => s.enabled).map((s) => s.section)
  const data = await getHomeData(enabledModules)

  const today = todayIn(profile.timezone)
  const nowMinutes = minutesNowIn(profile.timezone)
  const weekEnd = addDays(startOfWeek(today, profile.weekStart), 6)

  return (
    <HomeView
      data={data}
      enabledModules={enabledModules}
      name={profile.name ?? 'tú'}
      hello={greetingFor(nowMinutes)}
      dateText={formatLongDay(today)}
      today={today}
      weekEnd={weekEnd}
      nowMinutes={nowMinutes}
      timeZone={profile.timezone}
      hourFormat={profile.hourFormat}
      weekStart={profile.weekStart}
      currency={profile.currency}
    />
  )
}

function greetingFor(minutes: number) {
  if (minutes < 5 * 60) return 'Buenas noches'
  if (minutes < 12 * 60) return 'Buenos días'
  if (minutes < 19 * 60) return 'Buenas tardes'
  return 'Buenas noches'
}
