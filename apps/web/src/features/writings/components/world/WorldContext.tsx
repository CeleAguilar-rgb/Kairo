'use client'

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useMemo, useState, useTransition, type ReactNode } from 'react'

import { useToast } from '@/components/ui/Toast'

import type { WritingActionResult } from '../../action-result'
import { undoWritingAction } from '../../page-actions'
import type { Entry, WorldBundle } from '../../types'
import { entryIndex, worldHref, type Mention } from '../../world-utils'

// Qué está abierto en el panel de la derecha (Escritos.dc.html, `drawer`): una ficha, una era, un evento, una
// plantilla, las pestañas o los contadores. `edit` dice si la ficha o el evento abren ya en modo editar.
export type WorldPanel =
  | { kind: 'entry'; id: string; edit: boolean }
  | { kind: 'era'; id: string }
  | { kind: 'event'; id: string; edit: boolean }
  | { kind: 'template'; id: string; backEntryId: string | null }
  | { kind: 'tabs' }
  | { kind: 'stats' }

type RunOptions = {
  // Qué decir cuando sale bien (sin mensaje no se avisa nada: guardar un campo no necesita aviso).
  success?: string
  // Lo que se dice si falla y la acción no trae su propio mensaje.
  fallback?: string
  // Qué hacer con el id de lo que se creó (abrirlo en el panel, por ejemplo).
  onDone?: (result: Extract<WritingActionResult, { ok: true }>) => void
}

type WorldApi = {
  bundle: WorldBundle
  // Cada ficha del mundo por id (personajes y notas), para resolver vínculos sin recorrer listas.
  index: Map<string, Entry>
  base: string
  panel: WorldPanel | null
  open: (panel: WorldPanel) => void
  close: () => void
  // Abre lo que nombra una mención o un chip: una ficha o un evento en el panel, una historia en su pestaña.
  go: (target: Mention['target']) => void
  // Corre una acción de servidor y avisa: si falla, el motivo; si se puede deshacer, el aviso con "Deshacer".
  run: (action: () => Promise<WritingActionResult>, options?: RunOptions) => void
  pending: boolean
}

const WorldContext = createContext<WorldApi | null>(null)

export function useWorld() {
  const context = useContext(WorldContext)
  if (!context) throw new Error('useWorld() necesita estar dentro de <WorldProvider>.')
  return context
}

// El mundo vive en el layout (WorldShell): cada pestaña, el panel lateral y la página completa leen de aquí, así
// abrir una ficha desde el Resumen o desde Regiones es lo mismo, y cambiar de pestaña no cierra el panel. Después
// de guardar, la acción revalida `/escritos` y Next vuelve a mandar el layout con el mundo nuevo: el contexto se
// actualiza solo, sin pedir nada a mano.
export function WorldProvider({ bundle, children }: { bundle: WorldBundle; children: ReactNode }) {
  const router = useRouter()
  const toast = useToast()
  const [panel, setPanel] = useState<WorldPanel | null>(null)
  const [pending, startTransition] = useTransition()
  const index = useMemo(() => entryIndex(bundle), [bundle])
  const base = worldHref(bundle.world.id)

  const run = useCallback(
    (action: () => Promise<WritingActionResult>, options: RunOptions = {}) => {
      startTransition(async () => {
        const result = await action()
        if (!result.ok) {
          toast.show({ message: result.message ?? Object.values(result.errors)[0] ?? options.fallback ?? 'No se pudo guardar.', icon: 'info' })
          return
        }
        options.onDone?.(result)
        const token = result.undoToken
        if (token) {
          toast.show({
            message: options.success ?? 'Se borró.',
            icon: 'trash',
            onUndo: () => startTransition(async () => void (await undoWritingAction(token))),
          })
        } else if (options.success) {
          toast.show({ message: options.success, icon: 'check' })
        }
      })
    },
    [toast],
  )

  const go = useCallback(
    (target: Mention['target']) => {
      if (target.kind === 'entry') setPanel({ kind: 'entry', id: target.id, edit: false })
      else if (target.kind === 'event') setPanel({ kind: 'event', id: target.id, edit: false })
      else {
        setPanel(null)
        router.push(`${base}/historias?historia=${target.id}`)
      }
    },
    [base, router],
  )

  const value = useMemo<WorldApi>(
    () => ({ bundle, index, base, panel, open: setPanel, close: () => setPanel(null), go, run, pending }),
    [bundle, index, base, panel, go, run, pending],
  )

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>
}

// Lo que todavía no está guardado en un campo de texto: se guarda al salir del campo (blur) y solo si cambió.
// Así escribir no dispara una petición por letra, y lo que se ve nunca se queda atrás de lo que hay en la base.
export function useDraft(saved: string, save: (value: string) => void) {
  const [draft, setDraft] = useState(saved)
  const [lastSaved, setLastSaved] = useState(saved)
  // Si el valor guardado cambió por fuera (otra pestaña, "Deshacer"), lo que se ve se pone al día.
  if (saved !== lastSaved) {
    setLastSaved(saved)
    setDraft(saved)
  }
  const commit = () => {
    if (draft.trim() !== saved.trim()) save(draft.trim())
  }
  return { value: draft, onChange: setDraft, commit }
}
