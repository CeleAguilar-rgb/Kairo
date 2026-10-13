'use client'

import { loginSchema } from '@kairo/shared'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { createClient } from '@/lib/supabase/client'
import styles from './LoginForm.module.css'

type FieldErrors = { email?: string; password?: string }

const EASE = [0.3, 0.7, 0.2, 1] as const

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
}

function validate(email: string, password: string): FieldErrors {
  const result = loginSchema.safeParse({ email, password })
  if (result.success) return {}

  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]
    if (field === 'email' || field === 'password') errors[field] = issue.message
  }
  return errors
}

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [badLogin, setBadLogin] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // docs/guides/conventions.md: se valida al salir del campo, y el error se
  // quita en cuanto se corrige.
  function revalidateField(field: keyof FieldErrors, nextEmail: string, nextPassword: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      return { ...prev, [field]: validate(nextEmail, nextPassword)[field] }
    })
  }

  function handleBlur(field: keyof FieldErrors) {
    setFieldErrors((prev) => ({ ...prev, [field]: validate(email, password)[field] }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBadLogin(false)

    const errors = validate(email, password)
    if (errors.email || errors.password) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)

    if (error) {
      // Mensaje genérico a propósito: no decir si falló el correo o la contraseña.
      setBadLogin(true)
      return
    }

    // TODO: cuando exista código por correo (docs/history/current.md, siguiente
    // paso), esto redirige a /codigo en vez de /. El guard global todavía no
    // exige sesión verificada, así que por ahora entrar ya deja pasar.
    router.push('/')
    router.refresh()
  }

  return (
    <motion.form className={styles.form} onSubmit={handleSubmit} variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className={styles.heading}>
        <h1 className={styles.title}>Hola de nuevo</h1>
        <span className={styles.subtitle}>Entra con tu correo.</span>
      </motion.div>

      <AnimatePresence>
        {badLogin ? (
          <motion.div
            role="alert"
            className={styles.alert}
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              className={styles.alertIcon}
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            <span>El correo o la contraseña no coinciden.</span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div variants={item}>
        <Input
          id="email"
          type="email"
          label="Correo"
          value={email}
          autoFocus
          onChange={(event) => {
            const value = event.target.value
            setEmail(value)
            revalidateField('email', value, password)
          }}
          onBlur={() => handleBlur('email')}
          error={fieldErrors.email}
          autoComplete="email"
        />
      </motion.div>

      <motion.div variants={item}>
        <PasswordInput
          id="password"
          label="Contraseña"
          value={password}
          onChange={(event) => {
            const value = event.target.value
            setPassword(value)
            revalidateField('password', email, value)
          }}
          onBlur={() => handleBlur('password')}
          error={fieldErrors.password}
          autoComplete="current-password"
        />
      </motion.div>

      <motion.div variants={item}>
        <Button type="submit" disabled={submitting} className={styles.submit}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </motion.div>
    </motion.form>
  )
}
