import type { Metadata, Viewport } from 'next'
import { Gochi_Hand, Outfit } from 'next/font/google'
import { MotionConfig } from 'motion/react'
import { readAppearance, readThemePreference } from '@/lib/theme/preference'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-outfit',
  display: 'swap',
})

const gochiHand = Gochi_Hand({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-gochi',
  display: 'swap',
})

export const metadata: Metadata = {
  // Cada pantalla pone su nombre ("Tareas") y aquí se completa: "Tareas · Kairo". Con varias pestañas
  // abiertas ya no se llaman todas "Kairo"; sin título propio, la pantalla se queda con el default.
  title: { default: 'Kairo', template: '%s · Kairo' },
  description: 'Dashboard personal para organizar la vida en un solo lugar',
  // El ícono de pestaña y el de "agregar a inicio": assets ya exportados del canvas en public/kairo-logo/.
  icons: {
    icon: { url: '/kairo-logo/kairo-favicon.svg', type: 'image/svg+xml' },
    apple: '/kairo-logo/kairo-app-claro-512.png',
  },
}

// "cover" deja que la página se dibuje bajo la cámara y la hora cuando la app va a pantalla
// completa o instalada; sin esto env(safe-area-inset-top) siempre vale 0.
export const viewport: Viewport = { viewportFit: 'cover' }

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const themePreference = await readThemePreference()
  const appearance = await readAppearance()

  return (
    // suppressHydrationWarning: con 'system', theme-init.js cambia data-mode antes de que React hidrate.
    <html
      lang="es"
      data-mode={themePreference === 'dark' ? 'dark' : 'light'}
      data-theme-pref={themePreference}
      data-palette={appearance.colorTheme}
      data-intensity={appearance.intensity}
      className={`${outfit.variable} ${gochiHand.variable}`}
      suppressHydrationWarning
    >
      {/* Va siempre y no solo con 'system': si React lo creara al cambiar de preferencia, no se ejecutaría. */}
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- tiene que bloquear: corre antes de pintar para que no haya parpadeo. */}
        <script src="/theme-init.js" />
      </head>
      <body>
        {/* reducedMotion="user" respeta prefers-reduced-motion para toda animación de Motion, sin repetirlo en cada media query */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  )
}
