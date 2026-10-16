import { PageHeading } from '@/components/layout/PageHeading'

import type { WeekDay } from '../types'

import { WeekWords } from './WeekWords'
import { WriteButton } from './WriteButton'
import styles from './WritingsHeader.module.css'

type WritingsHeaderProps = {
  // "1 mundo, 1 historia, 6 notas y 22 personajes."
  summary: string
  week: WeekDay[]
  weekTotal: number
  dailyGoal: number
}

// La cabecera de las cuatro pestañas de Escritos: el título a mano con su doodle y garabato, el resumen, las
// palabras de la semana y "Escribir". Vive en el layout, así que al cambiar de pestaña no se vuelve a animar.
export function WritingsHeader({ summary, week, weekTotal, dailyGoal }: WritingsHeaderProps) {
  return (
    <header className={styles.hero}>
      <PageHeading title="Escritos" doodle="spiral" squiggleWidth={230}>
        <span className={styles.summary}>{summary}</span>
      </PageHeading>
      <div className={styles.side}>
        <WeekWords week={week} total={weekTotal} dailyGoal={dailyGoal} />
        <WriteButton />
      </div>
    </header>
  )
}
