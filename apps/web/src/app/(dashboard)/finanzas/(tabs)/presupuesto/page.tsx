import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { BudgetView } from '@/features/finance'
import { getBudget } from '@/features/finance/api'
import { getMe } from '@/lib/account/api'

export const metadata: Metadata = { title: 'Presupuesto' }

// Finanzas → Presupuesto: el límite mensual de cada categoría contra lo que va gastado este mes.
export default async function FinanceBudgetPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const view = await getBudget()
  return <BudgetView view={view} />
}
