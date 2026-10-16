import type { ReactNode } from 'react'

import { PageEnter } from '@/components/layout/PageEnter'
import { SectionPanel } from '@/components/layout/SectionPanel'
import { DailyHeader } from '@/features/daily'

import styles from './layout.module.css'

// El título y las pestañas son comunes a Hoy, Menú, Reporte, Diario y Metas: viven en el layout, así que al
// cambiar de pestaña solo cambia el contenido de abajo y la cabecera no se vuelve a animar. Ese contenido va
// en un SectionPanel: al elegir una pestaña lo atenúa si tarda y lo cambia con un fundido corto, para que se
// sienta la misma pantalla. El editor de rutinas (/dia-a-dia/rutina) queda fuera de este grupo: es una
// pantalla aparte, sin pestañas.
export default function DailyLayout({ children }: { children: ReactNode }) {
  return (
    <PageEnter>
      <main className={styles.wrap}>
        <DailyHeader />
        <SectionPanel className={styles.panel}>{children}</SectionPanel>
      </main>
    </PageEnter>
  )
}
