import { PageEnter } from '@/components/layout/PageEnter'
import { CardLink } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

import styles from './not-found.module.css'

// Una página, un mundo o un personaje que no existe (o que ya no es tuyo): se ve dentro del dashboard, con salida a Escritos.
export default function WritingsNotFound() {
  return (
    <PageEnter>
      <main className={styles.main}>
        <EmptyState
          id="writings-not-found"
          eyebrow="Escritos"
          title="No encontramos eso"
          description="Puede que el enlace esté mal escrito o que ya no exista."
          doodle="cloud"
          actions={<CardLink href="/escritos">Volver a Escritos</CardLink>}
        />
      </main>
    </PageEnter>
  )
}
