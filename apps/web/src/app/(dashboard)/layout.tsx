import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { DoodlesProvider } from '@/components/layout/Doodles'
import { ToastProvider } from '@/components/ui/Toast'
import { getMe } from '@/lib/account/api'
import { DEMO_MODE } from '@/lib/demo'
import { createClient } from '@/lib/supabase/server'
import styles from './layout.module.css'
import { Topnav } from './Topnav'

type DashboardLayoutProps = { children: ReactNode }

// El candado de todas las rutas del dashboard: sin sesión → /entrar; con
// sesión pero sin perfil (bienvenida sin terminar) → /bienvenida. Vive aquí,
// no en cada page.tsx, porque aplica a cualquier ruta que cuelgue de (dashboard).
export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  // En modo demo (lib/demo.ts, solo en desarrollo) no hay Supabase: se salta
  // el candado de sesión y getMe() devuelve el perfil de ejemplo.
  if (!DEMO_MODE) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    if (!data) redirect('/entrar')
  }

  const me = await getMe()
  if (!me) redirect('/bienvenida')

  return (
    <ToastProvider>
      <DoodlesProvider>
        <div className={styles.shell}>
          <Topnav profile={me.profile} sections={me.sections} />
          <div className={styles.content}>{children}</div>
        </div>
      </DoodlesProvider>
    </ToastProvider>
  )
}
