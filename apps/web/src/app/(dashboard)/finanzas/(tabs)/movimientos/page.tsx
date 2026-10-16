import { redirect } from 'next/navigation'

import { MovementsView } from '@/features/finance'
import { getFinanceMonth, getMovements } from '@/features/finance/api'
import { monthHrefs } from '@/features/finance/finance-utils'
import { getMe } from '@/lib/account/api'

type PageProps = { searchParams: Promise<{ mes?: string; nuevo?: string }> }

const BASE = '/finanzas/movimientos'

// Finanzas → Movimientos: los del mes en curso o uno de los 5 anteriores (`?mes=AAAA-MM`). `?nuevo=1` abre el panel
// de movimiento nuevo (el botón "Movimiento" del Resumen lleva aquí).
export default async function FinanceMovementsPage({ searchParams }: PageProps) {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const { mes, nuevo } = await searchParams
  const [{ month, current, oldest, today }, view] = await Promise.all([getFinanceMonth(mes), getMovements(mes)])
  const { prevHref, nextHref } = monthHrefs(BASE, month, current, oldest)

  return <MovementsView key={month} view={view} today={today} prevHref={prevHref} nextHref={nextHref} openNew={nuevo === '1'} />
}
