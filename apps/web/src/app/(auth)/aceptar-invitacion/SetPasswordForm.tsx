'use client'

import { setPasswordSchema } from '@kairo/shared'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import styles from './SetPasswordForm.module.css'

type FieldErrors = { password?: string; confirmPassword?: string }

export function SetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(undefined)

    const result = setPasswordSchema.safeParse({ password, confirmPassword })
    if (!result.success) {
      const errors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0]
        if (field === 'password' || field === 'confirmPassword') errors[field] = issue.message
      }
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: result.data.password })
    setSubmitting(false)

    if (error) {
      setFormError('No pudimos guardar tu contraseña. Intenta de nuevo.')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        id="password"
        type="password"
        label="Contraseña"
        hint="Mínimo 8 caracteres."
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
        autoComplete="new-password"
      />
      <Input
        id="confirmPassword"
        type="password"
        label="Confirma tu contraseña"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        error={fieldErrors.confirmPassword}
        autoComplete="new-password"
      />
      {formError ? <p className={styles.error}>{formError}</p> : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Guardando…' : 'Guardar y entrar'}
      </Button>
    </form>
  )
}
