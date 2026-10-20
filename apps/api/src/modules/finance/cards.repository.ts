import { Inject, Injectable } from '@nestjs/common'
import type { CardColor, CardKind } from '@kairo/shared'
import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { cards, memberships } from '../../db/schema/finance'

type NewCard = { name: string; kind: CardKind; last4: string | null; color: CardColor; cutDay: number | null; dueDay: number | null }

@Injectable()
export class CardsRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  findLive(userId: string) {
    return this.db
      .select()
      .from(cards)
      .where(and(eq(cards.userId, userId), isNull(cards.deletedAt)))
      .orderBy(asc(cards.createdAt))
  }

  // Las que se borraron: los movimientos viejos siguen diciendo con cuál se pagaron (regla 11: borrar es
  // papelera, no se pierde el historial).
  findArchived(userId: string) {
    return this.db
      .select()
      .from(cards)
      .where(and(eq(cards.userId, userId), isNotNull(cards.deletedAt)))
      .orderBy(asc(cards.createdAt))
  }

  findOne(userId: string, id: string) {
    return this.db
      .select()
      .from(cards)
      .where(and(eq(cards.id, id), eq(cards.userId, userId), isNull(cards.deletedAt)))
      .then((rows) => rows[0])
  }

  // La cuenta con la que se mueven los aportes y pagos rápidos: la primera de débito, si hay.
  firstDebit(userId: string) {
    return this.db
      .select()
      .from(cards)
      .where(and(eq(cards.userId, userId), eq(cards.kind, 'debit'), isNull(cards.deletedAt)))
      .orderBy(asc(cards.createdAt))
      .limit(1)
      .then((rows) => rows[0])
  }

  async create(userId: string, data: NewCard) {
    const [row] = await this.db.insert(cards).values({ userId, ...data }).returning()
    if (!row) throw new Error('No se pudo crear la tarjeta.')
    return row
  }

  // Borra la tarjeta y, con ella, sus membresías (la pantalla ya las mostró en la confirmación). Las dos cosas
  // juntas o ninguna. Devuelve cuáles membresías se fueron, para que "Deshacer" devuelva solo esas.
  deleteWithMemberships(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      const deletedAt = new Date()
      const [card] = await tx
        .update(cards)
        .set({ deletedAt })
        .where(and(eq(cards.id, id), eq(cards.userId, userId), isNull(cards.deletedAt)))
        .returning({ id: cards.id })
      if (!card) return undefined

      const removed = await tx
        .update(memberships)
        .set({ deletedAt })
        .where(and(eq(memberships.cardId, id), eq(memberships.userId, userId), isNull(memberships.deletedAt)))
        .returning({ id: memberships.id })
      return { membershipIds: removed.map((row) => row.id) }
    })
  }

  restoreWithMemberships(userId: string, id: string, membershipIds: string[]) {
    return this.db.transaction(async (tx) => {
      await tx.update(cards).set({ deletedAt: null }).where(and(eq(cards.id, id), eq(cards.userId, userId)))
      if (membershipIds.length === 0) return
      await tx
        .update(memberships)
        .set({ deletedAt: null })
        .where(and(inArray(memberships.id, membershipIds), eq(memberships.cardId, id), eq(memberships.userId, userId)))
    })
  }
}
