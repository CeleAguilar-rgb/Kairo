'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'

import { startWritingAction } from '../story-actions'
import { WRITING_ICON } from '../writing-meta'

// "Escribir": abre la última página que tocaste para seguir donde te quedaste (o una nota en blanco si todavía no hay
// nada). Es un botón y no un enlace porque la página a la que lleva se decide en el servidor.
export function WriteButton() {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await startWritingAction()
      if (!result.ok || !result.id) {
        toast.show({ message: 'No se pudo abrir la página.', icon: 'info' })
        return
      }
      router.push(`/escritos/paginas/${result.id}`)
    })
  }

  return (
    <Button onClick={handleClick} disabled={pending}>
      <LineIcon d={WRITING_ICON.pencil} size={16} />
      Escribir
    </Button>
  )
}
