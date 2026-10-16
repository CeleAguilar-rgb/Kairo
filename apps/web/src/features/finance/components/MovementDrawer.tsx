'use client'

import { transactionSchema, TRANSACTION_FORM_KINDS, type TransactionKind } from '@kairo/shared'
import { useState, useTransition, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
import type { IsoDate } from '@/lib/dates'
import { fieldErrors } from '@/lib/form-errors'
import { formatMoney } from '@/lib/money'

import { FINANCE_ICON, TRANSACTION_KIND_LABEL } from '../finance-meta'
import { cardLabel, defaultCategoryId, moneyInputText, parseMoneyInput } from '../finance-utils'
import { deleteTransactionAction, saveTransactionAction } from '../transaction-actions'
import type { MovementsView, Transaction } from '../types'

import { ConfirmRow } from './ConfirmRow'
import styles from './FinanceForm.module.css'

type MovementDrawerProps = {
  open: boolean
  // El movimiento que se edita; null = movimiento nuevo.
  transaction: Transaction | null
  today: IsoDate
  view: MovementsView
  onClose: () => void
  // Se guardó: la pantalla lo resalta en la lista.
  onSaved: (id: string, isNew: boolean) => void
  // Se borró: la pantalla muestra el aviso con "Deshacer".
  onDeleted: (transaction: Transaction, undoToken?: string) => void
}

export function MovementDrawer({ open, transaction, ...rest }: MovementDrawerProps) {
  return (
    <Drawer open={open} onClose={rest.onClose} title={transaction ? 'Editar movimiento' : 'Nuevo movimiento'} hideTitle>
      {/* El formulario es un componente aparte a propósito: Drawer lo desmonta al cerrarse, así cada vez que
          se abre empieza vacío (o con el movimiento que se edita) sin limpiarlo a mano. */}
      <MovementForm key={transaction?.id ?? 'new'} transaction={transaction} {...rest} />
    </Drawer>
  )
}

type FormProps = Omit<MovementDrawerProps, 'open'>

function MovementForm({ transaction, today, view, onClose, onSaved, onDeleted }: FormProps) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const editing = transaction !== null
  const { cards, savings, debts } = view
  const categories = view.lookup.categories

  const [kind, setKind] = useState<TransactionKind>(transaction?.kind ?? 'expense')
  const [amount, setAmount] = useState(transaction ? moneyInputText(transaction.amountCents) : '')
  const [concept, setConcept] = useState(transaction?.concept ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(transaction?.categoryId ?? defaultCategoryId('expense', categories))
  const [cardId, setCardId] = useState(transaction ? (transaction.cardId ?? '') : (cards.find((card) => card.kind === 'debit')?.id ?? cards[0]?.id ?? ''))
  // Las deudas ya pagadas no se ofrecen, salvo la del pago que se está corrigiendo.
  const debtOptions = debts.filter((debt) => debt.leftCents > 0 || debt.id === transaction?.debtId)
  const [savingId, setSavingId] = useState(transaction?.savingId ?? savings[0]?.id ?? '')
  const [debtId, setDebtId] = useState(transaction?.debtId ?? debtOptions[0]?.id ?? '')
  const [occurredOn, setOccurredOn] = useState(transaction?.occurredOn ?? today)
  const [repeat, setRepeat] = useState(transaction?.repeatMonthly ?? false)
  const [note, setNote] = useState(transaction?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)

  // El error de un campo se quita en cuanto se toca: nada de seguir regañando.
  const clearError = (field: string) => setErrors((current) => (current[field] ? { ...current, [field]: '' } : current))

  // "De ahorro" solo aparece al corregir un retiro; los retiros nuevos se hacen desde Ahorros y deudas.
  const kinds: TransactionKind[] = kind === 'saving_withdrawal' ? [...TRANSACTION_FORM_KINDS, 'saving_withdrawal'] : [...TRANSACTION_FORM_KINDS]
  const categorized = kind === 'expense' || kind === 'income'
  const isSaving = kind === 'saving_deposit' || kind === 'saving_withdrawal'
  const moneyIn = kind === 'income' || kind === 'saving_withdrawal'
  const visibleCategories = categories.filter((category) => category.kind === (kind === 'income' ? 'income' : 'expense'))

  function pickKind(next: TransactionKind) {
    setKind(next)
    setErrors({})
    if (next === 'expense' || next === 'income') setCategoryId(defaultCategoryId(next, categories))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = transactionSchema.safeParse({
      kind,
      amountCents: parseMoneyInput(amount),
      concept,
      note,
      occurredOn,
      categoryId: categorized ? categoryId : null,
      cardId: cardId || null,
      savingId: isSaving ? savingId || null : null,
      debtId: kind === 'debt_payment' ? debtId || null : null,
      repeatMonthly: repeat,
    })
    if (!parsed.success) {
      const found = fieldErrors(parsed.error.issues)
      setErrors(found)
      const first = ['amountCents', 'categoryId', 'savingId', 'debtId'].find((key) => found[key])
      if (first === 'amountCents') document.getElementById('mv-amount')?.focus()
      return
    }
    startTransition(async () => {
      const result = await saveTransactionAction(transaction?.id ?? null, parsed.data)
      if (!result.ok) {
        setErrors(result.errors)
        if (result.message) toast.show({ message: result.message, icon: 'info' })
        return
      }
      toast.show({ message: editing ? 'Movimiento actualizado.' : 'Movimiento guardado.', icon: 'check' })
      onSaved(result.id ?? '', !editing)
    })
  }

  function handleDelete() {
    if (!transaction) return
    startTransition(async () => {
      const result = await deleteTransactionAction(transaction.id)
      if (!result.ok) {
        setConfirming(false)
        toast.show({ message: result.message ?? 'No se pudo borrar el movimiento.', icon: 'info' })
        return
      }
      onDeleted(transaction, result.undoToken)
    })
  }

  const amountCents = parseMoneyInput(amount)

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <header className={styles.head}>
        {/* El título real (para lectores de pantalla) lo pone el Drawer; este es solo visual */}
        <p className={styles.heading} aria-hidden="true">
          {editing ? 'Editar movimiento' : 'Nuevo movimiento'}
        </p>
        <button type="button" className={styles.close} aria-label="Cerrar sin guardar" onClick={onClose}>
          <LineIcon d={FINANCE_ICON.close} size={20} />
        </button>
      </header>

      <div className={styles.fields}>
        <Segmented
          label="Tipo de movimiento"
          mode="radio"
          tone="raised"
          value={kind}
          onChange={pickKind}
          options={kinds.map((value) => ({ value, label: TRANSACTION_KIND_LABEL[value] }))}
        />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="mv-amount">
            Monto
          </label>
          <div className={styles.amountRow}>
            <span className={styles.currency} aria-hidden="true">
              $
            </span>
            <input
              id="mv-amount"
              className={[styles.amount, errors.amountCents ? styles.amountInvalid : null].filter(Boolean).join(' ')}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              placeholder="0"
              value={amount}
              aria-invalid={Boolean(errors.amountCents)}
              aria-describedby={errors.amountCents ? 'mv-amount-error' : undefined}
              onChange={(event) => {
                setAmount(event.target.value)
                clearError('amountCents')
              }}
            />
          </div>
          {errors.amountCents ? (
            <span id="mv-amount-error" className={styles.error}>
              {errors.amountCents}
            </span>
          ) : null}
        </div>

        <Input
          id="mv-concept"
          label="Concepto"
          value={concept}
          maxLength={80}
          autoComplete="off"
          hint={categorized ? 'Si lo dejas vacío, se llama como su categoría.' : undefined}
          onChange={(event) => setConcept(event.target.value)}
        />

        {categorized ? (
          <div className={styles.field}>
            <span className={styles.label} id="mv-category-label">
              Categoría
            </span>
            <div role="radiogroup" aria-labelledby="mv-category-label" className={styles.categories}>
              {visibleCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  role="radio"
                  aria-checked={categoryId === category.id}
                  className={[styles.category, categoryId === category.id ? styles.categoryOn : null].filter(Boolean).join(' ')}
                  onClick={() => {
                    setCategoryId(category.id)
                    clearError('categoryId')
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
            {errors.categoryId ? <span className={styles.error}>{errors.categoryId}</span> : null}
          </div>
        ) : null}

        {isSaving ? (
          savings.length > 0 ? (
            <Select
              id="mv-saving"
              label={kind === 'saving_deposit' ? '¿A qué ahorro?' : '¿De qué ahorro?'}
              value={savingId}
              onChange={(event) => {
                setSavingId(event.target.value)
                clearError('savingId')
              }}
              options={savings.map((goal) => ({ value: goal.id, label: goal.name }))}
            />
          ) : (
            <p className={styles.note}>Todavía no tienes ahorros. Crea uno en Ahorros y deudas para poder apartar dinero.</p>
          )
        ) : null}
        {isSaving && errors.savingId ? <span className={styles.error}>{errors.savingId}</span> : null}

        {kind === 'debt_payment' ? (
          debtOptions.length > 0 ? (
            <Select
              id="mv-debt"
              label="¿Qué deuda pagas?"
              value={debtId}
              onChange={(event) => {
                setDebtId(event.target.value)
                clearError('debtId')
              }}
              options={debtOptions.map((debt) => ({ value: debt.id, label: debt.name }))}
            />
          ) : (
            <p className={styles.note}>No tienes deudas pendientes. Agrega una en Ahorros y deudas.</p>
          )
        ) : null}
        {kind === 'debt_payment' && errors.debtId ? <span className={styles.error}>{errors.debtId}</span> : null}

        <div className={styles.pair}>
          <div className={styles.pairWide}>
            <Select
              id="mv-card"
              label={moneyIn ? 'Entra a' : 'Sale de'}
              value={cardId}
              onChange={(event) => {
                setCardId(event.target.value)
                clearError('cardId')
              }}
              options={[...cards.map((card) => ({ value: card.id, label: cardLabel(card) })), { value: '', label: 'Sin cuenta' }]}
            />
            {errors.cardId ? <span className={styles.error}>{errors.cardId}</span> : null}
          </div>
          <div className={styles.pairDate}>
            <Input id="mv-date" type="date" label="Fecha" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} />
          </div>
        </div>

        <div className={styles.repeat}>
          <Toggle checked={repeat} onToggle={() => setRepeat((current) => !current)} label="Se repite cada mes" />
          <span>Se repite cada mes</span>
        </div>

        <Input
          id="mv-note"
          label="Nota"
          labelExtra={<span className={styles.optional}>(opcional)</span>}
          autoComplete="off"
          value={note}
          maxLength={160}
          onChange={(event) => setNote(event.target.value)}
        />

        {confirming && transaction ? (
          <ConfirmRow
            text={`¿Borrar "${transaction.concept || 'este movimiento'}" de ${formatMoney(transaction.amountCents)}? Va a la papelera.`}
            confirmLabel="Borrar"
            disabled={pending}
            onCancel={() => setConfirming(false)}
            onConfirm={handleDelete}
          />
        ) : null}
      </div>

      <footer className={styles.actions}>
        {editing ? (
          <button type="button" className={styles.trash} aria-label="Borrar movimiento" onClick={() => setConfirming(true)}>
            <LineIcon d={FINANCE_ICON.trash} />
          </button>
        ) : null}
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className={styles.submit} disabled={pending}>
          {editing ? 'Guardar cambios' : amountCents ? `Guardar ${formatMoney(amountCents)}` : 'Guardar movimiento'}
        </Button>
      </footer>
    </form>
  )
}
