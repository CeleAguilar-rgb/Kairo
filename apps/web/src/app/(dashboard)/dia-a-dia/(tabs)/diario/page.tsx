import { redirect } from 'next/navigation'

import { DailyToolbar, EditRoutineLink, JournalView } from '@/features/daily'
import { getDaySummary, listJournal } from '@/features/daily/api'
import { getMe } from '@/lib/account/api'
import { formatMonthYear, todayIn } from '@/lib/dates'

// Día a día → Diario: la entrada de hoy, el mapa de ánimo del mes y los días anteriores. Esta página solo junta
// los datos (de ejemplo por ahora); la pantalla es JournalView. El PIN y el cifrado llegan con la API.
export default async function DailyJournalPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const { timezone, hourFormat, weekStart } = me.profile
  const today = todayIn(timezone)
  const [entries, daySummary] = await Promise.all([listJournal(), getDaySummary()])

  return (
    <>
      <DailyToolbar action={<EditRoutineLink />}>Tu diario · {formatMonthYear(today).split(' ')[0].toLowerCase()}</DailyToolbar>
      <JournalView entries={entries} today={today} daySummary={daySummary} timeZone={timezone} hourFormat={hourFormat} weekStart={weekStart} />
    </>
  )
}
