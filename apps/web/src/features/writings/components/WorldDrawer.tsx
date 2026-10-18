'use client'

import { worldSchema } from '@kairo/shared'
import { useRouter } from 'next/navigation'
import { useState, useTransition, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { fieldErrors } from '@/lib/form-errors'

import { createWorldAction } from '../story-actions'

import { FormHead } from './FormHead'
import styles from './WritingForm.module.css'

// "Nuevo mundo" (EscritosInicio): el nombre y de qué trata. Las regiones, eras y especies se agregan después.
export function WorldDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} onClose={onClose} title="Nuevo mundo" hideTitle>
      {/* Aparte a propósito: Drawer lo desmonta al cerrarse, así cada vez que se abre empieza limpio. */}
      <WorldForm onClose={onClose} />
    </Drawer>
  )
}

function WorldForm({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = worldSchema.safeParse({ name, description })
    if (!parsed.success) {
      const found = fieldErrors(parsed.error.issues)
      setErrors(found)
      if (found.name) document.getElementById('w-name')?.focus()
      return
    }
    startTransition(async () => {
      const result = await createWorldAction(parsed.data)
      if (!result.ok) {
        setErrors(result.errors)
        if (result.message) toast.show({ message: result.message, icon: 'info' })
        return
      }
      toast.show({ message: 'Mundo creado.', icon: 'check' })
      onClose()
      if (result.id) router.push(`/escritos/mundos/${result.id}`)
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormHead title="Nuevo mundo" onClose={onClose} />

      <div className={styles.fields}>
        <Input
          id="w-name"
          label="Nombre"
          value={name}
          maxLength={60}
          autoComplete="off"
          autoFocus
          error={errors.name || undefined}
          onChange={(event) => {
            setName(event.target.value)
            if (errors.name) setErrors((current) => ({ ...current, name: '' }))
          }}
        />
        <Textarea
          id="w-description"
          label="De qué trata"
          value={description}
          rows={4}
          maxLength={400}
          hint="Regiones, eras, personajes y especies se agregan después."
          error={errors.description || undefined}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <footer className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className={styles.submit} disabled={pending}>
          Crear mundo
        </Button>
      </footer>
    </form>
  )
}
