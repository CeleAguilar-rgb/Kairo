'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DoodlePicker, DoodleTray } from '@/components/layout/Doodles'
import { usePendingHref } from '@/components/layout/Navigation'
import { LineIcon } from '@/components/ui/Card'
import { PanelScrim } from '@/components/ui/PanelScrim'
import { useFocus } from '@/features/focus'
import { NOTIFICATIONS_TRIGGER, useShortcuts } from '@/features/shortcuts'
import type { Profile, UserSection } from '@/lib/account/api'
import { getAvatar } from '@/lib/account/avatars'
import { popover, PRESS, SPRING } from '@/lib/motion'
import { findActive, navModules, splitTabs } from './nav-modules'
import styles from './Topnav.module.css'

// 1500 segundos -> "25:00".
function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

type TopnavProps = { profile: Profile; sections: UserSection[] }

export function Topnav({ profile, sections }: TopnavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [doodlesOpen, setDoodlesOpen] = useState(false)
  // Cuántos de los tres botones (doodles, avisos, lupa; en ese orden) no caben y pasaron al menú del avatar.
  const [hiddenCount, setHiddenCount] = useState(0)
  const headerRef = useRef<HTMLElement>(null)
  const logoRef = useRef<HTMLAnchorElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const menuWrapRef = useRef<HTMLDivElement>(null)
  const avatar = getAvatar(profile.avatarPath)
  const pendingHref = usePendingHref()
  const shortcuts = useShortcuts()
  // El menú del avatar y la bandeja de doodles comparten el estado de los atajos: abrir uno cierra los demás.
  const menuOpen = shortcuts.open === 'menu'
  const doodleTrayOpen = shortcuts.open === 'doodles'
  const closePanels = shortcuts.close
  const focus = useFocus()
  const running = focus.progress.running
  const clock = formatClock(focus.timer.state.secondsLeft)

  // Clic afuera o Escape cierran el menú, como cualquier menú nativo.
  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!menuWrapRef.current?.contains(event.target as Node)) closePanels()
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closePanels()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen, closePanels])

  // Mide cuántos botones caben en una línea: logo + (reloj o chip, lupa, avisos, doodles, avatar). Si falta
  // espacio se esconden de a uno, en el orden de `data-order`: primero los doodles, luego los avisos y al
  // final la lupa. Un botón escondido sigue existiendo (queda fuera del flujo, invisible, con su ancho), así
  // siempre se sabe cuánto espacio pediría al volver. Solo aplica en teléfono: arriba de 720px la barra es
  // otra (el nav va en su propia fila).
  useLayoutEffect(() => {
    const header = headerRef.current
    const logo = logoRef.current
    const end = endRef.current
    if (!header || !logo || !end) return

    function measure() {
      if (!header || !logo || !end) return
      if (!window.matchMedia('(max-width: 720px)').matches) {
        setHiddenCount(0)
        return
      }
      const style = getComputedStyle(header)
      const available = header.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      const tools = end.querySelector<HTMLElement>('[data-tools]')
      const toolsGap = tools ? parseFloat(getComputedStyle(tools).columnGap) || 0 : 0
      // De los que primero se esconden a los que último: el espacio que libera cada uno.
      const byOrder = Array.from(header.querySelectorAll<HTMLElement>('[data-collapsible]'))
        .sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order))
        .map((el) => ({ order: Number(el.dataset.order), width: el.offsetWidth + toolsGap }))
      const currentlyHidden = Number(header.dataset.hidden ?? 0)
      // Lo escondido no cuenta en el ancho de la derecha: se suma para saber cuánto pediría todo a la vez.
      const hiddenWidth = byOrder.filter((item) => item.order <= currentlyHidden).reduce((sum, item) => sum + item.width, 0)
      const fullNeed = logo.offsetWidth + end.offsetWidth + hiddenWidth + (parseFloat(style.columnGap) || 0)

      let count = 0
      let need = fullNeed
      while (need > available && count < byOrder.length) {
        need -= byOrder[count].width
        count += 1
      }
      setHiddenCount(count)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    observer.observe(logo)
    observer.observe(end)
    return () => observer.disconnect()
  }, [running])

  const visibleModules = navModules(sections)
  // Las que no caben en la barra de abajo del teléfono: se listan en este menú (solo se ven en el teléfono).
  // Se arma con la lista del teléfono, que incluye Escuela y Recordatorios (ver navModules).
  const mobileModules = navModules(sections, { mobile: true })
  const { rest: restModules } = splitTabs(mobileModules)
  // Si ya se hizo clic en otra sección, la píldora viaja hacia ella sin esperar a que cargue.
  const activeId = findActive(mobileModules, pendingHref ?? pathname)

  async function handleSignOut() {
    // Import dinámico: el cliente de Supabase pesa ~65 KB y solo se necesita aquí, al
    // cerrar sesión. Así no se descarga en cada página del dashboard.
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    // scope 'local': por default signOut() cierra la sesión en TODOS los
    // dispositivos (ver perfil/PerfilTab.tsx para esa otra opción, explícita).
    await supabase.auth.signOut({ scope: 'local' })
    router.push('/entrar')
    router.refresh()
  }

  return (
    <header
      ref={headerRef}
      className={styles.header}
      data-hidden={hiddenCount}
      data-panel-open={menuOpen || doodleTrayOpen ? '' : undefined}
    >
      {/* Velo del teléfono para el menú del avatar y los doodles. Va aquí dentro (no en el layout) porque esos
          menús cuelgan de la barra, que es su propia capa: con la barra elevada (ver [data-panel-open] en el
          CSS) el velo y el menú quedan arriba de todo y el resto de la barra queda oscurecido debajo del velo. */}
      <PanelScrim open={menuOpen || doodleTrayOpen} onClose={closePanels} mobileOnly />
      <Link ref={logoRef} href="/" className={styles.logo} aria-label="Kairo, ir a Inicio">
        <motion.svg
          width="30"
          height="30"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
          whileHover={{ rotate: -25 }}
          transition={SPRING.pop}
        >
          <path
            d="M 50 16 A 34 34 0 1 1 16 50"
            style={{ stroke: 'var(--text)' }}
            strokeWidth="12"
            strokeLinecap="round"
          />
          <circle
            cx="26"
            cy="26"
            r="9"
            style={{ fill: 'var(--accent)', stroke: 'var(--text)' }}
            strokeWidth="3.5"
          />
        </motion.svg>
        kairo
      </Link>

      <nav className={styles.nav} aria-label="Secciones">
        {visibleModules.map((module) => {
          const active = module.id === activeId
          return (
            <Link
              key={module.id}
              href={module.href}
              className={[styles.navLink, active ? styles.navLinkActive : null]
                .filter(Boolean)
                .join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              {/* La píldora oscura es un solo elemento que "viaja": layoutId hace
                  que Motion la anime de la posición del enlace anterior al nuevo. */}
              {active ? (
                <motion.span
                  layoutId="topnav-active"
                  className={styles.activePill}
                  transition={SPRING.slide}
                />
              ) : null}
              <svg
                className={styles.navIcon}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {module.icon.map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>
              <span className={styles.navLabel}>{module.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Orden del canvas: nav · íconos · avatar. Íconos y avatar van juntos en la
          tercera columna, para que el nav quede centrado (ver .header). */}
      <div className={styles.end} ref={endRef}>
        <div className={styles.tools} data-tools="">
          {/* El pomodoro en el teléfono (arriba de 720px tiene su propia píldora abajo). Siempre hay un reloj;
              al correr se vuelve un chip con el tiempo que queda. Si no cabe, la lupa, los avisos y los
              doodles pasan al menú del avatar (ver .collapsible y .menuTools). */}
          <button
            type="button"
            className={[
              styles.iconButton,
              styles.focusButton,
              running ? styles.focusRunning : null,
              focus.expanded ? styles.iconButtonOpen : null,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={running ? `Pomodoro, quedan ${clock}` : 'Pomodoro'}
            aria-expanded={focus.expanded}
            onClick={() => focus.setExpanded(!focus.expanded)}
          >
            <LineIcon d={['M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M12 9v4l2.5 1.5', 'M9.5 2.5h5']} size={20} />
            {running ? <span className={styles.focusTime}>{clock}</span> : null}
          </button>
          <button
            type="button"
            className={[styles.iconButton, styles.collapsible].join(' ')}
            data-collapsible=""
            data-order="3"
            aria-label="Buscar"
            title="Buscar (Ctrl+K)"
            aria-expanded={shortcuts.open === 'search'}
            onClick={() => shortcuts.toggle('search')}
          >
            <LineIcon
              d={['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-3.5-3.5']}
              size={20}
            />
          </button>
          <button
            type="button"
            className={[
              styles.iconButton,
              shortcuts.open === 'notifications' ? styles.iconButtonOpen : null,
              styles.collapsible,
            ]
              .filter(Boolean)
              .join(' ')}
            data-collapsible=""
            data-order="2"
            aria-label={
              shortcuts.unread > 0
                ? `Avisos, ${shortcuts.unread} sin leer`
                : 'Avisos'
            }
            aria-expanded={shortcuts.open === 'notifications'}
            {...{ [NOTIFICATIONS_TRIGGER]: '' }}
            onClick={() => shortcuts.toggle('notifications')}
          >
            <LineIcon
              d={[
                'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9',
                'M10.3 21a1.94 1.94 0 0 0 3.4 0',
              ]}
              size={20}
            />
            {/* Atajos.dc.html: .badge, el punto de "hay avisos sin leer". */}
            {shortcuts.unread > 0 ? (
              <span className={styles.badge} aria-hidden="true" />
            ) : null}
          </button>
          <div className={styles.collapsible} data-collapsible="" data-order="1">
            <DoodleTray
              buttonClassName={styles.iconButton}
              openClassName={styles.iconButtonOpen}
              open={doodleTrayOpen}
              onToggle={() => shortcuts.toggle('doodles')}
              onClose={closePanels}
            />
          </div>
        </div>

        <div className={styles.menuWrap} ref={menuWrapRef}>
          <motion.button
            type="button"
            className={styles.avatarButton}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Menú de ${profile.name ?? 'tu cuenta'}`}
            onClick={() => shortcuts.toggle('menu')}
            whileHover={{ rotate: -8, scale: 1.04 }}
            whileTap={PRESS.icon}
            transition={SPRING.pop}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 40 40"
              fill="none"
              style={{ stroke: 'var(--text)' }}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={avatar.path} style={{ fill: avatar.fill }} />
            </svg>
          </motion.button>

          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                className={styles.menu}
                role="menu"
                variants={popover}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <div className={styles.menuHeader}>
                  <span className={styles.menuName}>{profile.name}</span>
                </div>
                {/* Lo que no cabe en la barra (ver el efecto de medida arriba): la lupa, los avisos y los doodles.
                    Cada uno se ve cuando su botón de la barra está escondido (data-hidden, ver Topnav.module.css). */}
                <div className={styles.menuTools}>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.menuItem}
                    data-order="3"
                    onClick={() => {
                      shortcuts.toggle('search')
                    }}
                  >
                    <svg
                      className={styles.menuIcon}
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" />
                      <path d="M20 20l-3.5-3.5" />
                    </svg>
                    Buscar
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.menuItem}
                    data-order="2"
                    onClick={() => {
                      shortcuts.toggle('notifications')
                    }}
                  >
                    <svg
                      className={styles.menuIcon}
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                    Avisos
                    {shortcuts.unread > 0 ? (
                      <span className={styles.menuDot} aria-label={`${shortcuts.unread} sin leer`} />
                    ) : null}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.menuItem}
                    data-order="1"
                    aria-expanded={doodlesOpen}
                    onClick={() => setDoodlesOpen((open) => !open)}
                  >
                    <svg
                      className={styles.menuIcon}
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3.5 20.5c1-3 2.2-4.6 4-5.6" />
                      <path d="M7.5 14.9L17.8 4.6a2 2 0 0 1 2.8 2.8L10.3 17.7l-3.6 1 .8-3.8z" />
                      <path d="M4 7c1.2-1.4 2.4-1.4 3 0s1.8 1.4 3 0" />
                    </svg>
                    Doodles
                  </button>
                  {doodlesOpen ? <DoodlePicker compact /> : null}
                  <div className={styles.menuDivider} />
                </div>
                {restModules.length > 0 ? (
                  <div className={styles.menuSections}>
                    {restModules.map((module) => (
                      <Link
                        key={module.id}
                        href={module.href}
                        role="menuitem"
                        className={[styles.menuItem, module.id === activeId ? styles.menuItemActive : null]
                          .filter(Boolean)
                          .join(' ')}
                        aria-current={module.id === activeId ? 'page' : undefined}
                        onClick={closePanels}
                      >
                        <svg
                          className={styles.menuIcon}
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          {module.icon.map((d) => (
                            <path key={d} d={d} />
                          ))}
                        </svg>
                        {module.label}
                      </Link>
                    ))}
                    <div className={styles.menuDivider} />
                  </div>
                ) : null}
                <Link
                  href="/perfil"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={closePanels}
                >
                  Mi perfil
                </Link>
                {/* Perfil.dc.html pone la Papelera en este mismo menú. */}
                <Link
                  href="/papelera"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={closePanels}
                >
                  Papelera
                </Link>
                <div className={styles.menuDivider} />
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItemDanger}
                  onClick={handleSignOut}
                >
                  Cerrar sesión
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
