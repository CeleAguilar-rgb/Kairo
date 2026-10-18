import { PageHeading } from '@/components/layout/PageHeading'

import { DailyTabs } from './DailyTabs'
import styles from './DailyHeader.module.css'

// La cabecera común de las cinco partes de Día a día: el título a mano con su sol y las pestañas. Vive en
// el layout, así que al cambiar de pestaña no se vuelve a animar (igual que la de un proyecto).
export function DailyHeader() {
  return (
    <header className={styles.hero}>
      <PageHeading title="Día a día" doodle="sun" doodleRotate={8} squiggleWidth={240} />
      <DailyTabs />
    </header>
  )
}
