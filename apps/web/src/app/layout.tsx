import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kairo',
  description: 'Dashboard personal para organizar la vida en un solo lugar',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
