'use client'

import { CATEGORY_COLORS, FALLBACK_CATEGORY_ID, categorySchema, type CategoryColor } from '@kairo/shared'
import { motion } from 'motion/react'
import { useOptimistic, useState, useTransition, type FormEvent } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { Button } from '@/components/ui/Button'
import { Card, LineIcon } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/Progress'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
import { fieldErrors } from '@/lib/form-errors'
import { formatMoney } from '@/lib/money'
import { EASE_OUT, fadeUp, staggerList } from '@/lib/motion'

import { addCategoryAction, deleteCategoryAction, setBudgetAlertsAction, setBudgetLimitAction, adoptActualBudgetAction } from '../budget-actions'
import { CATEGORY_ICON_PATH, COLOR_LABEL, FINANCE_ICON } from '../finance-meta'
import { budgetRatio, budgetRowText, moneyInputText, monthTitle, parseMoneyInput } from '../finance-utils'
import { undoFinanceAction } from '../transaction-actions'
import type { BudgetRow, BudgetView as BudgetData } from '../types'

import { ColorSwatches } from './ColorSwatches'
import { ConfirmRow } from './ConfirmRow'
import colors from './FinanceColors.module.css'
import { FinanceToolbar } from './FinanceToolbar'
import styles from './BudgetView.module.css'

// La barra de cada renglón: tinta, rosada al llegar al 80% y roja al pasarse.
const BAR_TONE = { none: 'ink', ok: 'ink', warn: 'caution', over: 'danger' } as const

// Presupuesto (FinPresupuesto.dc.html): el límite mensual de cada categoría contra lo que va gastado este mes, "Así
// vas" en total, los avisos y qué hacer con el mes que viene. Lo gastado sale de los movimientos del mes.
export function BudgetView({ view }: { view: BudgetData }) {
  const toast = useToast()
  const calm = useCalmEntry()
  const [pending, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)

  // Los avisos cambian al instante y la preferencia se guarda atrás.
  const [alerts, setAlerts] = useOptimistic(view.alerts, (current, patch: Partial<BudgetData['alerts']>) => ({ ...current, ...patch }))

  const leftCents = view.plannedCents - view.spentCents
  const usedRatio = view.plannedCents > 0 ? Math.min(1, view.spentCents / view.plannedCents) : 0

  function toggleAlert(patch: Partial<BudgetData['alerts']>) {
    startTransition(async () => {
      setAlerts(patch)
      const result = await setBudgetAlertsAction({ ...view.alerts, ...patch })
      if (!result.ok) toast.show({ message: result.message ?? 'No se pudo guardar el aviso.', icon: 'info' })
    })
  }

  function adoptReal() {
    startTransition(async () => {
      const result = await adoptActualBudgetAction()
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo usar lo real.', icon: 'info' })
      const token = result.undoToken
      toast.show({ message: 'Los límites ahora son lo que gastaste este mes.', icon: 'check', onUndo: token ? () => void undoFinanceAction(token) : undefined })
    })
  }

  return (
    <>
      <FinanceToolbar>Presupuesto de {monthTitle(view.month)}</FinanceToolbar>

      <motion.div className={styles.cols} variants={staggerList(0.08, 0.1)} initial={calm ? false : 'hidden'} animate="show">
        <motion.div variants={fadeUp}>
          <Card as="section" className={styles.board} aria-labelledby="fin-budget">
            <div className={styles.head}>
              <div>
                <h2 id="fin-budget" className={styles.title}>
                  Por categoría
                </h2>
                <span className={styles.hint}>Escribe cuánto quieres gastar al mes en cada una.</span>
              </div>
              <span className={styles.total}>
                Total: <b>{formatMoney(view.spentCents)}</b> de <b>{formatMoney(view.plannedCents)}</b>
              </span>
            </div>

            <div className={styles.rows}>
              {view.rows.map((row) => (
                <CategoryRow
                  key={`${row.category.id}-${row.limitCents ?? 'none'}`}
                  row={row}
                  confirming={confirming === row.category.id}
                  onAskDelete={() => setConfirming(row.category.id)}
                  onCancel={() => setConfirming(null)}
                />
              ))}
            </div>

            {adding ? (
              <NewCategory onClose={() => setAdding(false)} />
            ) : (
              <button type="button" className={styles.addCategory} onClick={() => setAdding(true)}>
                <LineIcon d={FINANCE_ICON.plus} size={16} strokeWidth={2} />
                Nueva categoría
              </button>
            )}
          </Card>
        </motion.div>

        <motion.div className={styles.side} variants={fadeUp}>
          <Card as="section" tone="inverted" className={styles.summary} aria-labelledby="fin-left">
            <h2 id="fin-left" className={styles.title}>
              Así vas
            </h2>
            <span className={styles.big}>{leftCents >= 0 ? `${formatMoney(leftCents)} libres` : `Te pasaste ${formatMoney(-leftCents)}`}</span>
            <span className={styles.summarySub}>{view.progressText}</span>
            <div className={styles.track} role="progressbar" aria-label="Lo gastado de lo planeado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usedRatio * 100)}>
              <motion.div className={styles.fill} initial={{ scaleX: 0 }} animate={{ scaleX: usedRatio }} transition={{ duration: 0.7, ease: EASE_OUT }} />
            </div>
          </Card>

          <Card as="section" className={styles.panel} aria-labelledby="fin-alerts">
            <h2 id="fin-alerts" className={styles.title}>
              Avisos
            </h2>
            <div className={styles.toggleRow}>
              <Toggle checked={alerts.at80} onToggle={() => toggleAlert({ at80: !alerts.at80 })} label="Avisarme al llegar al 80%" />
              <span>Avisarme al llegar al 80%</span>
            </div>
            <div className={styles.toggleRow}>
              <Toggle checked={alerts.overLimit} onToggle={() => toggleAlert({ overLimit: !alerts.overLimit })} label="Avisarme si me paso" />
              <span>Avisarme si me paso</span>
            </div>
            <span className={styles.hint}>Los avisos llegan como Recordatorio y salen en Inicio.</span>
          </Card>

          <Card as="section" className={styles.panel} aria-labelledby="fin-next">
            <h2 id="fin-next" className={styles.title}>
              Para el próximo mes
            </h2>
            <span>Usa este presupuesto otra vez o empieza con lo que gastaste de verdad este mes.</span>
            <div className={styles.nextActions}>
              <Button variant="secondary" onClick={() => toast.show({ message: 'Tu presupuesto ya se repite cada mes.', icon: 'info' })}>
                Repetir
              </Button>
              <Button variant="secondary" onClick={adoptReal} disabled={pending}>
                Usar lo real
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </>
  )
}

type CategoryRowProps = {
  row: BudgetRow
  confirming: boolean
  onAskDelete: () => void
  onCancel: () => void
}

// Un renglón de categoría: su ícono, cuánto lleva, su barra y el límite que se escribe aquí mismo. El límite se
// guarda al salir del campo o con Enter; vacío = sin límite.
function CategoryRow({ row, confirming, onAskDelete, onCancel }: CategoryRowProps) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const { category } = row
  const [limit, setLimit] = useState(row.limitCents === null ? '' : moneyInputText(row.limitCents))
  const [error, setError] = useState('')
  const deletable = category.id !== FALLBACK_CATEGORY_ID

  function commit() {
    const trimmed = limit.trim()
    const limitCents = trimmed === '' ? null : parseMoneyInput(trimmed)
    if (trimmed !== '' && limitCents === null) return setError('Escribe un monto, como 1500.')
    if (limitCents === row.limitCents) return setError('')
    startTransition(async () => {
      const result = await setBudgetLimitAction({ categoryId: category.id, limitCents })
      if (!result.ok) return setError(result.errors.limitCents ?? result.message ?? 'No se pudo guardar el límite.')
      setError('')
    })
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id)
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo borrar la categoría.', icon: 'info' })
      const token = result.undoToken
      toast.show({ message: `Se borró "${category.name}"`, icon: 'trash', onUndo: token ? () => void undoFinanceAction(token) : undefined })
    })
  }

  return (
    <div className={styles.rowWrap}>
      <div className={styles.row}>
        <span className={[styles.tile, colors[`cat_${category.color}`]].join(' ')} aria-hidden="true">
          <LineIcon d={CATEGORY_ICON_PATH[category.icon]} />
        </span>

        <div className={styles.rowMain}>
          <div className={styles.rowHead}>
            <span className={styles.rowName}>{category.name}</span>
            <span className={[styles.rowText, row.state === 'over' ? styles.over : row.state === 'warn' ? styles.warn : null].filter(Boolean).join(' ')}>{budgetRowText(row)}</span>
          </div>
          <ProgressBar value={budgetRatio(row.spentCents, row.limitCents)} label={`Gastado en ${category.name}`} tone={BAR_TONE[row.state]} />
        </div>

        <div className={styles.limitWrap}>
          <label className={styles.srOnly} htmlFor={`limit-${category.id}`}>
            Presupuesto de {category.name}
          </label>
          <input
            id={`limit-${category.id}`}
            className={[styles.limit, error ? styles.limitInvalid : null].filter(Boolean).join(' ')}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Sin límite"
            value={limit}
            disabled={pending}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `limit-${category.id}-error` : undefined}
            onChange={(event) => {
              setLimit(event.target.value)
              setError('')
            }}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }}
          />
        </div>

        {deletable ? (
          <button type="button" className={styles.trash} aria-label={`Borrar categoría ${category.name}`} onClick={onAskDelete}>
            <LineIcon d={FINANCE_ICON.trash} size={16} />
          </button>
        ) : (
          <span className={styles.noTrash} />
        )}
      </div>

      {error ? (
        <span id={`limit-${category.id}-error`} className={styles.error}>
          {error}
        </span>
      ) : null}
      {confirming ? (
        <ConfirmRow text={`¿Borrar "${category.name}"? Sus gastos de este mes pasan a "Otros".`} confirmLabel="Borrar categoría" disabled={pending} onCancel={onCancel} onConfirm={remove} />
      ) : null}
    </div>
  )
}

// El formulario de categoría nueva, dentro de la misma tarjeta: nombre y color; el límite se escribe después en su fila.
function NewCategory({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [color, setColor] = useState<CategoryColor>('lavender')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = categorySchema.safeParse({ name, color })
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues))
    startTransition(async () => {
      const result = await addCategoryAction(parsed.data)
      if (!result.ok) return setErrors(result.errors.name ? result.errors : { name: result.message ?? 'No se pudo agregar la categoría.' })
      toast.show({ message: `Categoría "${parsed.data.name}" agregada.`, icon: 'check' })
      onClose()
    })
  }

  return (
    <form className={styles.newCategory} onSubmit={handleSubmit} noValidate>
      <Input
        id="nc-name"
        label="Nombre de la categoría"
        value={name}
        maxLength={30}
        autoComplete="off"
        autoFocus
        error={errors.name || undefined}
        onChange={(event) => {
          setName(event.target.value)
          setErrors({})
        }}
      />
      <div className={styles.newField}>
        <span className={styles.newLabel}>Color</span>
        <ColorSwatches label="Color" palette="cat" value={color} onChange={setColor} options={CATEGORY_COLORS.map((value) => ({ value, label: COLOR_LABEL[value] }))} />
      </div>
      <div className={styles.newActions}>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          Agregar categoría
        </Button>
      </div>
    </form>
  )
}
