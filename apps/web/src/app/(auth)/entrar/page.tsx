import { BrandPanel } from './BrandPanel'
import { LoginForm } from './LoginForm'
import styles from './page.module.css'

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
