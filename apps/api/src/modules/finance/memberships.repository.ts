import { Inject, Injectable } from '@nestjs/common'
import type { MembershipCadence, MembershipStatus } from '@kairo/shared'
import { and, asc, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { memberships } from '../../db/schema/finance'

type MembershipFields = {
  name: string
  amountCents: number
  currency: string
  cadence: MembershipCadence
  chargeDay: number | null
  chargeMonth: number | null
  chargeWeekday: number | null
  cardId: string | null
  notify: boolean
  status: MembershipStatus
}

@Injectable()
export class MembershipsRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  // Todas, activas y en pausa: el front las separa y calcula el próximo cobro de cada una.
  findLive(userId: string) {
    return this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, userId), isNull(memberships.deletedAt)))
      .orderBy(asc(memberships.createdAt))
  }

  findOne(userId: string, id: string) {
    return this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, id), eq(memberships.userId, userId), isNull(memberships.deletedAt)))
      .then((rows) => rows[0])
  }

  async create(userId: string, data: MembershipFields) {
    const [row] = await this.db.insert(memberships).values({ userId, ...data }).returning()
    if (!row) throw new Error('No se pudo crear la membresía.')
    return row
  }

  async update(userId: string, id: string, data: MembershipFields) {
    const [row] = await this.db
      .update(memberships)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(memberships.id, id), eq(memberships.userId, userId), isNull(memberships.deletedAt)))
      .returning()
    return row
  }

  async softDelete(userId: string, id: string) {
    const [row] = await this.db
      .update(memberships)
      .set({ deletedAt: new Date() })
      .where(and(eq(memberships.id, id), eq(memberships.userId, userId), isNull(memberships.deletedAt)))
      .returning({ id: memberships.id })
    return row
  }

  async restore(userId: string, id: string) {
    await this.db
      .update(memberships)
      .set({ deletedAt: null })
      .where(and(eq(memberships.id, id), eq(memberships.userId, userId)))
  }
}
