'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'

import type { Task } from '../types'

type TaskDeleteDialogProps = {
  // La tarea que se quiere borrar; null = cerrado.
  task: Task | null
  onClose: () => void
  onConfirm: (task: Task) => void
}

// Borrar una tarea (docs/guides/design.md, patrón "Borrar", pantalla
// Borrar.dc.html): nombra la tarea y, si tiene, cuántas subtareas arrastra
// consigo a la papelera. El aviso que sigue el borrado ofrece "Deshacer".
export function TaskDeleteDialog({ task, onClose, onConfirm }: TaskDeleteDialogProps) {
  // shown conserva la última tarea mientras el diálogo se cierra con su
  // animación: si title cayera a null de golpe, el texto parpadearía en
  // blanco a media salida (mismo motivo que DeleteEventDialog en Agenda).
  const [last, setLast] = useState(task)
  if (task && task !== last) setLast(task)
  const shown = task ?? last
  const subtaskCount = shown?.subtasks.length ?? 0

  return (
    <Modal
      open={task !== null}
      onClose={onClose}
      tone="danger"
      title={shown ? `Borrar "${shown.title}"` : ''}
      description={
        subtaskCount > 0
          ? `Se va a la papelera junto con ${subtaskCount === 1 ? 'su subtarea' : `sus ${subtaskCount} subtareas`}. Puedes recuperarla durante 30 días.`
          : 'Se va a la papelera. Puedes recuperarla durante 30 días.'
      }
      icon={<LineIcon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" size={22} />}
      actions={
        <>
          <Button variant="danger" onClick={() => shown && onConfirm(shown)}>
            Borrar tarea
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    />
  )
}
