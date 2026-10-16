import { isoDateSchema } from '@kairo/shared'
import { redirect } from 'next/navigation'

import { DailyToolbar, EditRoutineLink, MenuWeek, WeekSwitcher } from '@/features/daily'
import { getMealWeek } from '@/features/daily/api'
import { getMe } from '@/lib/account/api'
import { addDays, startOfWeek, todayIn } from '@/lib/dates'

const BASE = '/dia-a-dia/menu'

type PageProps = { searchParams: Promise<{ semana?: string }> }

// Día a día → Menú: la semana en curso o la que viene (`?semana=AAAA-MM-DD`). El menú de lo que ya pasó no se
// planea, y más allá de la semana que viene todavía no hace falta. La semana de la dirección se valida como
// cualquier otra entrada, y si no es una de las dos, se muestra la actual.
export default async function DailyMenuPage({ searchParams }: PageProps) {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const { timezone, hourFormat, weekStart: weekStartPref } = me.profile
  const today = todayIn(timezone)
  const currentStart = startOfWeek(today, weekStartPref)
  const nextStart = addDays(currentStart, 7)

  const { semana } = await searchParams
  const requested = isoDateSchema.safeParse(semana)
  const weekStart = requested.success && startOfWeek(requested.data, weekStartPref) === nextStart ? nextStart : currentStart

  const previousStart = addDays(weekStart, -7)
  const [week, previous] = await Promise.all([getMealWeek(weekStart), getMealWeek(previousStart)])

  return (
    <>
      <DailyToolbar action={<EditRoutineLink />}>
        <WeekSwitcher
          weekStart={weekStart}
          prevHref={weekStart === nextStart ? BASE : null}
          nextHref={weekStart === currentStart ? `${BASE}?semana=${nextStart}` : null}
        />
      </DailyToolbar>

      <MenuWeek
        key={weekStart}
        weekStart={weekStart}
        today={today}
        plans={week.plans}
        slots={week.slots}
        previous={{ start: previousStart, hasMenu: previous.plans.length > 0 }}
        hourFormat={hourFormat}
      />
    </>
  )
}
