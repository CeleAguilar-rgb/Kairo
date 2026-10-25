import type { Metadata } from 'next'
import { Gochi_Hand, Outfit } from 'next/font/google'
import { MotionConfig } from 'motion/react'
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

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" data-mode="light" className={`${outfit.variable} ${gochiHand.variable}`}>
      <body>
        {/* reducedMotion="user" respeta prefers-reduced-motion para toda animación de Motion, sin repetirlo en cada media query */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  )
}
