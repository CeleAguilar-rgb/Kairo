import { createClient } from '@/lib/supabase/client'
import { env } from '@/lib/env'

// La única llamada del navegador directo a Supabase que no es de Auth (docs/guides/architecture.md,
// la excepción de Storage): sube el archivo a la ruta y el token que ya firmó la API. El cliente del
// navegador solo tiene la llave pública (nunca la service_role), así que sin ese token no puede subir nada.
export async function uploadToSignedUrl(
  path: string,
  token: string,
  file: File,
): Promise<{ error: Error | null }> {
  const { error } = await createClient()
    .storage.from(env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET)
    .uploadToSignedUrl(path, token, file)
  return { error: error ? new Error(error.message) : null }
}
