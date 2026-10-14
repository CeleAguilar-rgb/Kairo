import Link from 'next/link'

import { PageEnter } from '@/components/layout/PageEnter'
import { EmptyState } from '@/components/ui/EmptyState'
import type { DoodleKind } from '@/components/ui/Doodle'

import styles from './SectionPlaceholder.module.css'

// Provisional: ocupa la ruta de una sección mientras se construye su pantalla,
// para que el Topnav no lleve a un 404. Cada página lo reemplaza al construirse.
export function SectionPlaceholder({
  name,
  doodle,
}: {
  name: string
  doodle: DoodleKind
}) {
  return (
    <PageEnter>
      <main className={styles.main}>
        <EmptyState
          id="placeholder-title"
          eyebrow={name}
          title="Esta sección viene en camino"
          description="Todavía la estamos construyendo. Mientras, todo lo de hoy está en Inicio."
          doodle={doodle}
          actions={
            <Link href="/" className={styles.back}>
              Volver a Inicio
            </Link>
          }
        />
      </main>
    </PageEnter>
  )
}
