'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { updateProfile } from '@/lib/account/actions'
import type { Profile } from '@/lib/account/api'
import { AVATARS } from '@/lib/account/avatars'
import { createClient } from '@/lib/supabase/client'
import styles from './PerfilTab.module.css'

type PerfilTabProps = { profile: Profile }

export function PerfilTab({ profile }: PerfilTabProps) {
  const router = useRouter()
  const [name, setName] = useState(profile.name ?? '')
  const [avatarId, setAvatarId] = useState(profile.avatarPath ?? 'star')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [saved, setSaved] = useState(false)
  const [revoking, setRevoking] = useState(false)

  // scope 'global' (el default de signOut()) revoca la sesión en todos los
  // dispositivos, incluido este: por eso también mandamos a /entrar aquí
  // mismo en vez de solo refrescar la página.
  async function handleRevokeAllSessions() {
    setRevoking(true)
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/entrar')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    setError(undefined)
    setSaved(false)
    const result = await updateProfile({
      name: name.trim(),
      avatarPath: avatarId,
    })
    setSubmitting(false)

    if (result?.error) setError(result.error)
    else setSaved(true)
  }

  return (
    <Card aria-labelledby="perfil-tab-title">
      <h2 id="perfil-tab-title" className={styles.title}>
        Tu perfil
      </h2>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <span className={styles.label} id="perfil-av-label">
            Elige tu doodle
          </span>
          <div
            className={styles.avatars}
            role="radiogroup"
            aria-labelledby="perfil-av-label"
          >
            {AVATARS.map((avatar) => {
              const isSelected = avatarId === avatar.id
              return (
                <button
                  key={avatar.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={avatar.name}
                  className={isSelected ? styles.avatarSelected : styles.avatar}
                  onClick={() => setAvatarId(avatar.id)}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 40 40"
                    fill="none"
                    style={{ stroke: 'var(--text)' }}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={avatar.path} style={{ fill: avatar.fill }} />
                  </svg>
                </button>
              )
            })}
          </div>
        </div>

        <Input
          id="perfil-nombre"
          label="Nombre"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        {error ? (
          <span className={styles.error} role="alert">
            {error}
          </span>
        ) : null}
        {saved ? (
          <span className={styles.saved} role="status">
            Cambios guardados.
          </span>
        ) : null}

        <Button type="submit" disabled={submitting} className={styles.submit}>
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>

      <div className={styles.security}>
        <div className={styles.securityText}>
          <span className={styles.label}>Seguridad</span>
          <span className={styles.securityHint}>
            Cierra tu sesión en todos los dispositivos, incluido este.
          </span>
        </div>
        <Button
          variant="danger"
          disabled={revoking}
          onClick={handleRevokeAllSessions}
        >
          {revoking ? 'Cerrando…' : 'Cerrar todas las sesiones'}
        </Button>
      </div>
    </Card>
  )
}
