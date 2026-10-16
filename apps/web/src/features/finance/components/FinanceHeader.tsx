import { PageHeading } from '@/components/layout/PageHeading'

import { FinanceTabs } from './FinanceTabs'
import styles from './FinanceHeader.module.css'

// La cabecera común de las cinco partes de Finanzas: el título a mano con su garabato y las pestañas. Vive en el
// layout, así que al cambiar de pestaña no se vuelve a animar (igual que la de Día a día y la de un proyecto).
export function FinanceHeader() {
  return (
    <header className={styles.hero}>
      <PageHeading title="Finanzas" squiggleWidth={200} />
      <FinanceTabs />
    </header>
  )
}
