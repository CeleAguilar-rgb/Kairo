import { addDays, formatDuration, formatWallTime, wallTimeToMinutes, weekdayOf, type IsoDate } from '@/lib/dates'

import type { CellStatus, ReportRow, Routine, RoutineBlock, RoutineBlockToday, RoutineKind } from './types'

// Lógica pura de la rutina (sin React ni servidor): qué bloque va "ahora", cuándo un bloque se marca
// "tarde", el avance del día, rachas y el resumen del reporte. Está aparte para poder probarla con
// aserciones sueltas y para que Hoy, Inicio, Reporte y Rachas usen exactamente las mismas reglas.

// Un bloque sin insistir y sin hora de fin se considera "a tiempo" durante media hora. El canvas no define
// este caso (solo dice que "tarde" es "después del aviso"), así que es una decisión nuestra.
export const DEFAULT_GRACE_MINUTES = 30

export function startMinutes(block: Pick<RoutineBlock, 'startsAt'>): number {
  return wallTimeToMinutes(block.startsAt)
}

// Un hábito es un momento, no un rango: sin hora de fin, termina cuando empieza.
export function endMinutes(block: Pick<RoutineBlock, 'startsAt' | 'endsAt'>): number {
  return wallTimeToMinutes(block.endsAt ?? block.startsAt)
}

// 0 = lunes … 6 = domingo (el orden de `routines.days`, sin importar con qué día empiece la semana).
export function mondayIndex(date: IsoDate): number {
  return (weekdayOf(date) + 6) % 7
}

export function routineAppliesOn(routine: Pick<Routine, 'days' | 'active'>, date: IsoDate): boolean {
  return routine.active && routine.days[mondayIndex(date)] === true
}

// Lo libre (Trabajo) solo ocupa su espacio: no se marca.
export function isCheckable(block: Pick<RoutineBlock, 'kind'>): boolean {
  return block.kind !== 'free'
}

export function countsForReport(block: Pick<RoutineBlock, 'kind' | 'countsForReport'>): boolean {
  return isCheckable(block) && block.countsForReport
}

// Desde qué minuto del día marcar un bloque cuenta como "tarde": cuando ya se insistió (hora del bloque +
// los minutos de "insistir"); sin insistir, al terminar el bloque o, si es un momento, tras la media hora.
export function lateFromMinutes(block: Pick<RoutineBlock, 'startsAt' | 'endsAt' | 'nagMinutes'>): number {
  if (block.nagMinutes > 0) return startMinutes(block) + block.nagMinutes
  return block.endsAt ? endMinutes(block) : startMinutes(block) + DEFAULT_GRACE_MINUTES
}

export function isLateMark(block: Pick<RoutineBlock, 'startsAt' | 'endsAt' | 'nagMinutes'>, nowMinutes: number): boolean {
  return nowMinutes >= lateFromMinutes(block)
}

// Sin marcar y ya pasó el momento en que se insiste.
export function isOverdue(block: RoutineBlockToday, nowMinutes: number): boolean {
  return isCheckable(block) && block.log === null && isLateMark(block, nowMinutes)
}

// done = a tiempo · late = hecho después del aviso · overdue = sin marcar y ya se insistió ·
// current = el rango en curso · upcoming = todavía no llega · idle = sin marcar y sin atraso ·
// free = lo libre, que no se marca.
export type BlockState = 'done' | 'late' | 'overdue' | 'current' | 'upcoming' | 'idle' | 'free'

export function blockState(block: RoutineBlockToday, nowMinutes: number): BlockState {
  if (!isCheckable(block)) return 'free'
  if (block.log) return block.log.late ? 'late' : 'done'
  if (isOverdue(block, nowMinutes)) return 'overdue'
  if (block.endsAt && startMinutes(block) <= nowMinutes && nowMinutes < endMinutes(block)) return 'current'
  if (startMinutes(block) > nowMinutes) return 'upcoming'
  return 'idle'
}

// El bloque con rango que está en curso (el que Hoy dibuja como tarjeta oscura si es de enfoque).
export function currentBlock(blocks: RoutineBlockToday[], nowMinutes: number): RoutineBlockToday | null {
  return blocks.find((block) => block.endsAt && startMinutes(block) <= nowMinutes && nowMinutes < endMinutes(block)) ?? null
}

// Dónde va la raya de "ahora": ANTES del bloque con ese índice (blocks.length = después de todos).
// Si hay un bloque en curso, la raya va justo antes de él; si no, antes del primero que todavía no empieza.
// null cuando aún no ha pasado nada (la raya iría arriba de todo y no dice nada).
export function nowMarkerIndex(blocks: RoutineBlockToday[], nowMinutes: number): number | null {
  const current = blocks.findIndex((block) => block.endsAt && startMinutes(block) <= nowMinutes && nowMinutes < endMinutes(block))
  const index = current >= 0 ? current : blocks.findIndex((block) => startMinutes(block) > nowMinutes)
  const result = index === -1 ? blocks.length : index
  return result === 0 ? null : result
}

// "Vas 4 de 6": solo los bloques que cuentan para el reporte.
export function dayProgress(blocks: RoutineBlockToday[]) {
  const counted = blocks.filter(countsForReport)
  const done = counted.filter((block) => block.log !== null).length
  const late = counted.filter((block) => block.log?.late).length
  const total = counted.length
  return { done, late, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) }
}

export function lateSummaryText(late: number): string {
  if (late === 0) return 'Bloques que cuentan para el reporte.'
  return `Bloques que cuentan para el reporte. ${late === 1 ? 'Uno marcado tarde' : `${late} marcados tarde`}.`
}

export function doneText(block: RoutineBlockToday, hourFormat: '12h' | '24h'): string {
  if (!block.log) return ''
  const time = formatWallTime(block.log.doneAt, hourFormat)
  return block.log.late ? `Hecho ${time} · tarde` : `Hecho ${time}`
}

export function overdueText(block: RoutineBlockToday, nowMinutes: number): string {
  const since = formatDuration(Math.max(1, nowMinutes - startMinutes(block)))
  return block.alert || block.nagMinutes > 0 ? `Hace ${since} · ya te lo recordé` : `Hace ${since}`
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

// Lo que dice el aviso cuando se insiste ("Te llegará: …" en el editor de bloques).
export function nagMessage(kind: RoutineKind, title: string): string {
  const text = title.trim()
  if (/vitamina/i.test(text)) return 'No has tomado tus vitaminas'
  if (/agua/i.test(text)) return 'No has tomado agua'
  if (kind === 'meal') return 'No has comido'
  if (kind === 'focus') return `No has empezado: ${text}`
  return `No has hecho: ${lowerFirst(text)}`
}

// La línea gris de cada bloque en el editor de rutina: qué hace y cuándo avisa.
export function blockSummary(block: Pick<RoutineBlock, 'kind' | 'alert' | 'nagMinutes' | 'countsForReport'>, focusLabel: string | null): string {
  if (block.kind === 'free') return 'No cuenta para el reporte'
  const parts: string[] = []
  if (block.kind === 'meal') parts.push('Muestra el menú del día')
  if (block.kind === 'focus') parts.push(focusLabel ? `Siguiente tarea de ${focusLabel}` : 'Siguiente tarea pendiente')
  if (block.nagMinutes > 0) parts.push(`Insiste a los ${block.nagMinutes} min`)
  else if (block.kind === 'habit') parts.push(block.alert ? 'Aviso a la hora' : 'Sin aviso')
  if (!block.countsForReport) parts.push('No cuenta para el reporte')
  return parts.map((part, index) => (index === 0 ? part : lowerFirst(part))).join(' · ')
}

// --- Reporte --------------------------------------------------------------------------------------

export function weekDates(weekStart: IsoDate): IsoDate[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
}

export type ReportStats = {
  // null si todavía no hay nada que medir (la semana no ha empezado).
  pct: number | null
  ok: number
  total: number
  late: number
  // La racha más larga de una fila en la semana (bloques seguidos hechos, a tiempo o tarde).
  longestRun: { days: number; title: string; startsAt: string } | null
  // El bloque que más veces se saltó.
  mostSkipped: { count: number; title: string; startsAt: string } | null
}

// Las cuentas del reporte de una semana: "Cumplimiento" cuenta lo hecho (a tiempo o tarde) entre lo hecho
// y lo saltado; lo que falta hoy y lo que aún no llega no cuenta ni a favor ni en contra.
export function reportStats(rows: ReportRow[]): ReportStats {
  let ok = 0
  let total = 0
  let late = 0
  let longestRun: ReportStats['longestRun'] = null
  let mostSkipped: ReportStats['mostSkipped'] = null

  for (const row of rows) {
    let run = 0
    let skipped = 0
    for (const cell of row.cells) {
      if (cell.status === 'done' || cell.status === 'late') {
        ok += 1
        total += 1
        run += 1
        if (cell.status === 'late') late += 1
        if (run > (longestRun?.days ?? 0)) longestRun = { days: run, title: row.title, startsAt: row.startsAt }
      } else if (cell.status === 'skipped') {
        total += 1
        skipped += 1
        run = 0
      }
    }
    if (skipped > (mostSkipped?.count ?? 0)) mostSkipped = { count: skipped, title: row.title, startsAt: row.startsAt }
  }

  return { pct: total === 0 ? null : Math.round((ok / total) * 100), ok, total, late, longestRun, mostSkipped }
}

// --- Rachas ---------------------------------------------------------------------------------------

// Los días de un bloque de hoy hacia atrás (hoy primero). Una racha son los días seguidos hechos (a tiempo
// o tarde): los días de otra rutina no la rompen y hoy, si todavía falta, tampoco; un día saltado sí.
export function streakLength(newestFirst: CellStatus[]): number {
  let days = 0
  for (const [index, status] of newestFirst.entries()) {
    if (status === 'off' || status === 'future') continue
    if (status === 'pending' && index === 0) continue
    if (status !== 'done' && status !== 'late') break
    days += 1
  }
  return days
}

// Los últimos 7 días en que el bloque aplicaba, del más viejo al de hoy: encendido si se hizo.
export function streakDots(newestFirst: CellStatus[]): boolean[] {
  return newestFirst
    .filter((status) => status !== 'off' && status !== 'future')
    .slice(0, 7)
    .map((status) => status === 'done' || status === 'late')
    .reverse()
}

// --- Textos ---------------------------------------------------------------------------------------

const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

// "Sábado y domingo", "Lunes, martes y miércoles": los días marcados de una rutina (de lunes a domingo).
export function joinDays(days: boolean[]): string {
  const names = DAY_NAMES.filter((_, index) => days[index])
  if (names.length === 0) return 'Ningún día'
  const text = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const DAY_SHORT = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

// "lun – vie", "sáb – dom", "lun, mié, vie", "sin días": los días de una rutina en la pestaña. Dos o más
// días seguidos se escriben como rango.
export function daysRangeText(days: boolean[]): string {
  const picked = days.flatMap((on, index) => (on ? [index] : []))
  if (picked.length === 0) return 'sin días'
  if (picked.length === 1) return DAY_SHORT[picked[0]]
  const consecutive = picked.every((day, index) => index === 0 || day === picked[index - 1] + 1)
  return consecutive ? `${DAY_SHORT[picked[0]]} – ${DAY_SHORT[picked[picked.length - 1]]}` : picked.map((day) => DAY_SHORT[day]).join(', ')
}
