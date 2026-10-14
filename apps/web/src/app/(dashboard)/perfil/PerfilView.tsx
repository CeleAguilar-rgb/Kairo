'use client'

import { useState } from 'react'
import type { Profile, UserSection } from '@/lib/account/api'
import { PerfilTab } from './PerfilTab'
import styles from './PerfilView.module.css'
import { SeccionesTab } from './SeccionesTab'

type Tab = 'perfil' | 'secciones'

// Solo estas dos pestañas por ahora: Conexiones, Preferencias y Cuenta
// quedan para el siguiente incremento (varias tocan cosas de fase posterior
// como el modo oscuro, o necesitan su propia infraestructura).
const TABS: { id: Tab; name: string; icon: string }[] = [
  {
    id: 'perfil',
    name: 'Mi perfil',
    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6',
  },
  {
    id: 'secciones',
    name: 'Mis secciones',
    icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  },
]

type PerfilViewProps = { profile: Profile; sections: UserSection[] }

export function PerfilView({ profile, sections }: PerfilViewProps) {
  const [tab, setTab] = useState<Tab>('perfil')

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Mi perfil</h1>

      <div className={styles.layout}>
        <nav className={styles.side} aria-label="Ajustes">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={tab === item.id ? 'page' : undefined}
              className={tab === item.id ? styles.tabActive : styles.tab}
              onClick={() => setTab(item.id)}
            >
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
                <path d={item.icon} />
              </svg>
              {item.name}
            </button>
          ))}
        </nav>

        <div className={styles.panel}>
          {tab === 'perfil' ? (
            <PerfilTab profile={profile} />
          ) : (
            <SeccionesTab sections={sections} />
          )}
        </div>
      </div>
    </div>
  )
}
