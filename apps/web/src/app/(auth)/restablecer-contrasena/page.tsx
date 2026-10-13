import { createClient } from '@/lib/supabase/server'
import { BrandPanel } from '../BrandPanel'
import formStyles from '../SetPasswordForm.module.css'
import { SetPasswordForm } from '../SetPasswordForm'
import styles from '../split-layout.module.css'

export default async function RestablecerContrasenaPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  return (
    <div className={styles.split}>
      <BrandPanel />

      <main className={styles.formside}>
        <div className={styles.fbox}>
          {data ? (
            <SetPasswordForm
              title="Crea tu contraseña nueva"
              subtitle="Esta va a reemplazar la anterior. Las demás sesiones abiertas se cierran."
              submitLabel="Guardar y entrar"
              savingLabel="Guardando…"
              kind="recovery"
            />
          ) : (
            <div className={formStyles.heading}>
              <h1 className={formStyles.title}>Este enlace ya no es válido</h1>
              <p className={formStyles.subtitle}>Venció o ya se usó. Pide uno nuevo desde «La olvidé» en la pantalla de entrar.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
