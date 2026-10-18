'use client'

import { Button } from '@/components/ui/Button'

import styles from './ConfirmRow.module.css'

type ConfirmRowProps = {
  // Lo que se pregunta: '¿Borrar el ahorro "Laptop nueva"? Va a la papelera.'
  text: string
  confirmLabel: string
  disabled?: boolean
  onCancel: () => void
  onConfirm: () => void
}

// La confirmación de borrar que aparece en la misma tarjeta (patrón de borrar de docs/guides/design.md):
// pregunta, y deja "Cancelar" o confirmar. Después del borrado el aviso trae "Deshacer".
export function ConfirmRow({ text, confirmLabel, disabled = false, onCancel, onConfirm }: ConfirmRowProps) {
  return (
    <div role="alertdialog" aria-label={text} className={styles.confirm}>
      <span className={styles.text}>{text}</span>
      <Button variant="ghost" className={styles.cancel} onClick={onCancel}>
        Cancelar
      </Button>
      <Button variant="danger" className={styles.confirmButton} onClick={onConfirm} disabled={disabled}>
        {confirmLabel}
      </Button>
    </div>
  )
}
