import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { TRASH_DAYS, type TrashKind, type TrashRef } from '@kairo/shared'
import { TrashRegistry } from '../../common/trash/trash.registry.js'
import type { TrashEntry, TrashSource } from '../../common/trash/trash.types.js'

const DAY_MS = 24 * 60 * 60 * 1000

// Una cosa de la papelera con lo que arrastró contado por tipo ("Bot de marketing y sus 4 tareas").
type TrashItem = Omit<TrashEntry, 'parent' | 'deletedAt'> & {
  deletedAt: string
  contents: { kind: TrashKind; count: number }[]
}

@Injectable()
export class TrashService {
  // La Papelera no conoce ningún módulo: le pregunta al registro (ver common/trash/trash.registry.ts).
  constructor(@Inject(TrashRegistry) private readonly registry: TrashRegistry) {}

  // Todo lo borrado de la persona, lo más reciente primero. Lo que se fue JUNTO con otra cosa (misma hora de
  // borrado) no sale suelto: se cuenta dentro de su dueño, porque vuelve y se borra con él.
  async list(userId: string): Promise<TrashItem[]> {
    const entries = await this.allEntries(userId)
    return group(entries)
      .sort((a, b) => b.root.deletedAt.getTime() - a.root.deletedAt.getTime())
      .map(({ root, children }) => ({
        kind: root.kind,
        id: root.id,
        group: root.group,
        name: root.name,
        detail: root.detail,
        amountCents: root.amountCents,
        deletedAt: root.deletedAt.toISOString(),
        contents: countByKind(children),
      }))
  }

  // Mandar a la papelera desde aquí, con todo lo que arrastra de otros módulos (hoy: borrar un proyecto se lleva sus
  // tareas, eventos, sprints, archivos y, si es de Escuela, su materia). Una sola hora para todo: así vuelve junto.
  // Cruza módulos, así que no es una sola transacción; por eso es reanudable: si ya estaba en la papelera (un borrado
  // que se cortó a la mitad), se toma la hora con la que se fue y se termina de llevar lo que falte.
  async trash(userId: string, ref: TrashRef): Promise<void> {
    const source = this.sourceOf(ref.kind)
    if (!source.trash) {
      throw new BadRequestException({ code: 'TRASH_NOT_SUPPORTED', message: 'Eso se borra desde su propia pantalla.' })
    }
    let at = new Date()
    if (!(await source.trash(userId, ref.kind, ref.id, at))) {
      const already = (await source.list(userId)).find((item) => item.kind === ref.kind && item.id === ref.id)
      if (!already) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No encontramos eso.' })
      at = already.deletedAt
    }
    for (const other of this.registry.all()) await other.trashChildren?.(userId, ref, at)
  }

  // "Restaurar" y el "Deshacer" de borrar un proyecto: vuelve la cosa y lo que se fue con ella a la misma hora.
  async restore(userId: string, ref: TrashRef): Promise<void> {
    const at = await this.sourceOf(ref.kind).restore(userId, ref.kind, ref.id)
    if (!at) throw notFound()
    for (const other of this.registry.all()) await other.restoreChildren?.(userId, ref, at)
  }

  // "Borrar para siempre". Primero lo que arrastró (antes de que las llaves foráneas lo suelten de su dueño) y al
  // final la cosa. No es una sola transacción porque cruza módulos: si se corta a la mitad, lo que quedó sigue en la
  // papelera y volver a pedirlo termina el trabajo.
  async purge(userId: string, ref: TrashRef): Promise<void> {
    const source = this.sourceOf(ref.kind)
    const entry = (await source.list(userId)).find((item) => item.kind === ref.kind && item.id === ref.id)
    if (!entry) throw notFound()
    for (const other of this.childSourcesFirst()) await other.purgeChildren?.(userId, ref)
    await source.purge(userId, ref.kind, ref.id)
  }

  // "Vaciar papelera": cada cosa suelta con lo suyo.
  async empty(userId: string): Promise<void> {
    const roots = group(await this.allEntries(userId)).map(({ root }) => root)
    for (const root of roots) {
      for (const other of this.childSourcesFirst()) await other.purgeChildren?.(userId, root)
      await this.sourceOf(root.kind).purge(userId, root.kind, root.id)
    }
  }

  // Tarea programada (una vez al día): lo que lleva más de 30 días, de todas las personas.
  async purgeExpired(now = new Date()): Promise<number> {
    const before = new Date(now.getTime() - TRASH_DAYS * DAY_MS)
    let total = 0
    for (const source of this.childSourcesFirst()) total += await source.purgeExpired(before)
    return total
  }

  private async allEntries(userId: string) {
    const lists = await Promise.all(this.registry.all().map((source) => source.list(userId)))
    return lists.flat()
  }

  // Los que cuelgan de otros (tienen `trashChildren`) van primero: borrar un proyecto antes que sus archivos dejaría
  // los archivos de Storage huérfanos (la llave foránea borra la fila, pero no el archivo).
  private childSourcesFirst() {
    const all = this.registry.all()
    return [...all.filter((source) => source.trashChildren), ...all.filter((source) => !source.trashChildren)]
  }

  private sourceOf(kind: TrashKind): TrashSource {
    const source = this.registry.sourceFor(kind)
    if (!source) throw notFound()
    return source
  }
}

function notFound() {
  return new NotFoundException({ code: 'TRASH_ITEM_NOT_FOUND', message: 'No encontramos eso en la papelera.' })
}

const keyOf = (ref: { kind: string; id: string }) => `${ref.kind}:${ref.id}`

// Agrupa cada cosa con su dueño si se borraron a la misma hora; si no (una tarea que se borró antes que su
// proyecto), sale suelta. Sube por la cadena (materia → proyecto) hasta la raíz.
function group(entries: TrashEntry[]) {
  const byKey = new Map(entries.map((entry) => [keyOf(entry), entry]))
  const ownerOf = (entry: TrashEntry) => {
    const owner = entry.parent ? byKey.get(keyOf(entry.parent)) : undefined
    return owner && owner.deletedAt.getTime() === entry.deletedAt.getTime() ? owner : undefined
  }
  const groups = new Map<string, { root: TrashEntry; children: TrashEntry[] }>()
  for (const entry of entries) {
    let root = entry
    for (let owner = ownerOf(root); owner; owner = ownerOf(root)) root = owner
    const current = groups.get(keyOf(root)) ?? { root, children: [] }
    if (root !== entry) current.children.push(entry)
    groups.set(keyOf(root), current)
  }
  return [...groups.values()]
}

function countByKind(children: TrashEntry[]) {
  const counts = new Map<TrashKind, number>()
  for (const child of children) counts.set(child.kind, (counts.get(child.kind) ?? 0) + 1)
  return [...counts].map(([kind, count]) => ({ kind, count }))
}
