import { isoDateSchema } from '@kairo/shared'
import { redirect } from 'next/navigation'

import { DailyToolbar, EditRoutineLink, ReportView, WeekSwitcher } from '@/features/daily'
import { getReportWeek } from '@/features/daily/api'
import { getMe } from '@/lib/account/api'
import { addDays, startOfWeek, todayIn } from '@/lib/dates'

const BASE = '/dia-a-dia/reporte'

// Cuántas semanas hacia atrás se puede mirar el reporte (los datos de ejemplo no tienen más historia).
const MAX_WEEKS_BACK = 12

type PageProps = { searchParams: Promise<{ semana?: string }> }

// Día a día → Reporte: una semana (`?semana=AAAA-MM-DD`). Ninguna semana futura; la dirección se valida como
// cualquier otra entrada y, si no cuadra, se muestra la semana actual.
export default async function DailyReportPage({ searchParams }: PageProps) {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const { timezone, hourFormat, weekStart: weekStartPref } = me.profile
  const today = todayIn(timezone)
  const currentStart = startOfWeek(today, weekStartPref)
  const oldestStart = addDays(currentStart, -7 * MAX_WEEKS_BACK)

  const { semana } = await searchParams
  const requested = isoDateSchema.safeParse(semana)
  const asked = requested.success ? startOfWeek(requested.data, weekStartPref) : currentStart
  const weekStart = asked > currentStart || asked < oldestStart ? currentStart : asked

  const report = await getReportWeek(weekStart)

  return (
    <>
      <DailyToolbar action={<EditRoutineLink />}>
        <WeekSwitcher
          weekStart={weekStart}
          prevHref={weekStart > oldestStart ? `${BASE}?semana=${addDays(weekStart, -7)}` : null}
          nextHref={weekStart < currentStart ? (addDays(weekStart, 7) === currentStart ? BASE : `${BASE}?semana=${addDays(weekStart, 7)}`) : null}
        />
      </DailyToolbar>

      <ReportView key={weekStart} report={report} today={today} hourFormat={hourFormat} />
    </>
  )
}
