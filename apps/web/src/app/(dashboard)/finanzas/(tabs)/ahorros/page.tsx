import { redirect } from 'next/navigation'

import { SavingsDebtsView } from '@/features/finance'
import { getSavingsDebts } from '@/features/finance/api'
import { getMe } from '@/lib/account/api'

// Finanzas → Ahorros y deudas: cada ahorro con su meta y cada deuda con lo que falta, calculados de los movimientos.
export default async function FinanceSavingsPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const view = await getSavingsDebts()
  return <SavingsDebtsView view={view} />
}
