'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { LineIcon } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { popover } from '@/lib/motion'
import { focusFirst, useDialogFocus } from '@/lib/use-dialog-focus'
import { useMounted } from '@/lib/use-mounted'

import { markAllNotificationsReadAction, markNotificationReadAction } from '../notification-actions'
import { groupNotifications, notificationSub, SOURCE_ICON } from '../notification-text'
import { disablePush, enablePush, pushState, type PushResult, type PushState } from '../push'
import type { NotificationItem, NotificationsPanelData } from '../types'

import styles from './NotificationsPanel.module.css'

// La campana del Topnav lleva este atributo: picarla con el panel abierto no cuenta como "clic afuera" (si contara,
// el panel se cerraría y el mismo clic lo volvería a abrir).
export const NOTIFICATIONS_TRIGGER = 'data-notifications-trigger'

type NotificationsPanelProps = {
  open: boolean
  onClose: () => void
  // null mientras llega la primera carga.
  data: NotificationsPanelData | null
  onChange: (data: NotificationsPanelData) => void
  timeZone: string
}

// El centro de avisos (Atajos.dc.html): Hoy / Ayer / Antes, el punto morado en los que no se han leído, "Marcar todo
// como leído" y "Ver recordatorios". Picar un aviso lo marca leído y lleva a donde apunta.
export function NotificationsPanel({ open, onClose, data, onChange, timeZone }: NotificationsPanelProps) {
  const mounted = useMounted()
  const router = useRouter()
  const toast = useToast()
  const panelRef = useRef<HTMLElement>(null)
  useDialogFocus(open, panelRef, onClose)

  // Clic afuera cierra, como un menú.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Element
      if (panelRef.current?.contains(target) || target.closest(`[${NOTIFICATIONS_TRIGGER}]`)) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, onClose])

  // Marcar leído es optimista: el punto se va al instante y, si la API falla, vuelve con un aviso.
  async function openItem(item: NotificationItem) {
    onClose()
    if (!item.readAt && data) {
      const readAt = new Date().toISOString()
      onChange({ items: data.items.map((other) => (other.id === item.id ? { ...other, readAt } : other)), unread: Math.max(data.unread - 1, 0) })
      const result = await markNotificationReadAction(item.id)
      if (!result.ok) {
        onChange(data)
        toast.show({ message: result.message, icon: 'info' })
      }
    }
    if (item.link) router.push(item.link)
  }

  async function markAll() {
    if (!data || data.unread === 0) return
    const readAt = new Date().toISOString()
    onChange({ items: data.items.map((item) => ({ ...item, readAt: item.readAt ?? readAt })), unread: 0 })
    const result = await markAllNotificationsReadAction()
    if (!result.ok) {
      onChange(data)
      toast.show({ message: result.message, icon: 'info' })
    }
  }

  if (!mounted) return null
  const groups = data ? groupNotifications(data.items, timeZone) : []

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.section
          ref={panelRef}
          className={styles.panel}
          role="dialog"
          aria-label="Avisos"
          variants={popover}
          initial="hidden"
          animate="show"
          exit="exit"
          onAnimationComplete={() => focusFirst(panelRef.current)}
        >
          <div className={styles.header}>
            <h2 className={styles.title}>Avisos</h2>
            <button type="button" className={styles.textButton} onClick={markAll} disabled={!data || data.unread === 0}>
              Marcar todo como leído
            </button>
          </div>

          {data === null ? <p className={styles.empty}>Cargando tus avisos…</p> : null}
          {data && groups.length === 0 ? (
            <p className={styles.empty}>
              No tienes avisos todavía. Aquí llegan tus recordatorios cuando toca, los cobros de tus membresías y tu presupuesto.
            </p>
          ) : null}

          {groups.map((group) => (
            <div key={group.name} role="group" aria-label={group.name}>
              <span className={styles.groupName}>{group.name}</span>
              {group.items.map((item) => {
                const icon = SOURCE_ICON[item.sourceType]
                const unread = !item.readAt
                return (
                  <button key={item.id} type="button" className={unread ? styles.itemUnread : styles.item} onClick={() => openItem(item)}>
                    <span className={`${styles.icon} ${styles[icon.tone]}`}>
                      <LineIcon d={[icon.d]} size={16} />
                    </span>
                    <span className={styles.text}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      {item.body ? <span className={styles.itemBody}>{item.body}</span> : null}
                      <span className={styles.sub}>{notificationSub(item, timeZone)}</span>
                    </span>
                    {unread ? <span className={styles.unreadDot} aria-label="Sin leer" /> : null}
                  </button>
                )
              })}
            </div>
          ))}

          <PushToggle />

          <Link href="/recordatorios" className={styles.footer} onClick={onClose}>
            Ver recordatorios
          </Link>
        </motion.section>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

// Activar los avisos en este navegador. Solo sale si el navegador puede y la app tiene la llave pública.
function PushToggle() {
  const toast = useToast()
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    pushState().then((current) => {
      if (alive) setState(current)
    })
    return () => {
      alive = false
    }
  }, [])

  if (state === null || state === 'unsupported') return null

  async function toggle() {
    setBusy(true)
    const result: PushResult = state === 'on' ? await disablePush() : await enablePush()
    setBusy(false)
    if (!result.ok) {
      toast.show({ message: result.message, icon: 'info' })
      return
    }
    setState(result.state)
    if (result.state === 'on') toast.show({ message: 'Listo: te avisaremos en este navegador.', icon: 'check' })
  }

  return (
    <div className={styles.push}>
      <span className={styles.pushText}>
        Avisos en este navegador
        <span className={styles.sub}>
          {state === 'on'
            ? 'Te llegan aunque Kairo esté cerrado.'
            : state === 'denied'
              ? 'Los bloqueaste: actívalos desde el candado de la barra de direcciones.'
              : 'Para enterarte aunque Kairo esté cerrado.'}
        </span>
      </span>
      {state === 'denied' ? null : (
        <button type="button" className={styles.textButton} onClick={toggle} disabled={busy}>
          {state === 'on' ? 'Desactivar' : 'Activar'}
        </button>
      )}
    </div>
  )
}
