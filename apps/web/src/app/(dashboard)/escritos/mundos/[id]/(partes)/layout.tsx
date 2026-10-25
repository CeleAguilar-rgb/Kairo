import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { PageEnter } from '@/components/layout/PageEnter'
import { WorldShell } from '@/features/writings'
import { getWorldBundle } from '@/features/writings/api'

import styles from './layout.module.css'

type WorldLayoutProps = {
  children: ReactNode
  params: Promise<{ id: string }>
}

// La página de un mundo (Escritos.dc.html). El mundo entero se pide UNA vez aquí y WorldShell lo reparte por
// contexto: la portada, las pestañas, el panel de la derecha y el contenido de cada pestaña leen de lo mismo. Al
// cambiar de pestaña solo cambia lo de abajo; al guardar algo, la acción revalida y llega el mundo nuevo.
export default async function WorldLayout({ children, params }: WorldLayoutProps) {
  const { id } = await params
  const bundle = await getWorldBundle(id)
  if (!bundle) notFound()

  return (
    <PageEnter>
      <main className={styles.wrap}>
        <WorldShell bundle={bundle}>{children}</WorldShell>
      </main>
    </PageEnter>
  )
}
