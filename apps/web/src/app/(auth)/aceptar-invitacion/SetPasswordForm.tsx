'use client'

import { setPasswordSchema } from '@kairo/shared'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import styles from './SetPasswordForm.module.css'

type FieldErrors = { password?: string; confirmPassword?: string }

function validate(password: string, confirmPassword: string): FieldErrors {
  const result = setPasswordSchema.safeParse({ password, confirmPassword })
  if (result.success) return {}

  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]
    if (field === 'password' || field === 'confirmPassword') errors[field] = issue.message
  }
  return errors
}

export function SetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  // docs/guides/conventions.md: se valida al salir del campo, y el error se
  // quita en cuanto se corrige. revalidateField solo toca un error que ya
  // estaba visible; handleBlur siempre revisa, incluso la primera vez.
  function revalidateField(field: keyof FieldErrors, nextPassword: string, nextConfirmPassword: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      return { ...prev, [field]: validate(nextPassword, nextConfirmPassword)[field] }
    })
  }

  function handleBlur(field: keyof FieldErrors) {
    setFieldErrors((prev) => ({ ...prev, [field]: validate(password, confirmPassword)[field] }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(undefined)

    const errors = validate(password, confirmPassword)
    if (errors.password || errors.confirmPassword) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
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
        autoFocus
        onChange={(event) => {
          const value = event.target.value
          setPassword(value)
          revalidateField('password', value, confirmPassword)
          revalidateField('confirmPassword', value, confirmPassword)
        }}
        onBlur={() => handleBlur('password')}
        error={fieldErrors.password}
        autoComplete="new-password"
      />
      <Input
        id="confirmPassword"
        type="password"
        label="Confirma tu contraseña"
        value={confirmPassword}
        onChange={(event) => {
          const value = event.target.value
          setConfirmPassword(value)
          revalidateField('confirmPassword', password, value)
        }}
        onBlur={() => handleBlur('confirmPassword')}
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
