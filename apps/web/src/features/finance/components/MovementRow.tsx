import { LineIcon } from '@/components/ui/Card'

import { CATEGORY_ICON_PATH, FINANCE_ICON } from '../finance-meta'
import { categoryOf, isIncoming, movementAmountText, movementSub, movementTitle } from '../finance-utils'
import type { FinanceLookup, Transaction } from '../types'

import styles from './MovementRow.module.css'

type MovementRowProps = {
  transaction: Transaction
  lookup: FinanceLookup
  // Si viene, el renglón dice cuándo fue ("· hoy"): en el Resumen, donde no hay encabezado por día.
  today?: string
  // Si viene, el renglón es un botón que abre el movimiento (Movimientos); si no, es solo lectura (Resumen).
  onOpen?: (transaction: Transaction) => void
  // Recién agregado: se resalta un momento.
  highlighted?: boolean
}

// El ícono de un movimiento: ahorro y deuda llevan el suyo; lo demás, el de su categoría.
function iconOf(transaction: Transaction, lookup: FinanceLookup) {
  if (transaction.kind === 'saving_deposit' || transaction.kind === 'saving_withdrawal') return FINANCE_ICON.saving
  if (transaction.kind === 'debt_payment') return FINANCE_ICON.debt
  const category = categoryOf(transaction, lookup.categories)
  return CATEGORY_ICON_PATH[category?.icon ?? (transaction.kind === 'income' ? 'income' : 'dots')]
}

// Un movimiento (FinMovimientos): ícono por tipo, concepto, "categoría · cuenta", si se repite cada mes y su
// monto. Lo que entra va en lavanda; lo que sale, en tinta.
export function MovementRow({ transaction, lookup, today, onOpen, highlighted = false }: MovementRowProps) {
  const incoming = isIncoming(transaction)
  const title = movementTitle(transaction, lookup)
  const amount = movementAmountText(transaction)

  const content = (
    <>
      <span className={[styles.tile, styles[`kind_${transaction.kind}`]].join(' ')} aria-hidden="true">
        <LineIcon d={iconOf(transaction, lookup)} />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.sub}>{movementSub(transaction, lookup, today)}</span>
      </span>
      {transaction.repeatMonthly ? (
        <span className={styles.repeat} role="img" aria-label="Se repite cada mes">
          <LineIcon d={FINANCE_ICON.repeat} size={14} strokeWidth={2} />
        </span>
      ) : null}
      <span className={[styles.amount, incoming ? styles.incoming : null].filter(Boolean).join(' ')}>{amount}</span>
    </>
  )

  if (!onOpen) return <div className={styles.row}>{content}</div>

  return (
    <button
      type="button"
      className={[styles.row, styles.button, highlighted ? styles.highlighted : null].filter(Boolean).join(' ')}
      onClick={() => onOpen(transaction)}
      aria-label={`${title}, ${incoming ? 'ingreso' : 'salida'} de ${amount.slice(1)}`}
    >
      {content}
    </button>
  )
}
