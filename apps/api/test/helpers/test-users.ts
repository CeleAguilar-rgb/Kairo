import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { env } from '../../src/common/env'

// Mismo proyecto de Supabase que desarrollo, no uno aparte: usuarios reales,
// creados con la Admin API y borrados al terminar (afterAll). Así los tests
// de aislamiento usan JWTs de verdad sin tocar cuentas reales ni duplicar
// infraestructura.
const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export type TestUser = { id: string; accessToken: string }

export async function createTestUser(): Promise<TestUser> {
  const email = `test-${randomUUID()}@kairo.test`
  const password = randomUUID()

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError || !created.user) {
    throw createError ?? new Error('No se pudo crear el usuario de prueba.')
  }

  const { data: signedIn, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError || !signedIn.session) {
    throw signInError ?? new Error('No se pudo iniciar sesión con el usuario de prueba.')
  }

  return { id: created.user.id, accessToken: signedIn.session.access_token }
}

// Borra solo el usuario de auth.users. El perfil (esquema app, sin FK a
// auth.users — ver db/schema/_shared.ts) se borra aparte, con la conexión a
// Postgres que ya tiene la app bajo prueba.
export async function deleteTestUser(userId: string): Promise<void> {
  await supabaseAdmin.auth.admin.deleteUser(userId)
}
