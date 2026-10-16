import { redirect } from 'next/navigation'

import { PageEnter } from '@/components/layout/PageEnter'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardLink } from '@/components/ui/Card'
import { CharactersDatabase } from '@/features/writings'
import { getCharacterDatabase } from '@/features/writings/api'
import { getMe } from '@/lib/account/api'

import styles from './page.module.css'

type DatabasePageProps = { searchParams: Promise<{ mundo?: string; abrir?: string }> }

// La base de datos de personajes (BaseDatos.dc.html): tabla, galería o tablero. `?mundo=` elige el mundo y `?abrir=` deja
// abierto el panel de un personaje (lo usan las fichas y las historias).
export default async function CharactersDatabasePage({ searchParams }: DatabasePageProps) {
  const [me, query] = await Promise.all([getMe(), searchParams])
  if (!me) redirect('/bienvenida')
  const view = await getCharacterDatabase(query)

  return (
    <PageEnter>
      <main className={styles.main}>
        {view ? (
          // `key`: al cambiar de mundo o de personaje inicial, la base empieza de cero.
          <CharactersDatabase key={`${view.worldId}-${view.initialOpenId}`} view={view} />
        ) : (
          <EmptyState
            id="characters-no-world"
            eyebrow="Escritos"
            title="Primero crea un mundo"
            description="Los personajes viven dentro de un mundo. Crea el primero y vuelve aquí."
            doodle="star"
            actions={<CardLink href="/escritos/mundos">Ir a Mundos</CardLink>}
          />
        )}
      </main>
    </PageEnter>
  )
}
