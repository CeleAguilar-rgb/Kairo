'use client'

import { requestPasswordResetSchema } from '@kairo/shared'
import { motion } from 'motion/react'
import { EASE_OUT } from '@/lib/motion'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import styles from './RecoverForm.module.css'


const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
}

const RESEND_COOLDOWN_MS = 60_000

function validateEmail(email: string): string | undefined {
  const result = requestPasswordResetSchema.safeParse({ email })
  return result.success ? undefined : result.error.issues[0]?.message
}

// No se revisa el error ni se distingue si el correo existe: siempre se pasa a
// "revisa tu correo" para no dejar adivinar qué correos tienen cuenta.
async function sendResetEmail(email: string) {
  const supabase = createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/confirmar?next=/restablecer-contrasena`,
  })
}

export function RecoverForm() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [resendDisabled, setResendDisabled] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const error = validateEmail(email)
    if (error) {
      setEmailError(error)
      return
    }

    setSubmitting(true)
    await sendResetEmail(email)
    setSubmitting(false)
    setSent(true)
  }

  function handleResend() {
    setResendDisabled(true)
    sendResetEmail(email)
    setTimeout(() => setResendDisabled(false), RESEND_COOLDOWN_MS)
  }

  if (sent) {
    return (
      <motion.section
        className={styles.sent}
        variants={container}
        initial="hidden"
        animate="show"
        aria-labelledby="sent-title"
      >
        <motion.svg
          variants={item}
          width="96"
          height="80"
          viewBox="0 0 96 80"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={styles.sentIcon}
        >
          <path d="M10 22h62v44H10z" style={{ fill: 'var(--accent-soft)' }} />
          <path d="M10 24l31 22 31-22" />
          <path d="M78 14l4-8M84 22l8-2M80 30l6 4" strokeWidth="2" />
        </motion.svg>
        <motion.h1 variants={item} id="sent-title" className={styles.title}>
          Revisa tu correo
        </motion.h1>
        <motion.span variants={item} className={styles.subtitle}>
          Te mandamos un enlace para cambiar tu contraseña a {email.trim()}. Ábrelo desde este dispositivo.
        </motion.span>
        <motion.span variants={item} className={styles.hint}>
          ¿No llegó? Revisa en spam o promociones.
        </motion.span>
        <motion.div variants={item} className={styles.actions}>
          <Button variant="ghost" type="button" onClick={handleResend} disabled={resendDisabled}>
            {resendDisabled ? 'Reenviado · espera 60 s' : 'Reenviar correo'}
          </Button>
          <Link href="/entrar" className={styles.useOther}>
            Usar otro correo
          </Link>
        </motion.div>
      </motion.section>
    )
  }

  return (
    <motion.form className={styles.form} onSubmit={handleSubmit} variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <Link href="/entrar" className={styles.back}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Volver
        </Link>
      </motion.div>

      <motion.div variants={item} className={styles.heading}>
        <h1 className={styles.title}>¿Olvidaste tu contraseña?</h1>
        <span className={styles.subtitle}>Te mandamos un enlace para crear una nueva.</span>
      </motion.div>

      <motion.div variants={item}>
        <Input
          id="email"
          type="email"
          label="Correo"
          value={email}
          autoFocus
          onChange={(event) => {
            setEmail(event.target.value)
            if (emailError) setEmailError(validateEmail(event.target.value))
          }}
          onBlur={() => setEmailError(validateEmail(email))}
          error={emailError}
          autoComplete="email"
        />
      </motion.div>

      <motion.div variants={item}>
        <Button type="submit" disabled={submitting} className={styles.submit}>
          {submitting ? 'Enviando…' : 'Enviar enlace'}
        </Button>
      </motion.div>
    </motion.form>
  )
}
