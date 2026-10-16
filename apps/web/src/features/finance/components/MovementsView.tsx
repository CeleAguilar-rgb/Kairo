'use client'

import { motion } from 'motion/react'
import { useState } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { Button } from '@/components/ui/Button'
import { Card, LineIcon } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/Toast'
import type { IsoDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { EASE_OUT } from '@/lib/motion'

import { FINANCE_ICON } from '../finance-meta'
import { groupByDay, inOutTotals, matchesFilter, monthWord, movementTitle, type MovementFilter } from '../finance-utils'
import { undoFinanceAction } from '../transaction-actions'
import type { MovementsView as MovementsData, Transaction } from '../types'

import { FinanceToolbar } from './FinanceToolbar'
import { MonthSwitcher } from './MonthSwitcher'
import { MovementDrawer } from './MovementDrawer'
import { MovementRow } from './MovementRow'
import styles from './MovementsView.module.css'

type MovementsViewProps = {
  view: MovementsData
  today: IsoDate
  prevHref: string | null
  nextHref: string | null
  // Viene de "Movimiento" en el Resumen (`?nuevo=1`): abre el panel de movimiento nuevo.
  openNew: boolean
}

const FILTERS: { value: MovementFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'saving_debt', label: 'Ahorros y deudas' },
]

type Panel = { id: string | null } | null

// Movimientos (FinMovimientos.dc.html): los del mes por día, con filtro por tipo y lo que entró y salió. Un
// toque abre el movimiento en un panel para corregirlo o borrarlo; "Movimiento" abre uno nuevo.
export function MovementsView({ view, today, prevHref, nextHref, openNew }: MovementsViewProps) {
  const toast = useToast()
  const calm = useCalmEntry()
  const [filter, setFilter] = useState<MovementFilter>('all')
  const [panel, setPanel] = useState<Panel>(openNew ? { id: null } : null)
  const [highlighted, setHighlighted] = useState<string | null>(null)

  const shown = view.transactions.filter((transaction) => matchesFilter(transaction, filter))
  const groups = groupByDay(shown, today)
  const { inCents, outCents } = inOutTotals(shown)
  const editing = panel?.id ? (view.transactions.find((transaction) => transaction.id === panel.id) ?? null) : null

  function handleDeleted(transaction: Transaction, undoToken?: string) {
    setPanel(null)
    toast.show({
      message: `Se borró "${movementTitle(transaction, view.lookup)}"`,
      icon: 'trash',
      onUndo: undoToken ? () => void undoFinanceAction(undoToken) : undefined,
    })
  }

  return (
    <>
      <FinanceToolbar
        action={
          <Button onClick={() => setPanel({ id: null })}>
            <LineIcon d={FINANCE_ICON.plus} size={16} strokeWidth={2} />
            Movimiento
          </Button>
        }
      >
        <MonthSwitcher month={view.month} prevHref={prevHref} nextHref={nextHref} />
      </FinanceToolbar>

      <motion.div initial={calm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.12 }}>
        <Card as="section" className={styles.card} aria-label="Movimientos">
          <div className={styles.bar}>
            <Segmented label="Tipo de movimiento" tone="raised" value={filter} onChange={setFilter} options={FILTERS} />
            <div className={styles.sums}>
              <span>
                Entró <b className={styles.sumIn}>{formatMoney(inCents, undefined, { sign: true })}</b>
              </span>
              <span>
                Salió <b className={styles.sumOut}>{formatMoney(-outCents)}</b>
              </span>
            </div>
          </div>

          {groups.map((group) => (
            <div key={group.date} className={styles.group}>
              <span className={styles.day}>{group.label}</span>
              {group.rows.map((transaction) => (
                <MovementRow
                  key={transaction.id}
                  transaction={transaction}
                  lookup={view.lookup}
                  highlighted={highlighted === transaction.id}
                  onOpen={(item) => setPanel({ id: item.id })}
                />
              ))}
            </div>
          ))}

          {groups.length === 0 ? <p className={styles.empty}>No hay movimientos de este tipo en {monthWord(view.month)}.</p> : null}
        </Card>
      </motion.div>

      <MovementDrawer
        open={panel !== null}
        transaction={editing}
        today={today}
        view={view}
        onClose={() => setPanel(null)}
        onSaved={(id, isNew) => {
          setPanel(null)
          if (isNew) {
            setFilter('all')
            setHighlighted(id)
          }
        }}
        onDeleted={handleDeleted}
      />
    </>
  )
}
