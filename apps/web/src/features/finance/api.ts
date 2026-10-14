import 'server-only'

import { getMockContext, mockDelay } from '@/lib/mock/context'

import { buildMemberships } from './mock'
import type { Membership } from './types'

// Próximos cobros ordenados por fecha. Con la API: `api.get('/finance/memberships/upcoming')`.
export async function listUpcomingPayments(): Promise<Membership[]> {
  const ctx = await getMockContext()
  await mockDelay()
  return buildMemberships(ctx).sort((a, b) => a.nextChargeOn.localeCompare(b.nextChargeOn))
}
