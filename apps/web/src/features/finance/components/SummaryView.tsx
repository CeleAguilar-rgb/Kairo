'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { Card, CardLink, LineIcon } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/Progress'
import { dayOfMonth, formatMonthShort, type IsoDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { EASE_OUT, fadeUp, staggerList } from '@/lib/motion'

import { FINANCE_ICON } from '../finance-meta'
import {
  budgetRatio,
  budgetSummaryText,
  cardShort,
  chartAriaLabel,
  chartMax,
  debtSummaryText,
  monthWord,
  netLabel,
  progressRatio,
  savingSummaryText,
} from '../finance-utils'
import type { BudgetRow, FinanceSummary } from '../types'

import { MovementRow } from './MovementRow'
import styles from './SummaryView.module.css'

type SummaryViewProps = {
  summary: FinanceSummary
  today: IsoDate
}

// La barra de un renglón del presupuesto: tinta, rosada al llegar al 80% y roja al pasarse.
const BAR_TONE = { none: 'ink', ok: 'ink', warn: 'caution', over: 'danger' } as const

// Resumen (FinResumen.dc.html): las cuatro cifras del mes, la gráfica de 6 meses y un vistazo de presupuesto,
// ahorros, deudas, próximos cobros, últimos movimientos y en qué se fue el dinero. Todo sale de los
// movimientos del mes que se está viendo.
export function SummaryView({ summary, today }: SummaryViewProps) {
  const calm = useCalmEntry()
  const { totals, notes, bars, lookup } = summary
  const max = chartMax(bars)
  const percentSpent = totals.incomeCents > 0 ? Math.round((totals.expenseCents / totals.incomeCents) * 100) : null

  return (
    <motion.div className={styles.grid} variants={staggerList(0.06, 0.1)} initial={calm ? false : 'hidden'} animate="show">
      <Stat
        label="Ingresos"
        icon={FINANCE_ICON.income}
        tone="income"
        value={formatMoney(totals.incomeCents)}
        sub={notes.income}
      />
      <Stat
        label="Gastos"
        icon={FINANCE_ICON.expense}
        tone="expense"
        value={formatMoney(totals.expenseCents)}
        sub={percentSpent === null ? 'Sin ingresos para comparar' : `${percentSpent}% de lo que entró`}
      />
      <Stat label="Apartado a ahorros" icon={FINANCE_ICON.saving} tone="saving" value={formatMoney(totals.savedCents)} sub={notes.saved} />
      <Stat label="Te queda" icon={FINANCE_ICON.wallet} tone="left" value={formatMoney(totals.leftCents)} sub={notes.left} />

      <Panel className={styles.s7} aria-labelledby="fin-chart" gap="tight">
        <div className={styles.head}>
          <h2 id="fin-chart" className={styles.title}>
            Ingresos y gastos
          </h2>
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={[styles.swatch, styles.swatchIncome].join(' ')} />
              Ingresos
            </span>
            <span className={styles.legendItem}>
              <span className={[styles.swatch, styles.swatchExpense].join(' ')} />
              Gastos
            </span>
          </div>
        </div>
        <div className={styles.chart} role="img" aria-label={chartAriaLabel(bars)}>
          {bars.map((bar, index) => (
            <div key={bar.month} className={styles.column}>
              <span className={styles.net}>{netLabel(bar.leftCents)}</span>
              <div className={styles.bars}>
                <motion.div
                  className={[styles.bar, styles.barIncome, bar.selected ? null : styles.dim].filter(Boolean).join(' ')}
                  style={{ height: `${(bar.incomeCents / max) * 100}%` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: index * 0.05 }}
                />
                <motion.div
                  className={[styles.bar, styles.barExpense, bar.selected ? null : styles.dim].filter(Boolean).join(' ')}
                  style={{ height: `${(bar.expenseCents / max) * 100}%` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: index * 0.05 + 0.025 }}
                />
              </div>
              <span className={[styles.month, bar.selected ? styles.monthSelected : null].filter(Boolean).join(' ')}>{bar.label}</span>
            </div>
          ))}
        </div>
        <span className={styles.hint}>Arriba de cada mes: lo que te quedó.</span>
      </Panel>

      <Panel className={styles.s5} aria-labelledby="fin-budget">
        <div className={styles.head}>
          <h2 id="fin-budget" className={styles.title}>
            Presupuesto del mes
          </h2>
          <CardLink href="/finanzas/presupuesto">Ajustar</CardLink>
        </div>
        {summary.budget.length === 0 ? (
          <p className={styles.empty}>
            Todavía no tienes límites. <Link href="/finanzas/presupuesto">Ponle uno a cada categoría</Link>.
          </p>
        ) : (
          <div className={styles.list}>
            {summary.budget.map((row) => (
              <BudgetLine key={row.category.id} row={row} />
            ))}
          </div>
        )}
      </Panel>

      <Panel className={styles.s4} aria-labelledby="fin-savings">
        <div className={styles.head}>
          <h2 id="fin-savings" className={styles.title}>
            Ahorros
          </h2>
          <CardLink href="/finanzas/ahorros">Ver todos</CardLink>
        </div>
        {summary.savings.length === 0 ? (
          <p className={styles.empty}>
            Sin ahorros todavía. <Link href="/finanzas/ahorros">Crea el primero</Link>.
          </p>
        ) : (
          summary.savings.map((goal) => (
            <div key={goal.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.itemName}>{goal.name}</span>
                <span className={styles.itemNote}>{Math.round(progressRatio(goal.savedCents, goal.targetCents) * 100)}%</span>
              </div>
              <ProgressBar value={progressRatio(goal.savedCents, goal.targetCents)} label={`Avance de ${goal.name}`} tone="accent" />
              <span className={styles.hint}>{savingSummaryText(goal)}</span>
            </div>
          ))
        )}
      </Panel>

      <Panel className={styles.s4} aria-labelledby="fin-debts">
        <div className={styles.head}>
          <h2 id="fin-debts" className={styles.title}>
            Deudas
          </h2>
          <CardLink href="/finanzas/ahorros">Ver todas</CardLink>
        </div>
        {summary.debts.length === 0 ? (
          <p className={styles.empty}>Sin deudas pendientes. Qué ligereza.</p>
        ) : (
          summary.debts.map((debt) => (
            <div key={debt.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.itemName}>{debt.name}</span>
                <span className={styles.itemStrong}>{formatMoney(debt.leftCents)} restan</span>
              </div>
              <ProgressBar value={progressRatio(debt.paidCents, debt.totalCents)} label={`Pagado de ${debt.name}`} tone="ink" />
              <span className={styles.hint}>{debtSummaryText(debt)}</span>
            </div>
          ))
        )}
      </Panel>

      <Panel className={styles.s4} aria-labelledby="fin-charges" gap="tight">
        <div className={styles.head}>
          <h2 id="fin-charges" className={styles.title}>
            Próximos cobros
          </h2>
          <CardLink href="/finanzas/membresias">Membresías</CardLink>
        </div>
        {summary.charges.length === 0 ? (
          <p className={styles.empty}>
            Sin cobros próximos. <Link href="/finanzas/membresias">Agrega una membresía</Link>.
          </p>
        ) : (
          summary.charges.map((charge) => (
            <div key={charge.id} className={styles.charge}>
              <span className={styles.chargeDate}>
                {dayOfMonth(charge.nextChargeOn)} {formatMonthShort(charge.nextChargeOn)}
              </span>
              <span className={styles.chargeName}>{charge.name}</span>
              <span className={styles.hint}>{cardShort(charge.card)}</span>
              <span className={styles.chargeAmount}>{formatMoney(charge.amountCents, charge.currency)}</span>
            </div>
          ))
        )}
      </Panel>

      <Panel className={styles.s8} aria-labelledby="fin-moves" gap="none">
        <div className={[styles.head, styles.headSpaced].join(' ')}>
          <h2 id="fin-moves" className={styles.title}>
            Últimos movimientos
          </h2>
          <CardLink href="/finanzas/movimientos">Ver todos</CardLink>
        </div>
        {summary.moves.length === 0 ? (
          <p className={styles.empty}>No hay movimientos en {monthWord(summary.month)} todavía.</p>
        ) : (
          summary.moves.map((transaction) => <MovementRow key={transaction.id} transaction={transaction} lookup={lookup} today={today} />)
        )}
      </Panel>

      <Panel className={styles.s4} aria-labelledby="fin-shares">
        <h2 id="fin-shares" className={styles.title}>
          ¿En qué se fue?
        </h2>
        {summary.shares.length === 0 ? (
          <p className={styles.empty}>Todavía no hay gastos en {monthWord(summary.month)}.</p>
        ) : (
          <>
            <div
              className={styles.stack}
              role="img"
              aria-label={`Gastos por categoría de ${monthWord(summary.month)}: ${summary.shares.map((share) => `${share.name} ${share.percent}%`).join(', ')}`}
            >
              {summary.shares.map((share) => (
                <span key={share.id} className={[styles.segment, styles[`tone_${share.tone}`]].join(' ')} style={{ flex: share.spentCents }} />
              ))}
            </div>
            <ul className={styles.shares}>
              {summary.shares.map((share) => (
                <li key={share.id} className={styles.share}>
                  <span className={[styles.dot, styles[`tone_${share.tone}`]].join(' ')} />
                  <span className={styles.shareName}>{share.name}</span>
                  <span className={styles.sharePercent}>{share.percent}%</span>
                  <span className={styles.shareAmount}>{formatMoney(share.spentCents)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </motion.div>
  )
}

type StatTone = 'income' | 'expense' | 'saving' | 'left'

// Una de las cuatro cifras de arriba. "Te queda" es la tarjeta oscura (la destacada de la pantalla).
function Stat({ label, icon, tone, value, sub }: { label: string; icon: string | string[]; tone: StatTone; value: string; sub: string }) {
  const inverted = tone === 'left'
  return (
    <motion.div className={styles.s3} variants={fadeUp}>
      <Card as="section" tone={inverted ? 'inverted' : 'surface'} className={styles.stat}>
        <div className={styles.statHead}>
          <span className={[styles.statIcon, styles[`statIcon_${tone}`]].join(' ')} aria-hidden="true">
            <LineIcon d={icon} />
          </span>
          <span className={inverted ? styles.statLabelInverted : styles.statLabel}>{label}</span>
        </div>
        <span className={styles.big}>{value}</span>
        <span className={inverted ? styles.statSubInverted : styles.hint}>{sub}</span>
      </Card>
    </motion.div>
  )
}

type PanelProps = {
  className: string
  children: ReactNode
  gap?: 'normal' | 'tight' | 'none'
  'aria-labelledby': string
}

// Una tarjeta de la cuadrícula: entra con el resto, y ocupa las columnas que dice su clase.
function Panel({ className, children, gap = 'normal', ...rest }: PanelProps) {
  return (
    <motion.div className={className} variants={fadeUp}>
      <Card as="section" className={[styles.panel, styles[`gap_${gap}`]].join(' ')} {...rest}>
        {children}
      </Card>
    </motion.div>
  )
}

// Un renglón del presupuesto: nombre, "$1,680 de $1,500 · te pasaste" y su barra.
function BudgetLine({ row }: { row: BudgetRow }) {
  return (
    <div className={styles.budgetLine}>
      <div className={styles.itemHead}>
        <span className={styles.itemName}>{row.category.name}</span>
        <span className={row.state === 'over' ? styles.over : styles.itemNote}>{budgetSummaryText(row)}</span>
      </div>
      <ProgressBar value={budgetRatio(row.spentCents, row.limitCents)} label={`Presupuesto de ${row.category.name}`} tone={BAR_TONE[row.state]} />
    </div>
  )
}
