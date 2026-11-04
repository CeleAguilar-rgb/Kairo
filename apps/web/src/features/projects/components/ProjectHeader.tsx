'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

import { usePendingHref } from '@/components/layout/Navigation'
import { PageHeading } from '@/components/layout/PageHeading'
import { Button } from '@/components/ui/Button'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { LineIcon } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { restoreFromTrashAction, trashProjectAction } from '@/features/trash'
import { EASE_OUT, popover } from '@/lib/motion'

import { PROJECT_KIND_LABEL, PROJECT_STATUS_LABEL, type ProjectKind, type ProjectStatus } from '../types'

import styles from './ProjectHeader.module.css'

type ProjectHeaderProps = {
  id: string
  name: string
  kind: ProjectKind
  status: ProjectStatus
  // "Desde el 7 de octubre" (null si el proyecto no tiene fecha de inicio).
  startedText: string | null
  // Los títulos de sus tareas: el diálogo de borrar los nombra, porque se van con él (Borrar.dc.html).
  taskTitles: string[]
}

// La cabecera del proyecto (Proyecto.dc.html): nombre a mano, sus tres etiquetas (tipo, estado
// y desde cuándo) y las dos acciones. Vive en el layout del proyecto, así que no se vuelve a
// animar al cambiar de pestaña (Resumen, Sprints, Archivos).
export function ProjectHeader({ id, name, kind, status, startedText, taskTitles }: ProjectHeaderProps) {
  // Las etiquetas y los dos botones son solo de Resumen (Proyecto.dc.html); en
  // Sprints y Archivos el canvas reduce esta cabecera al título nada más,
  // porque cada pestaña trae su propio subtítulo y botón (ProjectSprints,
  // ProjectFiles). `usePendingHref` cuenta la pestaña elegida aunque la
  // página todavía no haya llegado, igual que en ProjectTabs.
  const base = `/proyectos/${id}`
  const pathname = usePathname()
  const target = usePendingHref() ?? pathname
  const isSummary = target === base
  const router = useRouter()
  const toast = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  // Clic afuera o Escape cierran el menú "···" (igual que el del avatar en Topnav).
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const count = taskTitles.length
  const tasksText = count === 1 ? '1 tarea' : `${count} tareas`

  // Borrar.dc.html: a la papelera con todo lo suyo, de vuelta a la galería y un aviso con "Deshacer".
  function confirmDelete() {
    startTransition(async () => {
      const result = await trashProjectAction(id)
      if (!result.ok) {
        toast.show({ message: result.message, icon: 'info' })
        return
      }
      setConfirming(false)
      router.push('/proyectos')
      toast.show({
        message: `${name}${count === 0 ? '' : ` y ${tasksText}`} se movieron a la papelera.`,
        icon: 'trash',
        onUndo: async () => {
          const undone = await restoreFromTrashAction({ kind: 'project', id })
          if (undone.ok) router.push(base)
          else toast.show({ message: undone.message, icon: 'info' })
        },
      })
    })
  }

  return (
    <section className={styles.header}>
      <PageHeading title={name} squiggleWidth={280}>
        {isSummary ? (
          <motion.div
            className={styles.chips}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.14 }}
          >
            <span className={[styles.chip, styles.kind].join(' ')}>{PROJECT_KIND_LABEL[kind]}</span>
            <span className={[styles.chip, styles[`status_${status}`]].join(' ')}>
              <span className={styles.dot} />
              {PROJECT_STATUS_LABEL[status]}
            </span>
            {startedText ? <span className={[styles.chip, styles.since].join(' ')}>{startedText}</span> : null}
          </motion.div>
        ) : null}
      </PageHeading>

      {isSummary ? (
        <motion.div
          className={styles.actions}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.1 }}
        >
          <Link href={`/tareas?proyecto=${id}`} className={styles.boardLink}>
            <LineIcon
              d={[
                'M4.5 4h2A1.5 1.5 0 0 1 8 5.5v13A1.5 1.5 0 0 1 6.5 20h-2A1.5 1.5 0 0 1 3 18.5v-13A1.5 1.5 0 0 1 4.5 4z',
                'M11.5 4h2A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-2A1.5 1.5 0 0 1 10 12.5v-7A1.5 1.5 0 0 1 11.5 4z',
                'M18.5 4h1A1.5 1.5 0 0 1 21 5.5v10a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-10A1.5 1.5 0 0 1 18.5 4z',
              ]}
              size={16}
              strokeWidth={2}
            />
            Ver en el tablero
          </Link>
          <ButtonLink href={`/proyectos/${id}/editar`}>
            <LineIcon d={['M14 4l6 6L9 21H3v-6L14 4z', 'M12 6l6 6']} size={16} />
            Editar proyecto
          </ButtonLink>
          <div className={styles.moreWrap} ref={menuRef}>
            <button
              type="button"
              className={styles.more}
              aria-label="Más opciones"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <LineIcon d={['M5 12h.01', 'M12 12h.01', 'M19 12h.01']} size={20} strokeWidth={3.4} />
            </button>
            <AnimatePresence>
              {menuOpen ? (
                <motion.div className={styles.menu} role="menu" variants={popover} initial="hidden" animate="show" exit="exit">
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.menuItemDanger}
                    onClick={() => {
                      setMenuOpen(false)
                      setConfirming(true)
                    }}
                  >
                    <LineIcon d={['M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13']} size={16} />
                    Borrar proyecto
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        tone="danger"
        title={`¿Borrar ${name}${count === 0 ? '' : count === 1 ? ' y su tarea' : ` y sus ${count} tareas`}?`}
        description="Se moverán a la papelera. Podrás restaurarlos durante 30 días; después se borran para siempre."
        icon={<LineIcon d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" size={22} />}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={pending}>
              {count === 0 ? 'Borrar proyecto' : `Borrar proyecto y ${tasksText}`}
            </Button>
          </>
        }
      >
        {count > 0 ? (
          <ul className={styles.taskList}>
            {taskTitles.map((title, index) => (
              <li key={`${title}-${index}`} className={styles.taskItem}>
                <span className={styles.taskBox} aria-hidden="true" />
                {title}
              </li>
            ))}
          </ul>
        ) : null}
      </Modal>
    </section>
  )
}
