import { PageEnter } from '@/components/layout/PageEnter'
import { CardLink } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

import styles from './not-found.module.css'

// Un proyecto que no existe (o que ya no es tuyo): se ve dentro del dashboard, con salida a la lista.
export default function ProjectNotFound() {
  return (
    <PageEnter>
      <main className={styles.main}>
        <EmptyState
          id="project-not-found"
          eyebrow="Proyectos"
          title="No encontramos ese proyecto"
          description="Puede que el enlace esté mal escrito o que el proyecto ya no exista."
          doodle="cloud"
          actions={<CardLink href="/proyectos">Ver todos los proyectos</CardLink>}
        />
      </main>
    </PageEnter>
  )
}
