import { redirect } from 'next/navigation'

import { ButtonLink } from '@/components/ui/ButtonLink'
import { LineIcon } from '@/components/ui/Card'
import { FinanceToolbar, MonthSwitcher, SummaryView } from '@/features/finance'
import { getFinanceMonth, getFinanceSummary } from '@/features/finance/api'
import { monthHrefs } from '@/features/finance/finance-utils'
import { getMe } from '@/lib/account/api'

type PageProps = { searchParams: Promise<{ mes?: string }> }

const BASE = '/finanzas'

// Finanzas → Resumen: el mes en curso o uno de los 5 anteriores (`?mes=AAAA-MM`). El mes de la dirección se valida
// y recorta como cualquier otra entrada; si no es uno de esos seis, se muestra el actual.
export default async function FinanceSummaryPage({ searchParams }: PageProps) {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const { mes } = await searchParams
  const [{ month, current, oldest, today }, summary] = await Promise.all([getFinanceMonth(mes), getFinanceSummary(mes)])
  const { prevHref, nextHref } = monthHrefs(BASE, month, current, oldest)

  return (
    <>
      <FinanceToolbar
        action={
          <ButtonLink href="/finanzas/movimientos?nuevo=1">
            <LineIcon d="M12 5v14M5 12h14" size={16} strokeWidth={2} />
            Movimiento
          </ButtonLink>
        }
      >
        <MonthSwitcher month={month} prevHref={prevHref} nextHref={nextHref} />
      </FinanceToolbar>

      <SummaryView summary={summary} today={today} />
    </>
  )
}
