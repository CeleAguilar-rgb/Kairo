'use client'

import { DEBT_KINDS, debtSchema, savingGoalSchema, type DebtKind } from '@kairo/shared'
import { useState, useTransition, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/Toast'
import { fieldErrors } from '@/lib/form-errors'

import { DEBT_KIND_LABEL, FINANCE_ICON } from '../finance-meta'
import { parseMoneyInput, parsePercentInput } from '../finance-utils'
import { createDebtAction, createSavingAction } from '../saving-actions'

import styles from './FinanceForm.module.css'

export type NewMoneyKind = 'saving' | 'debt'

type SavingDebtDrawerProps = {
  // null = cerrado.
  kind: NewMoneyKind | null
  onClose: () => void
}

export function SavingDebtDrawer({ kind, onClose }: SavingDebtDrawerProps) {
  return (
    <Drawer open={kind !== null} onClose={onClose} title={kind === 'debt' ? 'Nueva deuda' : 'Nuevo ahorro'} hideTitle>
      {/* Aparte a propósito: Drawer lo desmonta al cerrarse, así cada vez que se abre empieza vacío. */}
      {kind ? <NewMoneyForm key={kind} kind={kind} onClose={onClose} /> : null}
    </Drawer>
  )
}

// Un campo opcional vacío es "sin valor"; uno escrito pero que no es un monto es un error.
function optionalMoney(text: string): { value: number | null; invalid: boolean } {
  if (text.trim() === '') return { value: null, invalid: false }
  const value = parseMoneyInput(text)
  return { value, invalid: value === null }
}

function NewMoneyForm({ kind, onClose }: { kind: NewMoneyKind; onClose: () => void }) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const isDebt = kind === 'debt'

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [debtKind, setDebtKind] = useState<DebtKind>('person')
  const [monthly, setMonthly] = useState('')
  const [interest, setInterest] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const clearError = (field: string) => setErrors((current) => (current[field] ? { ...current, [field]: '' } : current))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (isDebt) {
      const payment = optionalMoney(monthly)
      const percent = interest.trim() === '' ? null : parsePercentInput(interest)
      const extra: Record<string, string> = {}
      if (payment.invalid) extra.monthlyPaymentCents = 'Escribe un monto, como 500.'
      if (interest.trim() !== '' && percent === null) extra.annualInterestPct = 'Escribe un porcentaje, como 12.'

      const parsed = debtSchema.safeParse({
        name,
        kind: debtKind,
        totalCents: parseMoneyInput(amount),
        monthlyPaymentCents: payment.value,
        annualInterestPct: percent,
      })
      const found = { ...(parsed.success ? {} : fieldErrors(parsed.error.issues)), ...extra }
      if (!parsed.success || Object.keys(extra).length > 0) {
        setErrors(found)
        const first = ['name', 'totalCents'].find((key) => found[key])
        if (first) document.getElementById(first === 'name' ? 'nw-name' : 'nw-amount')?.focus()
        return
      }
      startTransition(async () => {
        const result = await createDebtAction(parsed.data)
        if (!result.ok) {
          setErrors(result.errors)
          if (result.message) toast.show({ message: result.message, icon: 'info' })
          return
        }
        toast.show({ message: 'Deuda guardada.', icon: 'check' })
        onClose()
      })
      return
    }

    const parsed = savingGoalSchema.safeParse({ name, targetCents: parseMoneyInput(amount), dueOn: dueOn || null })
    if (!parsed.success) {
      const found = fieldErrors(parsed.error.issues)
      setErrors(found)
      const first = ['name', 'targetCents'].find((key) => found[key])
      if (first) document.getElementById(first === 'name' ? 'nw-name' : 'nw-amount')?.focus()
      return
    }
    startTransition(async () => {
      const result = await createSavingAction(parsed.data)
      if (!result.ok) {
        setErrors(result.errors)
        if (result.message) toast.show({ message: result.message, icon: 'info' })
        return
      }
      toast.show({ message: 'Ahorro creado.', icon: 'check' })
      onClose()
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <header className={styles.head}>
        {/* El título real (para lectores de pantalla) lo pone el Drawer; este es solo visual */}
        <p className={styles.heading} aria-hidden="true">
          {isDebt ? 'Nueva deuda' : 'Nuevo ahorro'}
        </p>
        <button type="button" className={styles.close} aria-label="Cerrar sin guardar" onClick={onClose}>
          <LineIcon d={FINANCE_ICON.close} size={20} />
        </button>
      </header>

      <div className={styles.fields}>
        <Input
          id="nw-name"
          label={isDebt ? 'Nombre de la deuda' : 'Nombre del ahorro'}
          value={name}
          maxLength={60}
          autoComplete="off"
          autoFocus
          error={errors.name || undefined}
          onChange={(event) => {
            setName(event.target.value)
            if (event.target.value.trim()) clearError('name')
          }}
        />

        <Input
          id="nw-amount"
          label={isDebt ? 'Total que debes' : 'Meta'}
          value={amount}
          inputMode="decimal"
          autoComplete="off"
          placeholder={isDebt ? '$2,400' : '$15,000'}
          error={errors.totalCents || errors.targetCents || undefined}
          onChange={(event) => {
            setAmount(event.target.value)
            clearError('totalCents')
            clearError('targetCents')
          }}
        />

        {isDebt ? (
          <>
            <div className={styles.field}>
              <span className={styles.label} id="nw-kind-label">
                ¿A quién o qué?
              </span>
              <Segmented
                label="¿A quién o qué?"
                mode="radio"
                tone="raised"
                value={debtKind}
                onChange={setDebtKind}
                options={DEBT_KINDS.map((value) => ({ value, label: DEBT_KIND_LABEL[value] }))}
              />
            </div>
            <div className={styles.pair}>
              <div className={styles.pairWide}>
                <Input
                  id="nw-monthly"
                  label="Pago por mes"
                  labelExtra={<span className={styles.optional}>(opcional)</span>}
                  value={monthly}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="$500"
                  error={errors.monthlyPaymentCents || undefined}
                  onChange={(event) => {
                    setMonthly(event.target.value)
                    clearError('monthlyPaymentCents')
                  }}
                />
              </div>
              <div className={styles.pairWide}>
                <Input
                  id="nw-interest"
                  label="Interés anual"
                  labelExtra={<span className={styles.optional}>(opcional)</span>}
                  value={interest}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0%"
                  error={errors.annualInterestPct || undefined}
                  onChange={(event) => {
                    setInterest(event.target.value)
                    clearError('annualInterestPct')
                  }}
                />
              </div>
            </div>
            <span className={styles.hint}>Con el pago por mes te decimos cuándo toca el siguiente.</span>
          </>
        ) : (
          <>
            <Input
              id="nw-due"
              type="date"
              label="Fecha meta"
              labelExtra={<span className={styles.optional}>(opcional)</span>}
              value={dueOn}
              onChange={(event) => setDueOn(event.target.value)}
            />
            <span className={styles.hint}>Te digo cuánto apartar por mes para llegar a tiempo.</span>
          </>
        )}
      </div>

      <footer className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className={styles.submit} disabled={pending}>
          {isDebt ? 'Guardar deuda' : 'Crear ahorro'}
        </Button>
      </footer>
    </form>
  )
}
