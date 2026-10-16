import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { PageEnter } from '@/components/layout/PageEnter'
import { SectionPanel } from '@/components/layout/SectionPanel'
import { WritingsHeader, WritingsTabs } from '@/features/writings'
import { getWritingsOverview, getWorldCards, overviewText } from '@/features/writings/api'
import { getMe } from '@/lib/account/api'

import styles from './layout.module.css'

// La cabecera (título, resumen, palabras de la semana) y las pestañas son comunes a Historias, Notas, Personajes y
// Mundos: viven en el layout, así que al cambiar de pestaña solo cambia el contenido de abajo y la cabecera no se
// vuelve a animar. Ese contenido va en un SectionPanel: al elegir una pestaña lo atenúa si tarda y lo cambia con
// un fundido corto, para que se sienta la misma pantalla (decisión #28).
export default async function WritingsLayout({ children }: { children: ReactNode }) {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const [overview, worlds] = await Promise.all([getWritingsOverview(), getWorldCards()])

  return (
    <PageEnter>
      <main className={styles.wrap}>
        <WritingsHeader summary={overviewText(overview)} week={overview.week} weekTotal={overview.weekTotal} dailyGoal={overview.dailyGoal} />
        <WritingsTabs counts={{ books: overview.bookCount, notes: overview.noteCount, characters: overview.characterCount, worlds: worlds.length }} />
        <SectionPanel className={styles.panel}>{children}</SectionPanel>
      </main>
    </PageEnter>
  )
}
