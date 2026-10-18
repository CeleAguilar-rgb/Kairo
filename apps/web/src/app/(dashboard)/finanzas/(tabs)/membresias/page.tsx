import { redirect } from 'next/navigation'

import { MembershipsView } from '@/features/finance'
import { getFinanceMonth, getMemberships } from '@/features/finance/api'
import { getMe } from '@/lib/account/api'

// Finanzas → Membresías: las tarjetas y lo que se cobra cada cierto tiempo, con su próximo cobro.
export default async function FinanceMembershipsPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const [{ today }, view] = await Promise.all([getFinanceMonth(), getMemberships()])
  return <MembershipsView view={view} today={today} />
}
