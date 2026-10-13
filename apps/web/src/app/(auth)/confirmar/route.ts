import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Los tipos de enlace que de verdad se usan en las plantillas de correo de Kairo
// (auth/email-templates/ en la API). verifyOtp acepta más valores, pero esta
// lista cerrada evita depender de @supabase/supabase-js solo por un tipo.
type ConfirmLinkType = 'invite' | 'recovery' | 'email'

// El enlace de invitación (y luego el de recuperar contraseña) llega aquí con
// `token_hash` y `type` — no con `code`: ese formato es para el flujo PKCE que
// inicia el navegador (signInWithOtp, resetPasswordForEmail), y las invitaciones
// las crea la API con la service_role key, sin navegador de por medio. verifyOtp
// cambia el token por una sesión real y escribe las cookies httpOnly
// (docs/guides/security.md, sección 3).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as ConfirmLinkType | null
  const next = searchParams.get('next') ?? '/'

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Sin sesión, la página de destino explica que el enlace venció o ya se usó.
  return NextResponse.redirect(`${origin}${next}`)
}
