import { createClient } from '@/lib/supabase/server'
import { BrandPanel } from '../BrandPanel'
import formStyles from '../SetPasswordForm.module.css'
import { SetPasswordForm } from '../SetPasswordForm'
import styles from '../split-layout.module.css'

export default async function AceptarInvitacionPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  return (
    <div className={styles.split}>
      <BrandPanel />

      <main className={styles.formside}>
        <div className={styles.fbox}>
          {data ? (
            <SetPasswordForm
              title="Crea tu contraseña"
              subtitle="La vas a usar junto con tu correo para entrar a Kairo."
              submitLabel="Guardar y entrar"
              savingLabel="Guardando…"
              kind="invite"
            />
          ) : (
            <div className={formStyles.heading}>
              <h1 className={formStyles.title}>Este enlace ya no es válido</h1>
              <p className={formStyles.subtitle}>Venció o ya se usó. Pide que te envíen una invitación nueva.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
