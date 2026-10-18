import { redirect } from 'next/navigation'

import { PageEnter } from '@/components/layout/PageEnter'
import { RemindersView } from '@/features/reminders'
import { listUpcomingReminders } from '@/features/reminders/api'
import { getMe } from '@/lib/account/api'

// Recordatorios: lo de hoy (con lo atrasado), el formulario de nuevo recordatorio y lo que viene. Esta
// página solo junta los datos (de ejemplo por ahora) y la hora de ahora; la pantalla es RemindersView.
export default async function RemindersPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const reminders = await listUpcomingReminders()
  const { timezone, hourFormat } = me.profile

  return (
    <PageEnter>
      <RemindersView reminders={reminders} nowIso={new Date().toISOString()} timeZone={timezone} hourFormat={hourFormat} />
    </PageEnter>
  )
}
