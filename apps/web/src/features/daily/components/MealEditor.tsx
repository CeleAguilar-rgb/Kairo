'use client'

import { mealSlotSchema } from '@kairo/shared'
import { useState, useTransition, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
import { formatLongDay, formatWallTime, type IsoDate } from '@/lib/dates'
import { fieldErrors } from '@/lib/form-errors'

import { removeMealAction, repeatMealWeekdaysAction, saveMealAction } from '../meal-actions'
import { MEAL_LABEL, type Meal, type MealPlan } from '../types'

import styles from './MealEditor.module.css'

type MealEditorProps = {
  date: IsoDate
  meal: Meal
  plan: MealPlan | null
  // La hora y el bloque de la rutina a los que corresponde esta comida.
  slot: { time: string; blockTitle: string }
  hourFormat: '12h' | '24h'
}

// El panel de la derecha del Menú: el platillo de un día y una comida. Va con `key` por (día, comida), así
// que al cambiar de espacio el formulario empieza con lo de ese espacio sin limpiar nada a mano.
export function MealEditor({ date, meal, plan, slot, hourFormat }: MealEditorProps) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [dish, setDish] = useState(plan?.dish ?? '')
  const [prep, setPrep] = useState(plan?.prep ?? false)
  const [note, setNote] = useState(plan?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const input = { date, meal, dish, prep, note }

  function validated() {
    const parsed = mealSlotSchema.safeParse(input)
    if (parsed.success) {
      setErrors({})
      return parsed.data
    }
    setErrors(fieldErrors(parsed.error.issues))
    return null
  }

  function handleSave(event: FormEvent) {
    event.preventDefault()
    const data = validated()
    if (!data) return
    startTransition(async () => {
      const result = await saveMealAction(data)
      if (!result.ok) return setErrors(result.errors)
      toast.show({ message: data.dish ? 'Platillo guardado.' : 'Espacio vaciado.', icon: 'check' })
    })
  }

  function handleRepeat() {
    const data = validated()
    if (!data) return
    if (!data.dish) return setErrors({ dish: 'Escribe el platillo para repetirlo.' })
    startTransition(async () => {
      const result = await repeatMealWeekdaysAction(data)
      if (!result.ok) return setErrors(result.errors)
      toast.show({ message: `"${data.dish}" se repite de lunes a viernes.`, icon: 'check' })
    })
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeMealAction({ date, meal })
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo quitar el platillo.', icon: 'info' })
      toast.show({ message: 'Platillo quitado.', icon: 'trash' })
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSave} noValidate aria-labelledby="meal-editor-title">
      <div className={styles.head}>
        <span className={styles.day}>{formatLongDay(date)}</span>
        <h2 id="meal-editor-title" className={styles.title}>
          {MEAL_LABEL[meal]}
        </h2>
      </div>

      <Input
        id="meal-dish"
        label="Platillo"
        value={dish}
        maxLength={80}
        autoComplete="off"
        placeholder="Ej. Tinga con arroz"
        error={errors.dish}
        onChange={(event) => setDish(event.target.value)}
      />

      <div className={styles.switch}>
        <Toggle checked={prep} onToggle={() => setPrep((current) => !current)} label="Es meal prep" />
        <span>Es meal prep</span>
      </div>

      <Input
        id="meal-note"
        label="Nota"
        labelExtra={<span className={styles.optional}>(opcional)</span>}
        value={note}
        maxLength={120}
        autoComplete="off"
        placeholder="Ej. Descongelar la noche anterior"
        error={errors.note}
        onChange={(event) => setNote(event.target.value)}
      />

      <div className={styles.actions}>
        <Button type="submit" disabled={pending}>
          Guardar
        </Button>
        <Button variant="ghost" onClick={handleRepeat} disabled={pending}>
          Repetir de lunes a viernes
        </Button>
        {plan ? (
          <Button variant="plain" className={styles.remove} onClick={handleRemove} disabled={pending}>
            Quitar platillo
          </Button>
        ) : null}
      </div>

      <div className={styles.note}>
        <LineIcon d={['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v5l3 2']} size={16} />
        <span>
          Sale en tu bloque &quot;{slot.blockTitle}&quot; de las {formatWallTime(slot.time, hourFormat)} ese día, y en el aviso si no lo marcas.
        </span>
      </div>
    </form>
  )
}
