import { and, eq, inArray, isNotNull, isNull, lt, type SQL } from 'drizzle-orm'
import type { PgColumn, PgTable, PgUpdateSetSource } from 'drizzle-orm/pg-core'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

// Cualquier tabla con la forma común (`userColumns` de db/schema/_shared.ts). Estas consultas las usan los
// adaptadores de papelera de cada módulo con SUS tablas (`<módulo>.trash.ts`); la Papelera no las llama.
type Trashable = PgTable & { id: PgColumn; userId: PgColumn; deletedAt: PgColumn }

// Cuándo se borró una fila de la persona, o null si no es suya o no está en la papelera.
export async function deletedAtOf(db: PostgresJsDatabase, table: Trashable, userId: string, id: string): Promise<Date | null> {
  const [row] = await db
    .select({ deletedAt: table.deletedAt })
    .from(table)
    .where(and(eq(table.id, id), eq(table.userId, userId), isNotNull(table.deletedAt)))
  return (row?.deletedAt as Date | null | undefined) ?? null
}

// Devolver UNA fila sin partes internas (un gasto, una tarjeta): devuelve cuándo se había borrado.
export async function restoreRow(db: PostgresJsDatabase, table: Trashable, userId: string, id: string) {
  const at = await deletedAtOf(db, table, userId, id)
  if (!at) return null
  await setDeleted(db, table, and(eq(table.id, id), eq(table.userId, userId), eq(table.deletedAt, at)), null)
  return at
}

// Lo de una tabla que cuelga de algo (`owner`, por ejemplo `tasks.projectId`): a la papelera con la hora `to`
// (`from` null) o de vuelta (`to` null), y en ese caso solo lo que se fue a esa misma hora (`from`). Devuelve los
// ids que cambió.
export async function moveByOwner(
  db: PostgresJsDatabase,
  table: Trashable,
  owner: PgColumn,
  userId: string,
  ownerIds: string[],
  { from, to }: { from: Date | null; to: Date | null },
) {
  if (ownerIds.length === 0) return []
  const when = from ? eq(table.deletedAt, from) : isNull(table.deletedAt)
  return setDeleted(db, table, and(inArray(owner, ownerIds), eq(table.userId, userId), when), to)
}

// Borrar para siempre lo que cuelga de algo y ya está en la papelera. Devuelve las filas borradas (para quien
// tenga que borrar además sus archivos de Storage, pide sus columnas con `returning`).
export async function purgeByOwner(db: PostgresJsDatabase, table: Trashable, owner: PgColumn, userId: string, ownerId: string) {
  const rows = await db
    .delete(table)
    .where(and(eq(owner, ownerId), eq(table.userId, userId), isNotNull(table.deletedAt)))
    .returning({ id: table.id })
  return rows.length
}

// Borrar para siempre UNA fila, solo si es de la persona y ya está en la papelera: así no se puede usar para borrar
// de verdad algo vivo saltándose la papelera (regla 11). Lo que cuelga de ella se va por las llaves foráneas.
export async function purgeRow(db: PostgresJsDatabase, table: Trashable, userId: string, id: string) {
  const rows = await db
    .delete(table)
    .where(and(eq(table.id, id), eq(table.userId, userId), isNotNull(table.deletedAt)))
    .returning({ id: table.id })
  return rows.length > 0
}

// La tarea programada de los 30 días: todo lo que se borró antes de `before`, de todas las personas.
export async function purgeExpiredRows(db: PostgresJsDatabase, table: Trashable, before: Date) {
  const rows = await db.delete(table).where(lt(table.deletedAt, before)).returning({ id: table.id })
  return rows.length
}

async function setDeleted(db: PostgresJsDatabase, table: Trashable, where: SQL | undefined, to: Date | null) {
  // El tipo de `set` depende de la tabla concreta; aquí la tabla es genérica, pero todas tienen `deletedAt`.
  const values = { deletedAt: to } as PgUpdateSetSource<Trashable>
  const rows = await db.update(table).set(values).where(where).returning({ id: table.id })
  return rows.map((row) => row.id as string)
}
