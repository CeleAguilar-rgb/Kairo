'use client'

import { moneyAmountSchema } from '@kairo/shared'
import { motion } from 'motion/react'
import { useState, useTransition } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { Button } from '@/components/ui/Button'
import { Card, LineIcon } from '@/components/ui/Card'
import { Doodle } from '@/components/ui/Doodle'
import { ProgressBar } from '@/components/ui/Progress'
import { useToast } from '@/components/ui/Toast'
import { formatDayMonth } from '@/lib/dates'
import { fieldErrors } from '@/lib/form-errors'
import { formatMoney } from '@/lib/money'
import { fadeUp, staggerList } from '@/lib/motion'

import { FINANCE_ICON } from '../finance-meta'
import { parseMoneyInput, progressRatio } from '../finance-utils'
import { deleteDebtAction, deleteSavingAction, moveSavingAction, payDebtAction } from '../saving-actions'
import { undoFinanceAction } from '../transaction-actions'
import type { DebtView, SavingView, SavingsDebtsView as SavingsDebtsData } from '../types'

import { ConfirmRow } from './ConfirmRow'
import { FinanceToolbar } from './FinanceToolbar'
import { SavingDebtDrawer, type NewMoneyKind } from './SavingDebtDrawer'
import styles from './SavingsDebtsView.module.css'

// Ahorros y deudas (FinAhorros.dc.html): dos listas lado a lado. Cada ahorro y cada deuda muestra su avance, que
// se calcula de los movimientos: aportar, retirar y pagar crean un movimiento, no cambian un saldo.
export function SavingsDebtsView({ view }: { view: SavingsDebtsData }) {
  const calm = useCalmEntry()
  const [drawer, setDrawer] = useState<NewMoneyKind | null>(null)
  // Lo que se está por borrar (la pregunta sale dentro de su tarjeta).
  const [confirming, setConfirming] = useState<string | null>(null)

  const openDebts = view.debts.filter((debt) => debt.leftCents > 0)
  const paidDebts = view.debts.filter((debt) => debt.leftCents <= 0)

  return (
    <>
      <FinanceToolbar>Lo que guardas y lo que debes, al día</FinanceToolbar>

      <motion.div className={styles.cols} variants={staggerList(0.08, 0.1)} initial={calm ? false : 'hidden'} animate="show">
        <motion.div variants={fadeUp}>
          <Card as="section" className={styles.section} aria-labelledby="fin-savings">
            <div className={styles.head}>
              <div>
                <h2 id="fin-savings" className={styles.title}>
                  Ahorros
                </h2>
                <span className={styles.hint}>Llevas {formatMoney(view.savedTotalCents)} guardado</span>
              </div>
              <Button variant="ghost" onClick={() => setDrawer('saving')}>
                <LineIcon d={FINANCE_ICON.plus} size={14} strokeWidth={2.2} />
                Nuevo ahorro
              </Button>
            </div>

            {view.savings.length === 0 ? (
              <p className={styles.empty}>Todavía no tienes ahorros. Crea uno con su meta y ve cuánto te falta.</p>
            ) : (
              view.savings.map((goal) => (
                <SavingCard key={goal.id} goal={goal} confirming={confirming === goal.id} onAskDelete={() => setConfirming(goal.id)} onCancel={() => setConfirming(null)} />
              ))
            )}
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card as="section" className={styles.section} aria-labelledby="fin-debts">
            <div className={styles.head}>
              <div>
                <h2 id="fin-debts" className={styles.title}>
                  Deudas
                </h2>
                <span className={styles.hint}>{view.debtLeftCents > 0 ? `Te faltan ${formatMoney(view.debtLeftCents)} por pagar` : 'No debes nada por ahora'}</span>
              </div>
              <Button variant="ghost" onClick={() => setDrawer('debt')}>
                <LineIcon d={FINANCE_ICON.plus} size={14} strokeWidth={2.2} />
                Nueva deuda
              </Button>
            </div>

            {view.debts.length === 0 ? <p className={styles.empty}>Sin deudas. Si algún día debes algo, anótalo aquí y llévale la cuenta.</p> : null}
            {openDebts.map((debt) => (
              <DebtCard key={debt.id} debt={debt} confirming={confirming === debt.id} onAskDelete={() => setConfirming(debt.id)} onCancel={() => setConfirming(null)} />
            ))}

            {paidDebts.length > 0 ? (
              <>
                <h3 className={styles.subtitle}>Pagadas</h3>
                {paidDebts.map((debt) => (
                  <DebtCard key={debt.id} debt={debt} confirming={confirming === debt.id} onAskDelete={() => setConfirming(debt.id)} onCancel={() => setConfirming(null)} />
                ))}
              </>
            ) : null}
          </Card>
        </motion.div>
      </motion.div>

      <SavingDebtDrawer kind={drawer} onClose={() => setDrawer(null)} />
    </>
  )
}

type CardActionProps = {
  confirming: boolean
  onAskDelete: () => void
  onCancel: () => void
}

// Un campo de monto con sus botones: lo que se escribe se valida con el mismo esquema que la acción.
function useMoneyField() {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  return { text, setText, error, setError, pending, startTransition }
}

function SavingCard({ goal, confirming, onAskDelete, onCancel }: CardActionProps & { goal: SavingView }) {
  const toast = useToast()
  const field = useMoneyField()
  const ratio = progressRatio(goal.savedCents, goal.targetCents)

  function move(direction: 'deposit' | 'withdraw') {
    const parsed = moneyAmountSchema.safeParse({ amountCents: parseMoneyInput(field.text) })
    if (!parsed.success) return field.setError(fieldErrors(parsed.error.issues).amountCents ?? 'Escribe cuánto fue, por ejemplo 500.')
    field.startTransition(async () => {
      const result = await moveSavingAction(goal.id, direction, parsed.data)
      if (!result.ok) return field.setError(result.errors.amountCents ?? result.message ?? 'No se pudo guardar. Intenta de nuevo.')
      field.setText('')
      field.setError('')
      toast.show({ message: `${direction === 'deposit' ? 'Aportaste' : 'Retiraste'} ${formatMoney(parsed.data.amountCents)} ${direction === 'deposit' ? 'a' : 'de'} ${goal.name}.`, icon: 'check' })
    })
  }

  function remove() {
    field.startTransition(async () => {
      const result = await deleteSavingAction(goal.id)
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo borrar el ahorro.', icon: 'info' })
      const token = result.undoToken
      toast.show({ message: `Se borró el ahorro "${goal.name}"`, icon: 'trash', onUndo: token ? () => void undoFinanceAction(token) : undefined })
    })
  }

  return (
    <article className={styles.item} aria-label={goal.name}>
      <div className={styles.itemHead}>
        <div className={styles.itemTitles}>
          <span className={styles.itemName}>{goal.name}</span>
          <span className={styles.hint}>{goal.dueText}</span>
        </div>
        <div className={styles.itemSide}>
          <span className={styles.percent}>{Math.round(ratio * 100)}%</span>
          <button type="button" className={styles.trash} aria-label={`Borrar ${goal.name}`} onClick={onAskDelete}>
            <LineIcon d={FINANCE_ICON.trash} size={16} />
          </button>
        </div>
      </div>

      <ProgressBar value={ratio} label={`Avance de ${goal.name}`} tone="accent" />

      <div className={styles.itemFoot}>
        <span>
          <b>{formatMoney(goal.savedCents)}</b> de {formatMoney(goal.targetCents)}
        </span>
        <span className={styles.hint}>{goal.tip}</span>
      </div>

      <div className={styles.quick}>
        <label className={styles.srOnly} htmlFor={`add-${goal.id}`}>
          Monto a aportar a {goal.name}
        </label>
        <input
          id={`add-${goal.id}`}
          className={[styles.quickInput, field.error ? styles.quickInvalid : null].filter(Boolean).join(' ')}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="$500"
          value={field.text}
          aria-invalid={Boolean(field.error)}
          aria-describedby={field.error ? `add-${goal.id}-error` : undefined}
          onChange={(event) => {
            field.setText(event.target.value)
            field.setError('')
          }}
        />
        <Button className={styles.quickButton} onClick={() => move('deposit')} disabled={field.pending}>
          Aportar
        </Button>
        <Button variant="ghost" className={styles.quickButton} onClick={() => move('withdraw')} disabled={field.pending}>
          Retirar
        </Button>
      </div>
      {field.error ? (
        <span id={`add-${goal.id}-error`} className={styles.error}>
          {field.error}
        </span>
      ) : null}

      {confirming ? (
        <ConfirmRow
          text={`¿Borrar el ahorro "${goal.name}"? Sus aportes se quedan en Movimientos.`}
          confirmLabel="Borrar"
          disabled={field.pending}
          onCancel={onCancel}
          onConfirm={remove}
        />
      ) : null}
    </article>
  )
}

function DebtCard({ debt, confirming, onAskDelete, onCancel }: CardActionProps & { debt: DebtView }) {
  const toast = useToast()
  const field = useMoneyField()
  const ratio = progressRatio(debt.paidCents, debt.totalCents)
  const closed = debt.leftCents <= 0

  function pay() {
    const parsed = moneyAmountSchema.safeParse({ amountCents: parseMoneyInput(field.text) })
    if (!parsed.success) return field.setError(fieldErrors(parsed.error.issues).amountCents ?? 'Escribe cuánto pagaste, por ejemplo 500.')
    field.startTransition(async () => {
      const result = await payDebtAction(debt.id, parsed.data)
      if (!result.ok) return field.setError(result.errors.amountCents ?? result.message ?? 'No se pudo guardar. Intenta de nuevo.')
      field.setText('')
      field.setError('')
      toast.show(result.liquidated ? { message: `¡Liquidaste "${debt.name}"!`, icon: 'check' } : { message: `Pago de ${formatMoney(parsed.data.amountCents)} registrado.`, icon: 'check' })
    })
  }

  function remove() {
    field.startTransition(async () => {
      const result = await deleteDebtAction(debt.id)
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo borrar la deuda.', icon: 'info' })
      const token = result.undoToken
      toast.show({ message: `Se borró la deuda "${debt.name}"`, icon: 'trash', onUndo: token ? () => void undoFinanceAction(token) : undefined })
    })
  }

  return (
    <article className={[styles.item, closed ? styles.closed : null].filter(Boolean).join(' ')} aria-label={debt.name}>
      <div className={styles.itemHead}>
        <div className={styles.itemTitles}>
          <span className={styles.itemName}>{debt.name}</span>
          <span className={styles.chips}>
            {debt.chips.map((chip) => (
              <span key={chip} className={styles.chip}>
                {chip}
              </span>
            ))}
          </span>
        </div>
        <div className={styles.itemSide}>
          <span className={styles.left}>
            <span className={styles.leftAmount}>{formatMoney(debt.leftCents)}</span>
            <span className={styles.hint}>restan</span>
          </span>
          <button type="button" className={styles.trash} aria-label={`Borrar ${debt.name}`} onClick={onAskDelete}>
            <LineIcon d={FINANCE_ICON.trash} size={16} />
          </button>
        </div>
      </div>

      <ProgressBar value={ratio} label={`Pagado de ${debt.name}`} tone="ink" />

      <span>
        Pagado <b>{formatMoney(debt.paidCents)}</b> de {formatMoney(debt.totalCents)} · {debt.nextText}
      </span>

      {closed ? (
        <div className={styles.done}>
          <Doodle kind="star" size={22} strokeWidth={2.2} />
          <span>¡Deuda liquidada!{debt.paidOffOn ? ` Fue el ${formatDayMonth(debt.paidOffOn)}.` : ''}</span>
        </div>
      ) : (
        <>
          <div className={styles.quick}>
            <label className={styles.srOnly} htmlFor={`pay-${debt.id}`}>
              Monto del pago a {debt.name}
            </label>
            <input
              id={`pay-${debt.id}`}
              className={[styles.quickInput, field.error ? styles.quickInvalid : null].filter(Boolean).join(' ')}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="$500"
              value={field.text}
              aria-invalid={Boolean(field.error)}
              aria-describedby={field.error ? `pay-${debt.id}-error` : undefined}
              onChange={(event) => {
                field.setText(event.target.value)
                field.setError('')
              }}
            />
            <Button className={styles.quickButton} onClick={pay} disabled={field.pending}>
              Registrar pago
            </Button>
          </div>
          {field.error ? (
            <span id={`pay-${debt.id}-error`} className={styles.error}>
              {field.error}
            </span>
          ) : null}
        </>
      )}

      {confirming ? (
        <ConfirmRow
          text={`¿Borrar la deuda "${debt.name}"? Sus pagos se quedan en Movimientos.`}
          confirmLabel="Borrar"
          disabled={field.pending}
          onCancel={onCancel}
          onConfirm={remove}
        />
      ) : null}
    </article>
  )
}
