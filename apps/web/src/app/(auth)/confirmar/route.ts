import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// El enlace de invitación (y luego el de recuperar contraseña) llega aquí con un
// `code` de un solo uso. exchangeCodeForSession lo cambia por una sesión real y
// escribe las cookies httpOnly (docs/guides/security.md, sección 3).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Sin sesión, la página de destino explica que el enlace venció o ya se usó.
  return NextResponse.redirect(`${origin}${next}`)
}
