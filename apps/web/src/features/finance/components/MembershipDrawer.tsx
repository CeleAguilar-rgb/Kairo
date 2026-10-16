'use client'

import { CARD_COLORS, CARD_KINDS, MEMBERSHIP_CADENCES, cardSchema, membershipSchema, type CardColor, type CardKind, type MembershipCadence } from '@kairo/shared'
import { useState, useTransition, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
import { dayOfMonth, weekdayOf, type IsoDate } from '@/lib/dates'
import { fieldErrors } from '@/lib/form-errors'

import { CADENCE_LABEL, CARD_COLOR_LABEL, FINANCE_ICON, MONTH_NAMES, WEEKDAY_NAMES } from '../finance-meta'
import { cardLabel, moneyInputText, parseMoneyInput, parseWholeInput } from '../finance-utils'
import { createCardAction, deleteMembershipAction, saveMembershipAction } from '../membership-actions'
import { undoFinanceAction } from '../transaction-actions'
import { CARD_KIND_LABEL, type Membership, type PaymentCard } from '../types'

import { ColorSwatches } from './ColorSwatches'
import { ConfirmRow } from './ConfirmRow'
import styles from './FinanceForm.module.css'

// Lo que se abre en el panel: una membresía (nueva si `membership` es null) o una tarjeta nueva.
export type MembershipPanel = { type: 'membership'; membership: Membership | null } | { type: 'card' } | null

type MembershipDrawerProps = {
  panel: MembershipPanel
  cards: PaymentCard[]
  today: IsoDate
  onClose: () => void
}

export function MembershipDrawer({ panel, cards, today, onClose }: MembershipDrawerProps) {
  const title = !panel ? '' : panel.type === 'card' ? 'Nueva tarjeta' : panel.membership ? 'Editar membresía' : 'Nueva membresía'
  return (
    <Drawer open={panel !== null} onClose={onClose} title={title} hideTitle>
      {/* Aparte a propósito: Drawer lo desmonta al cerrarse, así cada vez que se abre empieza limpio. */}
      {panel?.type === 'membership' ? <MembershipForm key={panel.membership?.id ?? 'new'} membership={panel.membership} cards={cards} today={today} onClose={onClose} /> : null}
      {panel?.type === 'card' ? <CardForm onClose={onClose} /> : null}
    </Drawer>
  )
}

function FormHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <header className={styles.head}>
      {/* El título real (para lectores de pantalla) lo pone el Drawer; este es solo visual */}
      <p className={styles.heading} aria-hidden="true">
        {title}
      </p>
      <button type="button" className={styles.close} aria-label="Cerrar sin guardar" onClick={onClose}>
        <LineIcon d={FINANCE_ICON.close} size={20} />
      </button>
    </header>
  )
}

function MembershipForm({ membership, cards, today, onClose }: { membership: Membership | null; cards: PaymentCard[]; today: IsoDate; onClose: () => void }) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const editing = membership !== null

  const [name, setName] = useState(membership?.name ?? '')
  const [amount, setAmount] = useState(membership ? moneyInputText(membership.amountCents) : '')
  const [cadence, setCadence] = useState<MembershipCadence>(membership?.cadence ?? 'monthly')
  const [chargeDay, setChargeDay] = useState(String(membership?.chargeDay ?? dayOfMonth(today)))
  const [chargeMonth, setChargeMonth] = useState(String(membership?.chargeMonth ?? Number(today.slice(5, 7))))
  const [chargeWeekday, setChargeWeekday] = useState(String(membership?.chargeWeekday ?? weekdayOf(today)))
  const [cardId, setCardId] = useState(membership ? (membership.card?.id ?? '') : (cards[0]?.id ?? ''))
  const [notify, setNotify] = useState(membership?.notify ?? true)
  const [paused, setPaused] = useState(membership?.status === 'paused')
  const [confirming, setConfirming] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const clearError = (field: string) => setErrors((current) => (current[field] ? { ...current, [field]: '' } : current))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = membershipSchema.safeParse({
      name,
      amountCents: parseMoneyInput(amount),
      cadence,
      chargeDay: cadence === 'weekly' ? null : parseWholeInput(chargeDay),
      chargeMonth: cadence === 'yearly' ? Number(chargeMonth) : null,
      chargeWeekday: cadence === 'weekly' ? Number(chargeWeekday) : null,
      cardId: cardId || null,
      notify,
      status: paused ? 'paused' : 'active',
    })
    if (!parsed.success) {
      const found = fieldErrors(parsed.error.issues)
      setErrors(found)
      const first = ['name', 'amountCents', 'chargeDay'].find((key) => found[key])
      if (first) document.getElementById(`m-${first}`)?.focus()
      return
    }
    startTransition(async () => {
      const result = await saveMembershipAction(membership?.id ?? null, parsed.data)
      if (!result.ok) {
        setErrors(result.errors)
        if (result.message) toast.show({ message: result.message, icon: 'info' })
        return
      }
      toast.show({ message: editing ? 'Membresía actualizada.' : 'Membresía guardada.', icon: 'check' })
      onClose()
    })
  }

  function handleDelete() {
    if (!membership) return
    startTransition(async () => {
      const result = await deleteMembershipAction(membership.id)
      if (!result.ok) {
        setConfirming(false)
        toast.show({ message: result.message ?? 'No se pudo borrar la membresía.', icon: 'info' })
        return
      }
      const token = result.undoToken
      toast.show({ message: `Se borró "${membership.name}"`, icon: 'trash', onUndo: token ? () => void undoFinanceAction(token) : undefined })
      onClose()
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormHead title={editing ? 'Editar membresía' : 'Nueva membresía'} onClose={onClose} />

      <div className={styles.fields}>
        <Input
          id="m-name"
          label="Servicio"
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

        <div className={styles.pair}>
          <div className={styles.pairWide}>
            <Input
              id="m-amountCents"
              label="Monto"
              value={amount}
              inputMode="decimal"
              autoComplete="off"
              placeholder="$89"
              error={errors.amountCents || undefined}
              onChange={(event) => {
                setAmount(event.target.value)
                clearError('amountCents')
              }}
            />
          </div>
          {cadence === 'weekly' ? (
            <div className={styles.pairWide}>
              <Select
                id="m-weekday"
                label="Día de cobro"
                value={chargeWeekday}
                onChange={(event) => setChargeWeekday(event.target.value)}
                options={WEEKDAY_NAMES.map((day, index) => ({ value: String(index), label: day }))}
              />
            </div>
          ) : (
            <div className={styles.pairNarrow}>
              <Input
                id="m-chargeDay"
                label="Día de cobro"
                type="number"
                min={1}
                max={31}
                value={chargeDay}
                error={errors.chargeDay || undefined}
                onChange={(event) => {
                  setChargeDay(event.target.value)
                  clearError('chargeDay')
                }}
              />
            </div>
          )}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Cada cuánto</span>
          <Segmented
            label="Cada cuánto"
            mode="radio"
            tone="raised"
            value={cadence}
            onChange={setCadence}
            options={MEMBERSHIP_CADENCES.map((value) => ({ value, label: CADENCE_LABEL[value] }))}
          />
        </div>

        {cadence === 'yearly' ? (
          <Select
            id="m-month"
            label="Mes del cobro"
            value={chargeMonth}
            onChange={(event) => setChargeMonth(event.target.value)}
            options={MONTH_NAMES.map((month, index) => ({ value: String(index + 1), label: month }))}
          />
        ) : null}

        <Select
          id="m-card"
          label="Se paga con"
          value={cardId}
          onChange={(event) => {
            setCardId(event.target.value)
            clearError('cardId')
          }}
          options={[...cards.map((card) => ({ value: card.id, label: cardLabel(card) })), { value: '', label: 'Sin tarjeta' }]}
        />
        {errors.cardId ? <span className={styles.error}>{errors.cardId}</span> : null}

        <div className={styles.repeat}>
          <Toggle checked={notify} onToggle={() => setNotify((current) => !current)} label="Avisarme un día antes" />
          <span>Avisarme un día antes del cobro</span>
        </div>

        {editing ? (
          <div className={styles.repeat}>
            <Toggle checked={paused} onToggle={() => setPaused((current) => !current)} label="Pausada" />
            <span>Pausada (no cuenta ni se cobra mientras tanto)</span>
          </div>
        ) : null}

        <span className={styles.hint}>Sale en Próximos pagos y en la Agenda el día del cobro.</span>

        {confirming && membership ? (
          <ConfirmRow text={`¿Borrar la membresía "${membership.name}"? Va a la papelera.`} confirmLabel="Borrar" disabled={pending} onCancel={() => setConfirming(false)} onConfirm={handleDelete} />
        ) : null}
      </div>

      <footer className={styles.actions}>
        {editing ? (
          <button type="button" className={styles.trash} aria-label="Borrar membresía" onClick={() => setConfirming(true)}>
            <LineIcon d={FINANCE_ICON.trash} />
          </button>
        ) : null}
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className={styles.submit} disabled={pending}>
          {editing ? 'Guardar cambios' : 'Guardar membresía'}
        </Button>
      </footer>
    </form>
  )
}

function CardForm({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [kind, setKind] = useState<CardKind>('debit')
  const [last4, setLast4] = useState('')
  const [cutDay, setCutDay] = useState('5')
  const [dueDay, setDueDay] = useState('25')
  const [color, setColor] = useState<CardColor>('lavender')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const clearError = (field: string) => setErrors((current) => (current[field] ? { ...current, [field]: '' } : current))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = cardSchema.safeParse({
      name,
      kind,
      last4: kind === 'cash' ? '' : last4,
      color,
      cutDay: kind === 'credit' ? parseWholeInput(cutDay) : null,
      dueDay: kind === 'credit' ? parseWholeInput(dueDay) : null,
    })
    if (!parsed.success) {
      const found = fieldErrors(parsed.error.issues)
      setErrors(found)
      const first = ['name', 'last4'].find((key) => found[key])
      if (first) document.getElementById(first === 'name' ? 'c-name' : 'c-last4')?.focus()
      return
    }
    startTransition(async () => {
      const result = await createCardAction(parsed.data)
      if (!result.ok) {
        setErrors(result.errors)
        if (result.message) toast.show({ message: result.message, icon: 'info' })
        return
      }
      toast.show({ message: 'Tarjeta guardada.', icon: 'check' })
      onClose()
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormHead title="Nueva tarjeta" onClose={onClose} />

      <div className={styles.fields}>
        <Input
          id="c-name"
          label="Nombre"
          value={name}
          maxLength={40}
          autoComplete="off"
          autoFocus
          error={errors.name || undefined}
          onChange={(event) => {
            setName(event.target.value)
            if (event.target.value.trim()) clearError('name')
          }}
        />

        <div className={styles.field}>
          <span className={styles.label}>Tipo</span>
          <Segmented label="Tipo" mode="radio" tone="raised" value={kind} onChange={setKind} options={CARD_KINDS.map((value) => ({ value, label: CARD_KIND_LABEL[value] }))} />
        </div>

        {kind !== 'cash' ? (
          <Input
            id="c-last4"
            label="Últimos 4 números"
            value={last4}
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            hint="Solo los últimos 4, nunca el número completo."
            error={errors.last4 || undefined}
            onChange={(event) => {
              setLast4(event.target.value.replace(/\D/g, ''))
              clearError('last4')
            }}
          />
        ) : null}

        {kind === 'credit' ? (
          <div className={styles.pair}>
            <div className={styles.pairWide}>
              <Input
                id="c-cut"
                label="Día de corte"
                type="number"
                min={1}
                max={31}
                value={cutDay}
                error={errors.cutDay || undefined}
                onChange={(event) => {
                  setCutDay(event.target.value)
                  clearError('cutDay')
                }}
              />
            </div>
            <div className={styles.pairWide}>
              <Input
                id="c-due"
                label="Día límite de pago"
                type="number"
                min={1}
                max={31}
                value={dueDay}
                error={errors.dueDay || undefined}
                onChange={(event) => {
                  setDueDay(event.target.value)
                  clearError('dueDay')
                }}
              />
            </div>
          </div>
        ) : null}

        <div className={styles.field}>
          <span className={styles.label}>Color</span>
          <ColorSwatches label="Color" palette="card" value={color} onChange={setColor} options={CARD_COLORS.map((value) => ({ value, label: CARD_COLOR_LABEL[value] }))} />
        </div>
      </div>

      <footer className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className={styles.submit} disabled={pending}>
          Guardar tarjeta
        </Button>
      </footer>
    </form>
  )
}
