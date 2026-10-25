'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import { SectionPanel } from '@/components/layout/SectionPanel'

import type { WorldBundle } from '../../types'
import { statsOf } from '../../world-utils'
import { WorldHero } from '../WorldHero'

import styles from './WorldShell.module.css'
import { useWorld, WorldProvider } from './WorldContext'
import { WorldSidePanel } from './WorldSidePanel'
import { WorldTabBar } from './WorldTabBar'

// Todo lo de la página de un mundo que no cambia al pasar de pestaña (Escritos.dc.html): la ruta de migas, la
// portada con sus contadores, la barra de pestañas y el panel de la derecha. Vive en el layout del mundo: cada
// pestaña (una ruta) solo pinta su contenido debajo, leyendo el mismo mundo del contexto.
export function WorldShell({ bundle, children }: { bundle: WorldBundle; children: ReactNode }) {
  return (
    <WorldProvider bundle={bundle}>
      <ShellBody>{children}</ShellBody>
    </WorldProvider>
  )
}

function ShellBody({ children }: { children: ReactNode }) {
  const { bundle, open } = useWorld()
  return (
    <>
      <nav className={styles.crumbs} aria-label="Ruta">
        <Link href="/escritos/mundos" className={styles.crumbLink}>
          Escritos
        </Link>
        <span aria-hidden="true">/</span>
        <span className={styles.crumbHere} aria-current="page">
          {bundle.world.name}
        </span>
        <span className={styles.spacer} />
        <Link href={`/escritos/personajes/tabla?mundo=${bundle.world.id}`} className={styles.database}>
          Ver como base de datos
        </Link>
      </nav>
      <WorldHero name={bundle.world.name} description={bundle.world.description} stats={statsOf(bundle)} onEditStats={() => open({ kind: 'stats' })} />
      <WorldTabBar />
      <SectionPanel className={styles.panel}>{children}</SectionPanel>
      <WorldSidePanel />
    </>
  )
}
