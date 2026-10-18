'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { DoodleTray } from '@/components/layout/Doodles'
import { usePendingHref } from '@/components/layout/Navigation'
import { LineIcon } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import type { Profile, UserSection } from '@/lib/account/api'
import { getAvatar } from '@/lib/account/avatars'
import { popover, SPRING } from '@/lib/motion'
import { modules, type ModuleManifest } from '@/lib/modules/registry'
import styles from './Topnav.module.css'

type TopnavProps = { profile: Profile; sections: UserSection[] }

export function Topnav({ profile, sections }: TopnavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuWrapRef = useRef<HTMLDivElement>(null)
  const avatar = getAvatar(profile.avatarPath)
  const toast = useToast()
  const pendingHref = usePendingHref()

  // Clic afuera o Escape cierran el menú, como cualquier menú nativo.
  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!menuWrapRef.current?.contains(event.target as Node))
        setMenuOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const sectionByModule = new Map(
    sections.map((section) => [section.section, section]),
  )
  const visibleModules = modules
    .filter((module) => module.inNav !== false)
    .filter(
      (module) =>
        module.id === 'home' || sectionByModule.get(module.id)?.enabled,
    )
    .sort(
      (a, b) =>
        (sectionByModule.get(a.id)?.position ?? -1) -
        (sectionByModule.get(b.id)?.position ?? -1),
    )
  // Si ya se hizo clic en otra sección, la píldora viaja hacia ella sin esperar a que cargue.
  const activeId = findActive(visibleModules, pendingHref ?? pathname)

  // Buscar y avisos llegan con la pantalla Atajos; mientras, que el botón responda algo.
  function soon(what: string) {
    toast.show({ message: `${what} llega pronto.`, icon: 'info' })
  }

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
    <header className={styles.header}>
      <Link href="/" className={styles.logo} aria-label="Kairo, ir a Inicio">
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
      <div className={styles.end}>
        <div className={styles.tools}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Buscar"
            onClick={() => soon('La búsqueda (Ctrl+K)')}
          >
            <LineIcon
              d={['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-3.5-3.5']}
              size={20}
            />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Notificaciones"
            onClick={() => soon('El panel de avisos')}
          >
            <LineIcon
              d={[
                'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9',
                'M10.3 21a1.94 1.94 0 0 0 3.4 0',
              ]}
              size={20}
            />
          </button>
          <DoodleTray
            buttonClassName={styles.iconButton}
            openClassName={styles.iconButtonOpen}
          />
        </div>

        <div className={styles.menuWrap} ref={menuWrapRef}>
          <motion.button
            type="button"
            className={styles.avatarButton}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Menú de ${profile.name ?? 'tu cuenta'}`}
            onClick={() => setMenuOpen((open) => !open)}
            whileHover={{ rotate: -8, scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
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
                <Link
                  href="/perfil"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => setMenuOpen(false)}
                >
                  Mi perfil
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

// '/' solo es Inicio exacto; las demás rutas cuentan también sus subrutas
// (/proyectos/abc sigue marcando Proyectos).
function findActive(list: ModuleManifest[], pathname: string) {
  const match = list.find((module) =>
    module.href === '/'
      ? pathname === '/'
      : pathname === module.href || pathname.startsWith(`${module.href}/`),
  )
  return match?.id ?? null
}
