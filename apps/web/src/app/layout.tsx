import type { Metadata } from 'next'
import { Gochi_Hand, Outfit } from 'next/font/google'
import { MotionConfig } from 'motion/react'
import { readThemePreference } from '@/lib/theme/preference'
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
  title: 'Kairo',
  description: 'Dashboard personal para organizar la vida en un solo lugar',
  // El ícono de pestaña y el de "agregar a inicio": assets ya exportados del canvas en public/kairo-logo/.
  icons: {
    icon: { url: '/kairo-logo/kairo-favicon.svg', type: 'image/svg+xml' },
    apple: '/kairo-logo/kairo-app-claro-512.png',
  },
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const themePreference = await readThemePreference()

  return (
    // suppressHydrationWarning: con 'system', theme-init.js cambia data-mode antes de que React hidrate.
    <html
      lang="es"
      data-mode={themePreference === 'dark' ? 'dark' : 'light'}
      data-theme-pref={themePreference}
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
