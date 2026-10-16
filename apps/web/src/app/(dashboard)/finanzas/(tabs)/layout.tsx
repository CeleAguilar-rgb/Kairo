import type { ReactNode } from 'react'

import { PageEnter } from '@/components/layout/PageEnter'
import { SectionPanel } from '@/components/layout/SectionPanel'
import { FinanceHeader } from '@/features/finance'

import styles from './layout.module.css'

// El título y las pestañas son comunes a Resumen, Movimientos, Ahorros y deudas, Membresías y Presupuesto: viven
// en el layout, así que al cambiar de pestaña solo cambia el contenido de abajo y la cabecera no se vuelve a
// animar. Ese contenido va en un SectionPanel: al elegir una pestaña lo atenúa si tarda y lo cambia con un
// fundido corto, para que se sienta la misma pantalla (decisión #28).
export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <PageEnter>
      <main className={styles.wrap}>
        <FinanceHeader />
        <SectionPanel className={styles.panel}>{children}</SectionPanel>
      </main>
    </PageEnter>
  )
}
