import type { Metadata } from 'next'
import { BrandPanel } from '../BrandPanel'
import styles from '../split-layout.module.css'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Entrar' }

export default function EntrarPage() {
  return (
    <div className={styles.split}>
      <BrandPanel />

      <main className={styles.formside}>
        <div className={styles.fbox}>
          <LoginForm />
        </div>
      </main>
    </div>
  )
}
