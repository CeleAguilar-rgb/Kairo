import { createClient } from '@supabase/supabase-js'
import { env } from '../common/env'

const email = process.argv[2]

if (!email) {
  console.error('Uso: pnpm run invite:initial -- tu-correo@ejemplo.com')
  process.exit(1)
}

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main(email: string) {
  // redirectTo apunta al sitio local por ahora (fase 0, antes de desplegar).
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: 'http://localhost:3000/confirmar?next=/aceptar-invitacion',
  })

  if (error) {
    console.error('Error al invitar:', error.message)
    process.exit(1)
  }

  console.log('Invitación enviada a', data.user.email)
}

main(email)
