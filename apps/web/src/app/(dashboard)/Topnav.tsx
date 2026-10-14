'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Profile, UserSection } from '@/lib/account/api'
import { getAvatar } from '@/lib/account/avatars'
import { modules } from '@/lib/modules/registry'
import { createClient } from '@/lib/supabase/client'
import styles from './Topnav.module.css'

type TopnavProps = { profile: Profile; sections: UserSection[] }

export function Topnav({ profile, sections }: TopnavProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuWrapRef = useRef<HTMLDivElement>(null)
  const avatar = getAvatar(profile.avatarPath)

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
    .filter((module) => sectionByModule.get(module.id)?.enabled)
    .sort(
      (a, b) =>
        (sectionByModule.get(a.id)?.position ?? 0) -
        (sectionByModule.get(b.id)?.position ?? 0),
    )

  async function handleSignOut() {
    const supabase = createClient()
    // scope 'local': por default signOut() cierra la sesión en TODOS los
    // dispositivos (ver perfil/PerfilTab.tsx para esa otra opción, explícita).
    await supabase.auth.signOut({ scope: 'local' })
    router.push('/entrar')
    router.refresh()
  }

  return (
    <header className={styles.header}>
      <span className={styles.logo}>
        <svg
          width="30"
          height="30"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
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
        </svg>
        kairo
      </span>

      <nav className={styles.nav} aria-label="Secciones">
        {visibleModules.map((module) => (
          <Link key={module.id} href={module.href} className={styles.navLink}>
            <svg
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
            <span>{module.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.menuWrap} ref={menuWrapRef}>
        <button
          type="button"
          className={styles.avatarButton}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Menú de ${profile.name ?? 'tu cuenta'}`}
          onClick={() => setMenuOpen((open) => !open)}
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
        </button>

        {menuOpen ? (
          <div className={styles.menu} role="menu">
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
          </div>
        ) : null}
      </div>
    </header>
  )
}
