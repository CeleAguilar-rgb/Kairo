'use client'

import type { ModuleId } from '@kairo/shared'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Toggle } from '@/components/ui/Toggle'
import { updateSections } from '@/lib/account/actions'
import type { UserSection } from '@/lib/account/api'
import { MODULE_CATALOG } from '@/lib/modules/catalog'
import styles from './SeccionesTab.module.css'

type SeccionesTabProps = { sections: UserSection[] }

const catalogById = new Map(MODULE_CATALOG.map((entry) => [entry.id, entry]))
const catalogIds = new Set(MODULE_CATALOG.map((entry) => entry.id))

export function SeccionesTab({ sections }: SeccionesTabProps) {
  const sectionById = new Map(
    sections.map((section) => [section.section, section]),
  )

  const [order, setOrder] = useState<ModuleId[]>(() =>
    MODULE_CATALOG.map((entry) => entry.id).sort(
      (a, b) =>
        (sectionById.get(a)?.position ?? 0) -
        (sectionById.get(b)?.position ?? 0),
    ),
  )
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      MODULE_CATALOG.map((entry) => [
        entry.id,
        sectionById.get(entry.id)?.enabled ?? false,
      ]),
    ),
  )
  const [error, setError] = useState<string>()
  const [isPending, startTransition] = useTransition()
  // El módulo que se acaba de apagar: dispara el aviso de abajo. Se limpia en
  // cuanto se prende cualquier módulo, igual que en el canvas (Perfil.dc.html:238).
  const [lastOff, setLastOff] = useState<ModuleId | null>(null)

  // 'home', 'reminders' y 'focus' no están en MODULE_CATALOG (no se eligen
  // aquí), pero sí tienen fila en user_sections. updateSections reemplaza la
  // tabla completa, así que hay que re-mandar esas filas tal cual o se
  // borrarían.
  const otherSections = sections.filter(
    (section) => !catalogIds.has(section.section),
  )

  function persist(
    nextOrder: ModuleId[],
    nextEnabled: Record<string, boolean>,
  ) {
    const payload = [
      ...otherSections.map((section) => ({
        section: section.section,
        enabled: section.enabled,
        position: section.position,
      })),
      ...nextOrder.map((id, index) => ({
        section: id,
        enabled: nextEnabled[id] ?? false,
        position: otherSections.length + index,
      })),
    ]

    startTransition(async () => {
      const result = await updateSections({ sections: payload })
      setError(result?.error)
    })
  }

  function handleToggle(id: ModuleId) {
    const wasEnabled = !!enabled[id]
    const next = { ...enabled, [id]: !wasEnabled }
    setEnabled(next)
    setLastOff(wasEnabled ? id : null)
    persist(order, next)
  }

  function handleMove(id: ModuleId, direction: -1 | 1) {
    const index = order.indexOf(id)
    const target = index + direction
    if (target < 0 || target >= order.length) return

    const next = [...order]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setOrder(next)
    persist(next, enabled)
  }

  // Cuántos módulos encendidos hay hasta cada posición de `order` (inclusive);
  // de ahí sale qué filas muestran "Abajo en celular" (las primeras 4).
  const onCountUpTo = order.reduce<number[]>((acc, id) => {
    const previous = acc.length ? acc[acc.length - 1] : 0
    return [...acc, previous + (enabled[id] ? 1 : 0)]
  }, [])

  return (
    <Card aria-labelledby="secciones-tab-title">
      <div className={styles.heading}>
        <h2 id="secciones-tab-title" className={styles.title}>
          Mis secciones
        </h2>
        <span className={styles.hint}>
          Prende las que usas y ordénalas como quieres verlas en el menú.
        </span>
      </div>

      <div className={styles.list}>
        {order.map((id, index) => {
          const entry = catalogById.get(id)
          if (!entry) return null

          // Los primeros 4 módulos encendidos, en el orden de la lista, son
          // los que entrarán al menú de abajo del celular (fase posterior).
          const showsOnPhone = !!enabled[id] && onCountUpTo[index] <= 4

          return (
            <div key={id} className={styles.row}>
              <div className={styles.orderButtons}>
                <Button
                  variant="plain"
                  iconOnly
                  aria-label={`Subir ${entry.name}`}
                  disabled={index === 0}
                  onClick={() => handleMove(id, -1)}
                >
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
                    <path d="M6 15l6-6 6 6" />
                  </svg>
                </Button>
                <Button
                  variant="plain"
                  iconOnly
                  aria-label={`Bajar ${entry.name}`}
                  disabled={index === order.length - 1}
                  onClick={() => handleMove(id, 1)}
                >
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
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </Button>
              </div>

              <span className={enabled[id] ? styles.iconOn : styles.iconOff}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={entry.icon} />
                </svg>
              </span>

              <div className={styles.info}>
                <span className={enabled[id] ? styles.name : styles.nameOff}>
                  {entry.name}
                </span>
                <span className={styles.description}>{entry.description}</span>
              </div>

              {showsOnPhone ? (
                <span className={styles.badge}>Abajo en celular</span>
              ) : null}

              <Toggle
                checked={!!enabled[id]}
                onToggle={() => handleToggle(id)}
                label={`Mostrar ${entry.name}`}
              />
            </div>
          )
        })}
      </div>

      {lastOff ? (
        <span className={styles.offNote} role="status">
          {catalogById.get(lastOff)?.name} se ocultó del menú y del Inicio. Tus
          datos no se borran: si la vuelves a prender, todo sigue ahí.
        </span>
      ) : null}

      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : isPending ? (
        <span className={styles.hint} role="status">
          Guardando…
        </span>
      ) : null}
    </Card>
  )
}
