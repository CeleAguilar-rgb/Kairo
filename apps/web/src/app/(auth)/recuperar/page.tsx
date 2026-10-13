import { BrandPanel } from '../BrandPanel'
import styles from '../split-layout.module.css'
import { RecoverForm } from './RecoverForm'

export default function RecuperarPage() {
  return (
    <div className={styles.split}>
      <BrandPanel />

      <main className={styles.formside}>
        <div className={styles.fbox}>
          <RecoverForm />
        </div>
      </main>
    </div>
  )
}
