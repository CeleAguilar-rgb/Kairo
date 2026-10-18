import { Inject, Injectable } from '@nestjs/common'
import type { CreateTaskInput, TaskStatus } from '@kairo/shared'
import { and, asc, count, eq, isNotNull, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { tasks } from '../../db/schema/tasks'

@Injectable()
export class TasksRepository {
  // @Inject() explícito: mismo motivo que en account.repository.ts
  // (docs/history/current.md, Bloqueos).
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  // Tareas y subtareas activas del usuario, sin separar todavía: el service
  // las agrupa (parentTaskId null = tarea, no null = subtarea de esa tarea).
  findActive(userId: string) {
    return this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
      .orderBy(asc(tasks.position), asc(tasks.createdAt))
  }

  // Solo cuenta tareas (no subtareas): position ordena la lista de Tareas,
  // y las subtareas no aparecen ahí como filas propias.
  async countTopLevel(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
          isNull(tasks.parentTaskId),
        ),
      )
    return row?.value ?? 0
  }

  // Inserta la tarea y, en la misma transacción, una fila por cada título de
  // subtasks apuntándole con parentTaskId. Una transacción: si fallara a la
  // mitad, no debe quedar una tarea sin sus subtareas.
  async createWithSubtasks(
    userId: string,
    input: CreateTaskInput,
    position: number,
  ) {
    return this.db.transaction(async (tx) => {
      const doneAt = input.status === 'done' ? new Date() : null

      const [task] = await tx
        .insert(tasks)
        .values({
          userId,
          title: input.title,
          notes: input.notes,
          status: input.status,
          priority: input.priority,
          dueOn: input.dueOn,
          projectId: input.projectId,
          position,
          doneAt,
        })
        .returning()
      // Se acaba de insertar una sola fila con RETURNING: siempre vuelve
      // exactamente una. Si no, algo más grave falló antes (la query hubiera
      // lanzado ya), así que esto es una guarda de tipos, no un caso de negocio.
      if (!task) throw new Error('No se pudo crear la tarea.')

      const subtasks = input.subtasks.length
        ? await tx
            .insert(tasks)
            .values(
              input.subtasks.map((title, index) => ({
                userId,
                title,
                status: input.status === 'done' ? ('done' as const) : ('todo' as const),
                priority: input.priority,
                parentTaskId: task.id,
                position: index,
                doneAt,
              })),
            )
            .returning()
        : []

      return { task, subtasks }
    })
  }

  // where: { id, userId } también al editar (security.md #4): sin esa fila,
  // devuelve undefined y el service responde 404, nunca toca la de otro.
  // Sirve tanto para una tarea como para una subtarea: las dos son filas de
  // tasks. Si es una tarea con subtareas y queda 'done', sus subtareas
  // también quedan hechas (igual que lo hacía el front en memoria).
  async setStatus(userId: string, taskId: string, status: TaskStatus) {
    return this.db.transaction(async (tx) => {
      const doneAt = status === 'done' ? new Date() : null
      const [task] = await tx
        .update(tasks)
        .set({ status, doneAt })
        .where(
          and(
            eq(tasks.id, taskId),
            eq(tasks.userId, userId),
            isNull(tasks.deletedAt),
          ),
        )
        .returning()

      if (!task) return undefined

      if (status === 'done') {
        await tx
          .update(tasks)
          .set({ status: 'done', doneAt })
          .where(and(eq(tasks.parentTaskId, taskId), isNull(tasks.deletedAt)))
      }

      const subtasks = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.parentTaskId, taskId), isNull(tasks.deletedAt)))
        .orderBy(asc(tasks.position))

      return { task, subtasks }
    })
  }

  // Papelera (security.md #11, docs/guides/design.md "Borrar"): nunca se
  // borra la fila, solo se marca deletedAt. Sus subtareas se van con ella en
  // la misma transacción — es "lo que arrastra" que nombra el diálogo.
  async softDelete(userId: string, taskId: string) {
    return this.db.transaction(async (tx) => {
      const deletedAt = new Date()
      const [task] = await tx
        .update(tasks)
        .set({ deletedAt })
        .where(
          and(
            eq(tasks.id, taskId),
            eq(tasks.userId, userId),
            isNull(tasks.deletedAt),
          ),
        )
        .returning()

      if (!task) return undefined

      await tx
        .update(tasks)
        .set({ deletedAt })
        .where(and(eq(tasks.parentTaskId, taskId), isNull(tasks.deletedAt)))

      return task
    })
  }

  // "Deshacer" del aviso: limpia deletedAt de la tarea y de las subtareas
  // que se fueron con ella en esa misma borrada.
  async restore(userId: string, taskId: string) {
    return this.db.transaction(async (tx) => {
      const [task] = await tx
        .update(tasks)
        .set({ deletedAt: null })
        .where(
          and(
            eq(tasks.id, taskId),
            eq(tasks.userId, userId),
            isNotNull(tasks.deletedAt),
          ),
        )
        .returning()

      if (!task) return undefined

      await tx
        .update(tasks)
        .set({ deletedAt: null })
        .where(and(eq(tasks.parentTaskId, taskId), isNotNull(tasks.deletedAt)))

      const subtasks = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.parentTaskId, taskId), isNull(tasks.deletedAt)))
        .orderBy(asc(tasks.position))

      return { task, subtasks }
    })
  }
}
