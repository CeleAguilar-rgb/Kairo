'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { useState } from 'react'

import { ButtonLink } from '@/components/ui/ButtonLink'
import { Card, LineIcon } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { CountUp, ProgressBar } from '@/components/ui/Progress'
import { dayOfMonth, formatWallTime, WEEKDAYS_SHORT, weekdayOf, type IsoDate } from '@/lib/dates'
import { EASE_OUT, fadeUp, staggerList } from '@/lib/motion'

import { reportStats } from '../routine-utils'
import type { CellStatus, ReportRow, ReportWeek } from '../types'

import styles from './ReportView.module.css'

type ReportViewProps = {
  report: ReportWeek
  today: IsoDate
  hourFormat: '12h' | '24h'
}

const STATUS_LABEL: Record<CellStatus, string> = {
  done: 'Hecho',
  late: 'Tarde',
  skipped: 'Saltado',
  pending: 'Falta',
  future: 'Todavía no llega',
  off: 'No aplica',
}

// Lo que dice la franja de abajo al elegir una celda.
const STATUS_DETAIL: Record<CellStatus, string> = {
  done: 'Hecho a tiempo',
  late: 'Hecho tarde, después del aviso',
  skipped: 'Saltado',
  pending: 'Todavía falta hoy',
  future: 'Ese día aún no llega',
  off: 'Ese día usa otra rutina',
}

const LEGEND: CellStatus[] = ['done', 'late', 'skipped', 'pending']

type Selection = { blockId: string; date: IsoDate }

// Se abre en la primera celda "tarde" (es la que más tiene que contar), o en la primera hecha.
function defaultSelection(rows: ReportRow[]): Selection | null {
  for (const wanted of ['late', 'skipped', 'done'] as const) {
    for (const row of rows) {
      const cell = row.cells.find((item) => item.status === wanted)
      if (cell) return { blockId: row.blockId, date: cell.date }
    }
  }
  return null
}

// Reporte (Reporte.dc.html): tres números de la semana y la matriz bloque por bloque con cada día. Se lee
// del historial de la rutina; la semana viene en la dirección (`?semana=`), así que esto solo la pinta.
export function ReportView({ report, today, hourFormat }: ReportViewProps) {
  const [selected, setSelected] = useState<Selection | null>(() => defaultSelection(report.rows))
  const stats = reportStats(report.rows)

  if (report.rows.length === 0) {
    return (
      <EmptyState
        id="report-empty"
        title="El reporte sale de tu rutina"
        description="Cuando tengas bloques que cuenten para el reporte, aquí ves cuáles cumples cada día y cuáles se te saltan."
        doodle="sun"
        actions={<ButtonLink href="/dia-a-dia/rutina">Editar rutina</ButtonLink>}
      />
    )
  }

  const dates = report.rows[0].cells.map((cell) => cell.date)
  const selectedRow = selected ? report.rows.find((row) => row.blockId === selected.blockId) : undefined
  const selectedCell = selectedRow?.cells.find((cell) => cell.date === selected?.date)

  const notes = [
    ...report.emptyRoutines.map((routine) => `${routine.daysText} ${routine.daysText.includes(' y ') ? 'usan' : 'usa'} la rutina ${routine.name}, que aún no tiene bloques.`),
    ...(report.uncountedTitles.length > 0 ? [`${report.uncountedTitles.join(', ')} no cuenta${report.uncountedTitles.length > 1 ? 'n' : ''}.`] : []),
  ]

  return (
    <>
      <motion.div className={styles.stats} variants={staggerList(0.08, 0.1)} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <Card as="section" className={styles.stat} aria-labelledby="stat-pct">
            <span id="stat-pct" className={styles.statLabel}>
              Cumplimiento
            </span>
            <span className={styles.big}>{stats.pct === null ? '—' : <CountUp value={stats.pct} format={(n) => `${Math.round(n)}%`} />}</span>
            <ProgressBar value={(stats.pct ?? 0) / 100} label="Cumplimiento de la semana" />
            <span className={styles.statLabel}>
              {stats.total === 0 ? 'Todavía no hay días que medir.' : `${stats.ok} de ${stats.total} bloques hasta hoy · ${stats.late} tarde`}
            </span>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card as="section" className={styles.stat} aria-labelledby="stat-run">
            <span id="stat-run" className={styles.statLabel}>
              Racha más larga esta semana
            </span>
            <span className={styles.big}>{stats.longestRun ? `${stats.longestRun.days} ${stats.longestRun.days === 1 ? 'día' : 'días'}` : '—'}</span>
            <span className={styles.statName}>
              {stats.longestRun ? `${stats.longestRun.title} ${formatWallTime(stats.longestRun.startsAt, hourFormat)}` : 'Aún no hay bloques hechos.'}
            </span>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card as="section" className={styles.stat} aria-labelledby="stat-skip">
            <span id="stat-skip" className={styles.statLabel}>
              Lo que más se te salta
            </span>
            {stats.mostSkipped ? (
              <>
                <span className={styles.skipName}>
                  {stats.mostSkipped.title} {formatWallTime(stats.mostSkipped.startsAt, hourFormat)}
                </span>
                <span className={styles.statLabel}>
                  Saltado {stats.mostSkipped.count} {stats.mostSkipped.count === 1 ? 'vez' : 'veces'} esta semana. Quizá queda mejor a otra hora.
                </span>
                <Link href="/dia-a-dia/rutina" className={styles.moveLink}>
                  Mover de hora
                </Link>
              </>
            ) : (
              <>
                <span className={styles.skipName}>Nada se te salta</span>
                <span className={styles.statLabel}>Ningún bloque quedó sin marcar esta semana.</span>
              </>
            )}
          </Card>
        </motion.div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.3 }}>
        <Card as="section" className={styles.board} aria-labelledby="report-matrix">
          <div className={styles.boardHead}>
            <h2 id="report-matrix" className={styles.boardTitle}>
              Bloque por bloque
            </h2>
            <ul className={styles.legend}>
              {LEGEND.map((status) => (
                <li key={status} className={styles.legendItem}>
                  <span className={[styles.swatch, styles[`cell_${status}`]].join(' ')} />
                  {STATUS_LABEL[status]}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.scroller}>
            <div className={styles.matrix}>
              <span />
              {dates.map((date) => (
                <span key={date} className={[styles.dayHead, date === today ? styles.dayToday : null].filter(Boolean).join(' ')}>
                  {WEEKDAYS_SHORT[weekdayOf(date)]} {dayOfMonth(date)}
                </span>
              ))}
              <span className={styles.scoreHead}>Semana</span>

              {report.rows.map((row) => {
                const hit = row.cells.filter((cell) => cell.status === 'done' || cell.status === 'late').length
                const apply = hit + row.cells.filter((cell) => cell.status === 'skipped').length
                return (
                  <ReportRowCells
                    key={row.blockId}
                    row={row}
                    score={apply > 0 ? `${hit}/${apply}` : '—'}
                    selected={selected}
                    hourFormat={hourFormat}
                    onPick={setSelected}
                  />
                )
              })}
            </div>
          </div>

          {selectedRow && selectedCell ? (
            <div className={styles.detail} role="status">
              <LineIcon d={['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 11v5M12 8h.01']} size={16} />
              <span>
                {selectedRow.title} {formatWallTime(selectedRow.startsAt, hourFormat)} · {WEEKDAYS_SHORT[weekdayOf(selectedCell.date)]} {dayOfMonth(selectedCell.date)} · {STATUS_DETAIL[selectedCell.status]}
                {selectedCell.status === 'late' && selectedCell.doneAt ? ` · marcado ${formatWallTime(selectedCell.doneAt, hourFormat)}` : ''}
              </span>
            </div>
          ) : null}

          {notes.length > 0 ? <p className={styles.notes}>{notes.join(' ')}</p> : null}
        </Card>
      </motion.div>
    </>
  )
}

type RowCellsProps = {
  row: ReportRow
  score: string
  selected: Selection | null
  hourFormat: '12h' | '24h'
  onPick: (selection: Selection) => void
}

function ReportRowCells({ row, score, selected, hourFormat, onPick }: RowCellsProps) {
  const time = formatWallTime(row.startsAt, hourFormat)
  return (
    <>
      <span className={styles.rowHead}>
        <span className={styles.rowName}>{row.title}</span>
        <span className={styles.rowTime}>{time}</span>
      </span>
      {row.cells.map((cell) => {
        const on = selected?.blockId === row.blockId && selected.date === cell.date
        const inert = cell.status === 'future' || cell.status === 'off'
        return (
          <button
            key={cell.date}
            type="button"
            className={[styles.cell, styles[`cell_${cell.status}`], inert ? styles.cellInert : null, on ? styles.cellOn : null].filter(Boolean).join(' ')}
            aria-pressed={on}
            aria-label={`${row.title} ${time}, ${WEEKDAYS_SHORT[weekdayOf(cell.date)]} ${dayOfMonth(cell.date)}: ${STATUS_LABEL[cell.status]}`}
            onClick={() => onPick({ blockId: row.blockId, date: cell.date })}
          >
            {cell.status === 'late' ? <LineIcon d={['M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M12 8v4l2.5 2']} size={14} strokeWidth={2.2} /> : null}
            {cell.status === 'done' ? <LineIcon d="M5 12l5 5L20 7" size={14} strokeWidth={3} /> : null}
          </button>
        )
      })}
      <span className={styles.score}>{score}</span>
    </>
  )
}
