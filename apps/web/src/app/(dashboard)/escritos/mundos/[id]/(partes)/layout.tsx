import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { PageEnter } from '@/components/layout/PageEnter'
import { SectionPanel } from '@/components/layout/SectionPanel'
import { WorldHero, WorldTabs } from '@/features/writings'
import { getWorldHeader } from '@/features/writings/api'

import styles from './layout.module.css'

type WorldLayoutProps = {
  children: ReactNode
  params: Promise<{ id: string }>
}

// La portada y las pestañas son comunes a Resumen, Línea del tiempo, Regiones, Historias, Personajes y Especies: viven
// en el layout, así que al cambiar de pestaña solo cambia el contenido de abajo y la portada no se vuelve a pintar.
// Ese contenido va en un SectionPanel: al elegir una pestaña lo atenúa si tarda y lo cambia con un fundido corto,
// para que se sienta la misma pantalla (decisión #28).
export default async function WorldLayout({ children, params }: WorldLayoutProps) {
  const { id } = await params
  const world = await getWorldHeader(id)
  if (!world) notFound()

  return (
    <PageEnter>
      <main className={styles.wrap}>
        <nav className={styles.crumbs} aria-label="Ruta">
          <Link href="/escritos/mundos" className={styles.crumbLink}>
            Escritos
          </Link>
          <span aria-hidden="true">/</span>
          <span className={styles.crumbHere} aria-current="page">
            {world.name}
          </span>
          <span className={styles.spacer} />
          <Link href={`/escritos/personajes/tabla?mundo=${world.id}`} className={styles.database}>
            Ver personajes como base de datos
          </Link>
        </nav>
        <WorldHero world={world} />
        <WorldTabs worldId={world.id} />
        <SectionPanel className={styles.panel}>{children}</SectionPanel>
      </main>
    </PageEnter>
  )
}
