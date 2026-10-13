import { redirect } from 'next/navigation'
import { getMe } from '@/lib/account/api'
import { createClient } from '@/lib/supabase/server'
import { BienvenidaWizard } from './BienvenidaWizard'
import styles from './page.module.css'

// Mismo candado que apps/web/src/app/page.tsx, al revés: sin sesión → /entrar;
// con sesión y perfil ya creado (bienvenida ya hecha) → de vuelta al dashboard.
export default async function BienvenidaPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data) redirect('/entrar')

  const me = await getMe()
  if (me) redirect('/')

  return (
    <div className={styles.shell}>
      <svg
        className={styles.fdoodA}
        width="70"
        height="70"
        viewBox="0 0 40 40"
        fill="none"
        style={{ stroke: 'var(--text)' }}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path
          d="M20 6l3.6 8.2 8.9.8-6.7 5.9 2 8.7L20 25l-7.8 4.6 2-8.7-6.7-5.9 8.9-.8L20 6z"
          style={{ fill: 'var(--accent)' }}
        />
      </svg>
      <svg
        className={styles.fdoodB}
        width="64"
        height="64"
        viewBox="0 0 40 40"
        fill="none"
        style={{ stroke: 'var(--text)' }}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="20" cy="20" r="7" style={{ fill: 'var(--accent-warm)' }} />
        <path d="M20 5v4M20 31v4M5 20h4M31 20h4M9.4 9.4l2.8 2.8M27.8 27.8l2.8 2.8M9.4 30.6l2.8-2.8M27.8 12.2l2.8-2.8" />
      </svg>
      <svg
        className={styles.fdoodC}
        width="60"
        height="60"
        viewBox="0 0 40 40"
        fill="none"
        style={{ stroke: 'var(--text)' }}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path
          d="M20 32s-11-7-11-15a6 6 0 0 1 11-3.4A6 6 0 0 1 31 17c0 8-11 15-11 15z"
          style={{ fill: 'var(--accent-soft)' }}
        />
      </svg>
      <svg
        className={styles.fdoodD}
        width="66"
        height="66"
        viewBox="0 0 40 40"
        fill="none"
        style={{ stroke: 'var(--text)' }}
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M21 20.4c.6-1.8-1.6-2.8-3-1.6-1.8 1.6-.4 4.6 2 4.8 3.4.2 5.2-3.6 3.6-6.6-2-3.6-7.2-3.6-9.6-.4-2.8 3.8-.6 9.6 4.2 10.6 5.4 1.2 10.2-3 10-8.4" />
      </svg>

      <BienvenidaWizard />
    </div>
  )
}
