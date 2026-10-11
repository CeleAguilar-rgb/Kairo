import type { Metadata } from 'next'
import { Gochi_Hand, Outfit } from 'next/font/google'
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
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" data-mode="light" className={`${outfit.variable} ${gochiHand.variable}`}>
      <body>{children}</body>
    </html>
  )
}
