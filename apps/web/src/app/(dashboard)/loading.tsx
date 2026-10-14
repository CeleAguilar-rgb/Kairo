import { Skeleton } from '@/components/ui/Skeleton'

import styles from './loading.module.css'

// Esqueleto de Inicio con la forma real de la página (saludo + tarjetas).
// Aparece con retraso (ver loading.module.css): si la página llega rápido, no
// se ve nunca y no hay parpadeo (docs/guides/design.md, Cargas).
export default function DashboardLoading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="Cargando">
      <div className={styles.hero}>
        <Skeleton width="min(420px, 70%)" height={72} radius="md" />
        <Skeleton width="min(520px, 85%)" height={18} />
      </div>
      <div className={styles.grid}>
        <div className={`${styles.card} ${styles.cardDark} ${styles.span5}`}>
          <Skeleton tone="inverted" width="55%" height={18} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} tone="inverted" width={`${80 - i * 7}%`} height={14} />
          ))}
        </div>
        <div className={`${styles.card} ${styles.span7}`}>
          <Skeleton width="40%" height={18} />
          <Skeleton height={76} radius="md" />
          <Skeleton height={56} radius="md" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${styles.card} ${styles.span4}`}>
            <Skeleton width="50%" height={16} />
            <Skeleton width="80%" height={12} />
            <Skeleton width="65%" height={12} />
          </div>
        ))}
      </div>
    </div>
  )
}
