import { Inject, Injectable } from '@nestjs/common'
import type { SubjectColor } from '@kairo/shared'
import { and, desc, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { schoolTerms, subjects } from '../../db/schema/school'

export type TermFields = { name: string; startsOn: string; endsOn: string; prepProjectId: string | null }
export type NewSubject = { projectId: string; termId: string | null; teacher: string | null; color: SubjectColor }
// Las calificaciones ya en la forma de la columna (texto con un decimal); solo van las que cambian.
export type GradeColumns = { midterm1?: string | null; midterm2?: string | null; final?: string | null }

// Este repository solo toca las dos tablas de Escuela (modules.md): el nombre del proyecto, las clases y las
// entregas son de otros módulos y se piden a sus services.
@Injectable()
export class SchoolRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  // --- Periodos ---------------------------------------------------------------------------------------

  // El más reciente primero. Cuál es "el actual" lo decide el Next.js con la fecha de hoy (decisión #38).
  findTerms(userId: string) {
    return this.db
      .select()
      .from(schoolTerms)
      .where(and(eq(schoolTerms.userId, userId), isNull(schoolTerms.deletedAt)))
      .orderBy(desc(schoolTerms.startsOn))
  }

  findTerm(userId: string, id: string) {
    return this.db
      .select()
      .from(schoolTerms)
      .where(and(eq(schoolTerms.id, id), eq(schoolTerms.userId, userId), isNull(schoolTerms.deletedAt)))
      .then((rows) => rows[0])
  }

  // El periodo nuevo y, en la misma transacción, las materias que todavía no tenían periodo pasan a él: así el
  // primer periodo que se define "adopta" lo que ya se había creado sin uno.
  createTerm(userId: string, fields: TermFields) {
    return this.db.transaction(async (tx) => {
      const [term] = await tx.insert(schoolTerms).values({ userId, ...fields }).returning()
      if (!term) throw new Error('No se pudo crear el periodo.')
      await tx
        .update(subjects)
        .set({ termId: term.id, updatedAt: new Date() })
        .where(and(eq(subjects.userId, userId), isNull(subjects.termId), isNull(subjects.deletedAt)))
      return term
    })
  }

  // where: { id, userId } también al editar (security.md #4).
  updateTerm(userId: string, id: string, fields: TermFields) {
    return this.db
      .update(schoolTerms)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(schoolTerms.id, id), eq(schoolTerms.userId, userId), isNull(schoolTerms.deletedAt)))
      .returning()
      .then((rows) => rows[0])
  }

  // --- Materias ---------------------------------------------------------------------------------------

  findSubjects(userId: string) {
    return this.db
      .select()
      .from(subjects)
      .where(and(eq(subjects.userId, userId), isNull(subjects.deletedAt)))
      .orderBy(subjects.createdAt)
  }

  findSubject(userId: string, id: string) {
    return this.db
      .select()
      .from(subjects)
      .where(and(eq(subjects.id, id), eq(subjects.userId, userId), isNull(subjects.deletedAt)))
      .then((rows) => rows[0])
  }

  createSubject(userId: string, data: NewSubject) {
    return this.db
      .insert(subjects)
      .values({ userId, ...data })
      .returning()
      .then((rows) => {
        if (!rows[0]) throw new Error('No se pudo crear la materia.')
        return rows[0]
      })
  }

  setGrades(userId: string, id: string, grades: GradeColumns) {
    return this.db
      .update(subjects)
      .set({ ...grades, updatedAt: new Date() })
      .where(and(eq(subjects.id, id), eq(subjects.userId, userId), isNull(subjects.deletedAt)))
      .returning()
      .then((rows) => rows[0])
  }

  async softDeleteSubject(userId: string, id: string) {
    await this.db
      .update(subjects)
      .set({ deletedAt: new Date() })
      .where(and(eq(subjects.id, id), eq(subjects.userId, userId), isNull(subjects.deletedAt)))
  }
}
