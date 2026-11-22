import type { ReactNode } from 'react'

import { PageEnter } from '@/components/layout/PageEnter'
import { SectionPanel } from '@/components/layout/SectionPanel'
import { FinanceHeader } from '@/features/finance'
import { getFinanceMonth } from '@/features/finance/api'

import styles from './layout.module.css'

// El título y las pestañas son comunes a Resumen, Movimientos, Ahorros y deudas, Membresías y Presupuesto: viven
// en el layout, así que al cambiar de pestaña solo cambia el contenido de abajo y la cabecera no se vuelve a
// animar. Ese contenido va en un SectionPanel: al elegir una pestaña lo atenúa si tarda y lo cambia con un
// fundido corto, para que se sienta la misma pantalla (decisión #28).
export default async function FinanceLayout({ children }: { children: ReactNode }) {
  // Sin `?mes`: de aquí salen solo el mes en curso y el más viejo que se puede ver, para el selector del teléfono.
  const { today, current, oldest } = await getFinanceMonth()

  return (
    <PageEnter>
      <main className={styles.wrap}>
        <FinanceHeader today={today} current={current} oldest={oldest} />
        <SectionPanel className={styles.panel}>{children}</SectionPanel>
      </main>
    </PageEnter>
  )
}
