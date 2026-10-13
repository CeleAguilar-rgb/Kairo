import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/server'
import { SetPasswordForm } from './SetPasswordForm'
import styles from './page.module.css'

export default async function AceptarInvitacionPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  return (
    <main className={styles.main}>
      <Card className={styles.card}>
        {data ? (
          <SetPasswordForm />
        ) : (
          <>
            <h1 className={styles.title}>Este enlace ya no es válido</h1>
            <p className={styles.subtitle}>Venció o ya se usó. Pide que te envíen una invitación nueva.</p>
          </>
        )}
      </Card>
    </main>
  )
}
