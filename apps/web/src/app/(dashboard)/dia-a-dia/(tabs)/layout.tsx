import type { ReactNode } from 'react'

import { PageEnter } from '@/components/layout/PageEnter'
import { DailyHeader } from '@/features/daily'

import styles from './layout.module.css'

// El título y las pestañas son comunes a Hoy, Menú, Reporte, Diario y Metas: viven en el layout, así que al
// cambiar de pestaña solo cambia el contenido de abajo y la cabecera no se vuelve a animar. El editor de
// rutinas (/dia-a-dia/rutina) queda fuera de este grupo: es una pantalla aparte, sin pestañas.
export default function DailyLayout({ children }: { children: ReactNode }) {
  return (
    <PageEnter>
      <main className={styles.wrap}>
        <DailyHeader />
        {children}
      </main>
    </PageEnter>
  )
}
