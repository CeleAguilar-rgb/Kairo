'use client'

import { isSafeLinkHref } from '@kairo/shared'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

import styles from './ImageDialog.module.css'

type LinkDialogProps = {
  // El enlace que ya tenía el texto elegido ('' si no tenía).
  initialHref: string
  onClose: () => void
  // Aplica el enlace; null lo quita.
  onApply: (href: string | null) => void
}

// "ejemplo.com" → "https://ejemplo.com": quien escribe un enlace no siempre escribe el https://.
export function normalizeHref(value: string): string {
  const text = value.trim()
  if (/^(https?:\/\/|mailto:|\/)/i.test(text)) return text
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return `mailto:${text}`
  return /^[^\s/]+\.[^\s/]+/.test(text) ? `https://${text}` : text
}

// Para poner o quitar un enlace al texto elegido (Ctrl+K). Solo se aceptan direcciones http(s), correos y páginas de
// la propia app: lo mismo que valida el servidor al guardar la página.
export function LinkDialog({ initialHref, onClose, onApply }: LinkDialogProps) {
  const [href, setHref] = useState(initialHref)
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const value = normalizeHref(href)
    if (!value) {
      setError('Pega o escribe el enlace.')
      return
    }
    if (!isSafeLinkHref(value)) {
      setError('El enlace tiene que ser una dirección web (https://…), un correo o una página de Kairo.')
      return
    }
    onApply(value)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initialHref ? 'Cambiar el enlace' : 'Agregar un enlace'}
      actions={
        <>
          {initialHref ? (
            <Button variant="ghost" onClick={() => onApply(null)}>
              Quitar enlace
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="link-dialog-form">
            Guardar enlace
          </Button>
        </>
      }
    >
      <form id="link-dialog-form" className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input
          id="link-href"
          label="Dirección del enlace"
          value={href}
          placeholder="https://…"
          autoComplete="off"
          autoFocus
          error={error || undefined}
          onChange={(event) => {
            setHref(event.target.value)
            setError('')
          }}
        />
      </form>
    </Modal>
  )
}
