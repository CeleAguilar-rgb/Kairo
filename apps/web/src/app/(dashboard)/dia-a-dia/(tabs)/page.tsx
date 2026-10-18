import { redirect } from 'next/navigation'

import { TodayView } from '@/features/daily'
import { getDayRoutine, getMealsToday, getRoutineStreaks } from '@/features/daily/api'
import { getMe } from '@/lib/account/api'
import { formatLongDay, todayIn } from '@/lib/dates'

// Día a día → Hoy: la rutina del día. Esta página solo junta los datos (de ejemplo por ahora) y la hora de
// ahora en la zona del perfil; la pantalla es TodayView.
export default async function DailyTodayPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const [day, streaks, meals] = await Promise.all([getDayRoutine(), getRoutineStreaks(), getMealsToday()])
  const { timezone, hourFormat } = me.profile

  return (
    <TodayView
      day={day}
      streaks={streaks}
      meals={meals}
      nowIso={new Date().toISOString()}
      timeZone={timezone}
      hourFormat={hourFormat}
      dateText={formatLongDay(todayIn(timezone))}
    />
  )
}
