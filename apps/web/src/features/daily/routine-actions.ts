'use server'

import { idSchema, routineBlockSchema, routineSchema, toggleRoutineBlockSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { fieldErrors } from '@/lib/form-errors'
import { minutesToWallTime } from '@/lib/dates'
import { mockDelay } from '@/lib/mock/context'

import { failure, type DailyActionResult } from './action-result'
import { FOCUS_TASKS } from './mock'
import { loadWorld, rememberUndo, runUndo } from './mock-store'
import { isCheckable, isLateMark, routineAppliesOn } from './routine-utils'
import type { RoutineBlock } from './types'

// Las acciones de la rutina (Hoy y el editor de rutinas). Una Server Action es un endpoint público: lo que
// llega NO se confía, se vuelve a validar con el mismo esquema del front (packages/shared). Con la API,
// en vez de tocar el almacén de ejemplo llaman a `api.post('/routine/…')` y compañía; el userId lo pone la
// API con el token (regla 2) y toda consulta filtra por él (regla 3). Los ids no se validan como uuid aquí
// porque en los datos de ejemplo no lo son; en la API serán `z.uuid()` y `where: { id, userId }`.

// Hoy, Menú, Reporte, Metas, el editor de rutina e Inicio leen de los mismos datos.
function refresh() {
  revalidatePath('/dia-a-dia', 'layout')
  revalidatePath('/')
}

const logKey = (date: string, blockId: string) => `${date}|${blockId}`

// Marca o desmarca un bloque de hoy. La hora de la marca y si fue "tarde" las decide el servidor con su
// reloj: la pantalla solo dice "hecho / no hecho", así nadie se marca "a tiempo" a mano.
export async function toggleRoutineBlockAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = toggleRoutineBlockSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world, ctx, nowMinutes } = await loadWorld()
  const block = world.blocks.find((item) => item.id === parsed.data.blockId)
  if (!block || !isCheckable(block)) return failure('No encontramos ese bloque.')
  const routine = world.routines.find((item) => item.id === block.routineId)
  if (!routine || !routineAppliesOn(routine, ctx.today)) return failure('Ese bloque no es de hoy.')

  const key = logKey(ctx.today, block.id)
  if (parsed.data.done) {
    world.logs.set(key, { doneAt: minutesToWallTime(nowMinutes), late: isLateMark(block, nowMinutes) })
  } else {
    world.logs.delete(key)
  }
  refresh()
  return { ok: true, id: block.id }
}

// Hacer una tarea del bloque de enfoque en curso: avanza a la siguiente y el bloque queda marcado.
export async function completeFocusTaskAction(blockId: string): Promise<DailyActionResult> {
  if (!idSchema.safeParse(blockId).success) return failure('No encontramos ese bloque.')

  await mockDelay()
  const { world, ctx, nowMinutes } = await loadWorld()
  const block = world.blocks.find((item) => item.id === blockId)
  if (!block || block.kind !== 'focus') return failure('No encontramos ese bloque.')
  const tasks = block.link ? (FOCUS_TASKS[block.link] ?? []) : []
  const key = logKey(ctx.today, block.id)
  const done = world.focusDone.get(key) ?? 0
  if (done >= tasks.length) return failure('No hay más tareas pendientes ahí.')

  world.focusDone.set(key, done + 1)
  if (!world.logs.has(key)) world.logs.set(key, { doneAt: minutesToWallTime(nowMinutes), late: isLateMark(block, nowMinutes) })
  refresh()
  return { ok: true, id: block.id }
}

// "Deshacer" de borrar un bloque o una rutina.
export async function undoRoutineAction(token: string): Promise<DailyActionResult> {
  await mockDelay()
  const { world } = await loadWorld()
  if (!runUndo(world, token)) return failure('Ya no se puede deshacer.')
  refresh()
  return { ok: true }
}

// --- Editor de rutinas ----------------------------------------------------------------------------

// Crea o edita un bloque. `blockId` null = bloque nuevo.
export async function saveBlockAction(routineId: string, blockId: string | null, raw: unknown): Promise<DailyActionResult> {
  if (!idSchema.safeParse(routineId).success || (blockId !== null && !idSchema.safeParse(blockId).success)) {
    return failure('No encontramos esa rutina.')
  }
  const parsed = routineBlockSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world } = await loadWorld()
  if (!world.routines.some((routine) => routine.id === routineId)) return failure('No encontramos esa rutina.')

  const input = parsed.data
  // El enfoque necesita saber de dónde saca sus tareas; lo libre nunca cuenta para el reporte.
  if (input.kind === 'focus' && !input.link) return { ok: false, errors: { link: 'Elige de dónde sale la tarea.' } }
  const fields = {
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    kind: input.kind,
    icon: input.icon,
    alert: input.alert,
    nagMinutes: input.nagMinutes,
    countsForReport: input.kind === 'free' ? false : input.countsForReport,
    link: input.kind === 'focus' ? input.link : null,
  }

  if (blockId === null) {
    const position = world.blocks.filter((block) => block.routineId === routineId).length
    const block: RoutineBlock = { id: crypto.randomUUID(), routineId, position, note: null, ...fields }
    world.blocks.push(block)
    refresh()
    return { ok: true, id: block.id }
  }

  const index = world.blocks.findIndex((block) => block.id === blockId && block.routineId === routineId)
  if (index < 0) return failure('No encontramos ese bloque.')
  world.blocks[index] = { ...world.blocks[index], ...fields }
  refresh()
  return { ok: true, id: blockId }
}

export async function deleteBlockAction(blockId: string): Promise<DailyActionResult> {
  if (!idSchema.safeParse(blockId).success) return failure('No encontramos ese bloque.')

  await mockDelay()
  const { world } = await loadWorld()
  const index = world.blocks.findIndex((block) => block.id === blockId)
  if (index < 0) return failure('No encontramos ese bloque.')

  const [removed] = world.blocks.splice(index, 1)
  const undoToken = rememberUndo(world, () => world.blocks.splice(index, 0, removed))
  refresh()
  return { ok: true, id: blockId, undoToken }
}

// Una rutina nueva, sin días ni bloques: se llena desde el editor.
export async function createRoutineAction(): Promise<DailyActionResult> {
  await mockDelay()
  const { world } = await loadWorld()
  const names = new Set(world.routines.map((routine) => routine.name))
  let name = 'Rutina nueva'
  for (let n = 2; names.has(name); n += 1) name = `Rutina nueva ${n}`

  const routine = { id: crypto.randomUUID(), name, days: Array<boolean>(7).fill(false), active: true }
  world.routines.push(routine)
  refresh()
  return { ok: true, id: routine.id }
}

// Cambia el nombre, los días o si está activa.
export async function updateRoutineAction(routineId: string, raw: unknown): Promise<DailyActionResult> {
  if (!idSchema.safeParse(routineId).success) return failure('No encontramos esa rutina.')
  const parsed = routineSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world } = await loadWorld()
  const index = world.routines.findIndex((routine) => routine.id === routineId)
  if (index < 0) return failure('No encontramos esa rutina.')

  world.routines[index] = { ...world.routines[index], ...parsed.data }
  refresh()
  return { ok: true, id: routineId }
}

// Borra una rutina con sus bloques. El historial del reporte se conserva (los registros no se tocan).
export async function deleteRoutineAction(routineId: string): Promise<DailyActionResult> {
  if (!idSchema.safeParse(routineId).success) return failure('No encontramos esa rutina.')

  await mockDelay()
  const { world } = await loadWorld()
  const index = world.routines.findIndex((routine) => routine.id === routineId)
  if (index < 0) return failure('No encontramos esa rutina.')

  const [removed] = world.routines.splice(index, 1)
  const removedBlocks = world.blocks.filter((block) => block.routineId === routineId)
  world.blocks = world.blocks.filter((block) => block.routineId !== routineId)
  const undoToken = rememberUndo(world, () => {
    world.routines.splice(index, 0, removed)
    world.blocks.push(...removedBlocks)
  })
  refresh()
  return { ok: true, id: routineId, undoToken }
}

// "Copiar de Entre semana": los bloques de una rutina pasan a otra.
export async function copyBlocksAction(fromId: string, toId: string): Promise<DailyActionResult> {
  if (!idSchema.safeParse(fromId).success || !idSchema.safeParse(toId).success) return failure('No encontramos esa rutina.')

  await mockDelay()
  const { world } = await loadWorld()
  if (!world.routines.some((routine) => routine.id === fromId) || !world.routines.some((routine) => routine.id === toId)) {
    return failure('No encontramos esa rutina.')
  }
  const source = world.blocks.filter((block) => block.routineId === fromId)
  world.blocks.push(...source.map((block, position) => ({ ...block, id: crypto.randomUUID(), routineId: toId, position })))
  refresh()
  return { ok: true, id: toId }
}
