'use client'

import { STORY_COLORS, STORY_KINDS, storySchema, type StoryColor, type StoryKind } from '@kairo/shared'
import { useState, useTransition, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { fieldErrors } from '@/lib/form-errors'

import { createStoryAction } from '../story-actions'
import { STORY_COLOR_LABEL, STORY_KIND_OPTION_LABEL } from '../writing-meta'

import { FormHead } from './FormHead'
import styles from './WritingForm.module.css'

type StoryDrawerProps = {
  open: boolean
  onClose: () => void
  // Avisa el id de lo que se acaba de crear, para dejarlo elegido en la lista.
  onCreated: (id: string) => void
}

// "Nueva historia o cuaderno" (EscritosInicio). El canvas solo trae el botón; el formulario usa el mismo panel
// lateral que el resto de la app.
export function StoryDrawer({ open, onClose, onCreated }: StoryDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title="Nueva historia o cuaderno" hideTitle>
      {/* Aparte a propósito: Drawer lo desmonta al cerrarse, así cada vez que se abre empieza limpio. */}
      <StoryForm onClose={onClose} onCreated={onCreated} />
    </Drawer>
  )
}

// "12,000" o "12 000" → 12000. Vacío es "sin meta".
function parseGoal(text: string): number | null {
  const digits = text.replace(/[\s,]/g, '')
  if (digits === '') return null
  return Number(digits)
}

function StoryForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<StoryKind>('story')
  const [summary, setSummary] = useState('')
  const [color, setColor] = useState<StoryColor>('ink')
  const [goal, setGoal] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const clearError = (field: string) => setErrors((current) => (current[field] ? { ...current, [field]: '' } : current))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = storySchema.safeParse({ title, kind, summary, color, wordGoal: parseGoal(goal) })
    if (!parsed.success) {
      const found = fieldErrors(parsed.error.issues)
      setErrors(found)
      const first = ['title', 'wordGoal'].find((key) => found[key])
      if (first) document.getElementById(`s-${first}`)?.focus()
      return
    }
    startTransition(async () => {
      const result = await createStoryAction(parsed.data)
      if (!result.ok) {
        setErrors(result.errors)
        if (result.message) toast.show({ message: result.message, icon: 'info' })
        return
      }
      toast.show({ message: kind === 'story' ? 'Historia creada.' : 'Cuaderno creado.', icon: 'check' })
      if (result.id) onCreated(result.id)
      onClose()
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormHead title="Nueva historia o cuaderno" onClose={onClose} />

      <div className={styles.fields}>
        <div className={styles.field}>
          <span className={styles.label}>Qué es</span>
          <Segmented label="Qué es" mode="radio" tone="raised" value={kind} onChange={setKind} options={STORY_KINDS.map((value) => ({ value, label: STORY_KIND_OPTION_LABEL[value] }))} />
          <span className={styles.hint}>{kind === 'story' ? 'Una historia se escribe por capítulos.' : 'Un cuaderno junta páginas sueltas: ideas, listas y referencias.'}</span>
        </div>

        <Input
          id="s-title"
          label="Título"
          value={title}
          maxLength={80}
          autoComplete="off"
          autoFocus
          error={errors.title || undefined}
          onChange={(event) => {
            setTitle(event.target.value)
            if (event.target.value.trim()) clearError('title')
          }}
        />

        <Textarea id="s-summary" label="De qué trata" value={summary} rows={3} maxLength={300} error={errors.summary || undefined} onChange={(event) => setSummary(event.target.value)} />

        <div className={styles.field}>
          <span className={styles.label}>Color del lomo</span>
          <Segmented label="Color del lomo" mode="radio" tone="raised" value={color} onChange={setColor} options={STORY_COLORS.map((value) => ({ value, label: STORY_COLOR_LABEL[value] }))} />
        </div>

        <Input
          id="s-wordGoal"
          label="Meta de palabras (opcional)"
          value={goal}
          inputMode="numeric"
          autoComplete="off"
          placeholder="30,000"
          hint="Con una meta, la historia muestra su avance."
          error={errors.wordGoal || undefined}
          onChange={(event) => {
            setGoal(event.target.value)
            clearError('wordGoal')
          }}
        />
      </div>

      <footer className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className={styles.submit} disabled={pending}>
          {kind === 'story' ? 'Crear historia' : 'Crear cuaderno'}
        </Button>
      </footer>
    </form>
  )
}
