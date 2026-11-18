import type { Metadata } from 'next'
import { BrandPanel } from '../BrandPanel'
import styles from '../split-layout.module.css'
import { RecoverForm } from './RecoverForm'

export const metadata: Metadata = { title: 'Recuperar contraseña' }

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
