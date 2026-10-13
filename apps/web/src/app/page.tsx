import { redirect } from 'next/navigation'
import { getMe } from '@/lib/account/api'
import { createClient } from '@/lib/supabase/server'
import { DemoShowcase } from './DemoShowcase'

// El candado del dashboard (regla #2: nunca te fíes de nada que no sea la
// sesión verificada). Sin sesión → /entrar; con sesión pero sin perfil
// todavía (antes de terminar la bienvenida) → /bienvenida. El Inicio real
// de la Fase 1 reemplaza a DemoShowcase cuando toque.
export default async function Home() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data) redirect('/entrar')

  const me = await getMe()
  if (!me) redirect('/bienvenida')

  return <DemoShowcase />
}
