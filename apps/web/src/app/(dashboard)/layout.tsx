import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { DoodlesProvider } from '@/components/layout/Doodles'
import { NavigationProvider, PageFrame } from '@/components/layout/Navigation'
import { ToastProvider } from '@/components/ui/Toast'
import { FocusProvider } from '@/features/focus'
import { getFocusSetup } from '@/features/focus/api'
import { ShortcutsProvider } from '@/features/shortcuts'
import { getMe } from '@/lib/account/api'
import { DEMO_MODE } from '@/lib/demo'
import { createClient } from '@/lib/supabase/server'
import { readAppearance, readThemePreference } from '@/lib/theme/preference'
import { AppearanceSync, ThemeSync } from '@/lib/theme/ThemeSync'
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

  // Lo que necesita el reproductor de Enfoque: los pomodoros de hoy y las tareas en las que puede enfocarse.
  const focus = await getFocusSetup()

  const themeCookie = await readThemePreference()
  const appearanceCookie = await readAppearance()
  const appearanceDiffers =
    me.profile.colorTheme !== appearanceCookie.colorTheme ||
    me.profile.themeIntensity !== appearanceCookie.intensity

  return (
    <ToastProvider>
      {me.profile.theme !== themeCookie ? <ThemeSync theme={me.profile.theme} /> : null}
      {appearanceDiffers ? (
        <AppearanceSync colorTheme={me.profile.colorTheme} intensity={me.profile.themeIntensity} />
      ) : null}
      <DoodlesProvider>
        <NavigationProvider>
          <FocusProvider sessionsToday={focus.sessionsToday} tasks={focus.tasks}>
          <ShortcutsProvider timeZone={me.profile.timezone} demo={DEMO_MODE}>
            <div className={styles.shell}>
              <Topnav profile={me.profile} sections={me.sections} />
              <PageFrame className={styles.content}>{children}</PageFrame>
            </div>
          </ShortcutsProvider>
          </FocusProvider>
        </NavigationProvider>
      </DoodlesProvider>
    </ToastProvider>
  )
}
